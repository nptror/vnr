import { supabase } from "../lib/supabase";

function getClient() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

function throwOnError(error) {
  if (error) throw error;
}

export async function createGame(pin, cardDeck, effectDeck) {
  const client = getClient();
  const { data: gameId, error } = await client.rpc("create_game", { p_pin: pin });
  throwOnError(error);

  await saveGameState(gameId, 0, {
    phase: "selecting_card",
    card_deck: cardDeck,
    used_card_numbers: [],
    effect_deck: effectDeck,
    effect_cursor: 0,
    revision: 1,
  });

  const { error: gameError } = await client
    .from("games")
    .update({ status: "playing" })
    .eq("id", gameId);
  throwOnError(gameError);
  return gameId;
}

export async function setGameStatus(gameId, status) {
  const { error } = await getClient().from("games").update({ status }).eq("id", gameId);
  throwOnError(error);
}

export async function findGameByPin(pin) {
  const { data, error } = await getClient()
    .from("games")
    .select("*")
    .eq("pin", pin)
    .neq("status", "finished")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwOnError(error);
  return data;
}

export async function fetchTeams(gameId) {
  const { data, error } = await getClient()
    .from("teams")
    .select("*")
    .eq("game_id", gameId)
    .order("display_order");
  throwOnError(error);
  return data;
}

// Conditional UPDATE (`joined_at IS NULL`) makes the claim atomic: if two
// devices race for the same team, only one UPDATE matches a row and returns
// data — the loser falls through to the existence check below to report why.
export async function joinGame(gameId, teamKey, teamCode) {
  const client = getClient();
  const { data, error } = await client
    .from("teams")
    .update({ joined_at: new Date().toISOString() })
    .eq("game_id", gameId)
    .eq("team_key", teamKey)
    .eq("team_code", teamCode)
    .is("joined_at", null)
    .select("game_id, team_key")
    .maybeSingle();
  throwOnError(error);
  if (data) return { gameId: data.game_id, teamKey: data.team_key };

  const { data: existing, error: checkError } = await client
    .from("teams")
    .select("joined_at")
    .eq("game_id", gameId)
    .eq("team_key", teamKey)
    .eq("team_code", teamCode)
    .maybeSingle();
  throwOnError(checkError);
  if (existing?.joined_at) {
    const err = new Error("Đội này đã có người tham gia.");
    err.code = "TEAM_TAKEN";
    throw err;
  }
  throw new Error("Invalid game, team, or team code.");
}

export async function loadGame(gameId, { includeEvents = false, eventLimit = 100 } = {}) {
  const client = getClient();
  const [gameResult, teamsResult, stateResult, eventsResult] = await Promise.all([
    client.from("games").select("*").eq("id", gameId).single(),
    client.from("teams").select("*").eq("game_id", gameId).order("display_order"),
    client.from("game_state").select("*").eq("game_id", gameId).single(),
    includeEvents
      ? client
          .from("game_events")
          .select("*")
          .eq("game_id", gameId)
          .order("created_at", { ascending: false })
          .limit(eventLimit)
      : Promise.resolve({ data: [], error: null }),
  ]);
  throwOnError(gameResult.error);
  throwOnError(teamsResult.error);
  throwOnError(stateResult.error);
  throwOnError(eventsResult.error);
  return {
    game: gameResult.data,
    teams: teamsResult.data,
    state: stateResult.data,
    events: [...(eventsResult.data ?? [])].reverse(),
  };
}

// Realtime notifications arrive in bursts (a single gameplay move can touch
// several tables). This coalesces each burst into at most one in-flight
// fetch, plus one trailing follow-up if new notifications arrived while the
// fetch was running — so N rapid events cost 1–2 requests instead of N.
export function createCoalescedReloader(fetchFn, delayMs = 150) {
  let timer = null;
  let inflight = false;
  let rerunQueued = false;
  let epoch = 0;

  const run = async () => {
    const runEpoch = epoch;
    inflight = true;
    try {
      await fetchFn();
    } finally {
      inflight = false;
      if (rerunQueued && runEpoch === epoch) {
        rerunQueued = false;
        schedule();
      }
    }
  };

  const schedule = () => {
    if (inflight) {
      rerunQueued = true;
      return;
    }
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      run();
    }, delayMs);
  };

  const cancel = () => {
    epoch += 1;
    rerunQueued = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return { schedule, cancel };
}

// supabase-js keys channels by topic, and removeChannel() deletes the key
// asynchronously AFTER a network round trip. Under React StrictMode's
// setup→cleanup→setup double-mount, a fixed topic hands back the OLD channel
// instance mid-unsubscribe, leaving a silently dead subscription (no more
// realtime updates). A unique topic always yields a fresh instance instead.
let channelSeq = 0;

export function subscribeToGame(gameId, onChange) {
  const client = getClient();
  const channel = client
    .channel(`game:${gameId}:${(channelSeq += 1)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "teams", filter: `game_id=eq.${gameId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "game_state", filter: `game_id=eq.${gameId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "game_events", filter: `game_id=eq.${gameId}` }, onChange)
    .subscribe((status) => {
      // Socket hiccup: force an HTTP refresh now; supabase-js will also
      // rejoin the channel automatically once the socket recovers.
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn(`[realtime] channel ${status} — falling back to HTTP polling`);
        onChange();
      }
    });
  return () => client.removeChannel(channel);
}

// When baseState is provided, only the columns whose value actually differs
// are sent — game_state rows carry large JSONB decks (card_deck/effect_deck)
// that stay reference-identical across most moves, so this turns a ~20KB row
// write into a sub-KB patch. Without baseState the full nextState is written.
function buildStatePayload(nextState, baseState) {
  if (!baseState) {
    const full = { ...nextState };
    delete full.id;
    delete full.game_id;
    delete full.updated_at;
    return full;
  }
  const patch = {};
  for (const key of Object.keys(nextState)) {
    if (key === "id" || key === "game_id" || key === "updated_at") continue;
    if (!Object.is(nextState[key], baseState[key])) patch[key] = nextState[key];
  }
  return patch;
}

export async function saveGameState(gameId, expectedRevision, nextState, baseState) {
  const payload = buildStatePayload(nextState, baseState);
  const { data, error } = await getClient()
    .from("game_state")
    .update(payload)
    .eq("game_id", gameId)
    .eq("revision", expectedRevision)
    .select()
    .maybeSingle();
  throwOnError(error);
  if (!data) {
    // Another writer (the answer-deadline timeout, or another device's
    // event) already advanced `revision` first. This is routine under
    // concurrent play, not a fatal error — callers should reload state and
    // move on rather than surface it to the user.
    const conflict = new Error("Game state changed before it could be saved.");
    conflict.code = "STALE_REVISION";
    throw conflict;
  }
  return data;
}

export async function saveTeams(gameId, teams) {
  const rows = teams.map(({ team_key, team_code, name, color, score, display_order }) => ({
    game_id: gameId,
    team_key,
    team_code,
    name,
    color,
    score,
    display_order,
  }));
  const { data, error } = await getClient()
    .from("teams")
    .upsert(rows, { onConflict: "game_id,team_key" })
    .select();
  throwOnError(error);
  return data;
}

export async function appendGameEvent(gameId, eventType, payload, createdBy) {
  const { data, error } = await getClient()
    .from("game_events")
    .insert({ game_id: gameId, event_type: eventType, payload, created_by: createdBy })
    .select()
    .single();
  throwOnError(error);
  return data;
}

export function submitAnswerEvent({ gameId, teamKey, cardNum, revision, optionIdx }) {
  return appendGameEvent(
    gameId,
    "PLAYER_ANSWER",
    { cardNum, revision, optionIdx },
    teamKey
  );
}

export function submitDiceRollEvent({ gameId, teamKey, revision }) {
  return appendGameEvent(
    gameId,
    "PLAYER_ROLL_DICE",
    { revision },
    teamKey
  );
}

export function submitEffectTargetEvent({ gameId, teamKey, revision, targetIdx }) {
  return appendGameEvent(
    gameId,
    "PLAYER_EFFECT_TARGET",
    { revision, targetIdx },
    teamKey
  );
}

// Meme drops are ephemeral and cosmetic only — they use Supabase Realtime
// Broadcast (no table, nothing persisted) instead of a game_events row.
const memeChannels = new Map();

function ensureMemeChannel(gameId) {
  const client = getClient();
  let channel = memeChannels.get(gameId);
  if (!channel) {
    // self: true — người thả meme cũng nhận lại drop của chính mình, để meme
    // hiện đồng loạt trên MỌI màn hình (Host + tất cả máy chơi).
    channel = client.channel(`meme:${gameId}`, {
      config: { broadcast: { self: true } },
    });
    memeChannels.set(gameId, channel);
  }
  return channel;
}

export function subscribeToMemeDrops(gameId, onDrop) {
  const channel = ensureMemeChannel(gameId);
  channel.on("broadcast", { event: "meme_drop" }, ({ payload }) => onDrop(payload));
  if (channel.state !== "joined" && channel.state !== "joining") channel.subscribe();
  return () => {
    getClient().removeChannel(channel);
    memeChannels.delete(gameId);
  };
}

export function sendMemeDrop(gameId, payload) {
  const channel = ensureMemeChannel(gameId);
  if (channel.state === "joined") {
    return channel.send({ type: "broadcast", event: "meme_drop", payload });
  }
  return new Promise((resolve) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({ type: "broadcast", event: "meme_drop", payload }).then(resolve);
      }
    });
  });
}
