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
//
// Broadcast requires EVERY screen to share one topic (`meme:{gameId}`), so the
// unique-topic trick used by subscribeToGame is not available here. That means
// the supabase-js removeChannel race documented above applies in full: under
// React StrictMode's setup→cleanup→setup double-mount, removing the channel on
// cleanup hands the next mount the OLD instance mid-unsubscribe and the
// subscription dies silently (no drops, no sound on the Host). Instead of
// tearing down on every unsubscribe, the channel is ref-counted and only
// removed after a linger period with no subscribers.
const MEME_CHANNEL_LINGER_MS = 10_000;
const memeChannels = new Map(); // gameId -> entry

function makeMemeChannel(gameId) {
  // self: true — máy thả cũng nhận lại drop của chính mình.
  return getClient().channel(`meme:${gameId}`, { config: { broadcast: { self: true } } });
}

// Channel.on() không thể gỡ listener, nên chỉ đăng ký MỘT listener cho mỗi
// entry và để callback mới nhất (entry.handler) thay thế — tránh nhân đôi
// drop khi StrictMode mount lại, resubscribe nhiều lần, hoặc khi channel bị
// thay mới sau lỗi (xem ensureMemeJoined).
function bindMemeChannel(entry) {
  entry.channel.on("broadcast", { event: "meme_drop" }, ({ payload }) => entry.handler?.(payload));
  entry.bound = true;
}

function acquireMemeChannel(gameId) {
  let entry = memeChannels.get(gameId);
  if (!entry) {
    entry = {
      gameId,
      channel: makeMemeChannel(gameId),
      refs: 0,
      joinPromise: null,
      pendingRemove: null,
      bound: false,
      handler: null,
    };
    memeChannels.set(gameId, entry);
  }
  entry.refs += 1;
  if (entry.pendingRemove) {
    clearTimeout(entry.pendingRemove);
    entry.pendingRemove = null;
  }
  return entry;
}

function releaseMemeChannel(gameId) {
  const entry = memeChannels.get(gameId);
  if (!entry) return;
  entry.refs -= 1;
  if (entry.refs <= 0 && !entry.pendingRemove) {
    entry.pendingRemove = setTimeout(() => {
      memeChannels.delete(gameId);
      getClient().removeChannel(entry.channel);
    }, MEME_CHANNEL_LINGER_MS);
  }
}

// Join một lần duy nhất cho mỗi entry; các lời gọi sau chia sẻ cùng promise.
//
// Một kênh Phoenix đã vào trạng thái "errored"/"timed_out" (socket rớt tạm
// thời, tab Host để lâu ở màn chờ trước khi có người chơi...) không thể
// subscribe() lại — gọi subscribe() trên chính nó là no-op im lặng, nên nếu
// chỉ null hoá joinPromise như trước, Host sẽ "điếc" vĩnh viễn với mọi
// broadcast tới sau đó và cần tải lại trang mới hồi phục. Ở đây thay hẳn
// bằng 1 channel instance MỚI (cùng topic) rồi tự rejoin ngay — không cần
// reload thủ công. Đợi 1s trước khi thử lại để tránh vòng lặp dồn dập nếu
// mạng đang lỗi kéo dài.
function ensureMemeJoined(entry) {
  if (entry.channel.state === "joined") return Promise.resolve();
  if (!entry.joinPromise) {
    entry.joinPromise = new Promise((resolve) => {
      entry.channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          resolve();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          entry.joinPromise = null;
          const stale = entry.channel;
          setTimeout(() => {
            entry.channel = makeMemeChannel(entry.gameId);
            bindMemeChannel(entry);
            getClient().removeChannel(stale);
            resolve(ensureMemeJoined(entry));
          }, 1000);
        }
      });
    });
  }
  return entry.joinPromise;
}

export function subscribeToMemeDrops(gameId, onDrop) {
  const entry = acquireMemeChannel(gameId);
  if (!entry.bound) bindMemeChannel(entry);
  entry.handler = onDrop;
  ensureMemeJoined(entry);
  return () => releaseMemeChannel(gameId);
}

export async function sendMemeDrop(gameId, payload) {
  const entry = acquireMemeChannel(gameId);
  try {
    await ensureMemeJoined(entry);
    await entry.channel.send({ type: "broadcast", event: "meme_drop", payload });
  } catch {
    /* Realtime hỏng thì bỏ qua — meme drop chỉ là cosmetic. */
  } finally {
    releaseMemeChannel(gameId);
  }
}
