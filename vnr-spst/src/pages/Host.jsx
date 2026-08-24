import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  CAT_COLOR,
  CAT_NAME,
  createShuffledCardDeck,
  createShuffledEffectDeck,
  EFFECT_COLORS,
  EFFECT_DEFINITIONS,
  getCardByNumber,
  shuffle,
} from "../game/catalog";
import {
  closeCard,
  addDiceScore,
  subtractDiceScore,
  loseAllScore,
  resetScores,
  stealUpToFive,
  swapScores,
} from "../game/transitions";
import {
  createGame,
  loadGame,
  findGameByPin,
  subscribeToGame,
  createCoalescedReloader,
  saveGameState,
  saveTeams,
  appendGameEvent,
  setGameStatus,
  subscribeToMemeDrops,
} from "../game/gameRepository";
import { isSupabaseConfigured } from "../lib/supabase";
import MemeDrop from "../components/MemeDrop.jsx";
import ScoreFx from "../components/ScoreFx.jsx";
import EffectCard, { REVEAL_TOTAL_MS } from "../components/EffectCard.jsx";
import { useMemeDrop } from "../hooks/useMemeDrop.js";
import "./Host.css";

const HOST_GAME_ID_KEY = "vnr_host_game_id";
const ANSWER_SECONDS = 15;

const MAX_WRONG_BEFORE_ABANDON = 3;

function computeDeadlineAt() {
  return new Date(Date.now() + ANSWER_SECONDS * 1000).toISOString();
}

// Wrong answer → next attempt, unless 3 options have been marked wrong or the
// attempt order is exhausted, in which case the card is abandoned entirely:
// no correct answer is revealed and no effect is drawn (GAMEPLAY.md).
function computeAnswerPatch(state, teams, optionIdx) {
  const card = getCardByNumber(state.card_deck, state.active_card_num);
  if (!card) return null;
  const optionStates = Array.isArray(state.option_states) ? [...state.option_states] : [];

  if (optionIdx === card.correct) {
    optionStates[optionIdx] = "correct";
    return {
      kind: "correct",
      patch: {
        ...state,
        option_states: optionStates,
        phase: "explaining",
        show_explain: true,
        answer_submission_team_key: state.answering_team_key,
      },
    };
  }

  optionStates[optionIdx] = "wrong";
  const wrongCount = optionStates.filter((s) => s === "wrong").length;
  const attemptIdx = state.attempt_idx + 1;

  if (wrongCount >= MAX_WRONG_BEFORE_ABANDON || attemptIdx >= state.attempt_order.length) {
    const nextSelectorIdx =
      attemptIdx < state.attempt_order.length ? state.attempt_order[attemptIdx] : state.attempt_order[0];
    return { kind: "abandon", optionStates, nextSelectorIdx };
  }

  const nextTeamIdx = state.attempt_order[attemptIdx];
  const nextTeam = teams[nextTeamIdx];
  return {
    kind: "next",
    patch: {
      ...state,
      option_states: optionStates,
      attempt_idx: attemptIdx,
      answering_team_idx: nextTeamIdx,
      answering_team_key: nextTeam?.team_key ?? null,
      attempt_label: nextTeam?.name ?? "",
      // Give the next team a fresh 15s window — without this the shared
      // deadline_at (already close to expiring) leaks over from the
      // previous team, and the timeout enforcement below auto-skips them.
      deadline_at: computeDeadlineAt(),
    },
  };
}

// Timeout → next attempt, same rotation as a wrong answer, but no option was
// actually picked so nothing in option_states is marked "wrong"; it only
// advances answering_team_idx (or abandons the card via closeCard when the
// attempt order is exhausted, exactly like the 3-wrong-answers abandon path).
function computeTimeoutAdvance(state, teams) {
  const attemptIdx = state.attempt_idx + 1;

  if (attemptIdx >= state.attempt_order.length) {
    // Unlike computeAnswerPatch's abandon branch (reachable via wrongCount
    // too, while attemptIdx may still be in range), this branch is only ever
    // reached because the attempt order is exhausted — so the next selector
    // is always the first team in that order.
    return { kind: "abandon", nextSelectorIdx: state.attempt_order[0] };
  }

  const nextTeamIdx = state.attempt_order[attemptIdx];
  const nextTeam = teams[nextTeamIdx];
  return {
    kind: "next",
    patch: {
      ...state,
      attempt_idx: attemptIdx,
      answering_team_idx: nextTeamIdx,
      answering_team_key: nextTeam?.team_key ?? null,
      attempt_label: nextTeam?.name ?? "",
      deadline_at: computeDeadlineAt(),
    },
  };
}

export default function Host() {
  const [gameId, setGameId] = useState(null);
  const [gamePin, setGamePin] = useState(null);
  const [teams, setTeams] = useState([]);
  const [state, setState] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(() => isSupabaseConfigured);
  const [error, setError] = useState(() =>
    isSupabaseConfigured
      ? null
      : "Supabase chưa được cấu hình. Thiết lập VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY."
  );

  const stateRef = useRef(null);
  const teamsRef = useRef([]);
  const processedEventIds = useRef(new Set());
  const { activeMemes, addMeme } = useMemeDrop();

  // ScoreFx — animation điểm số (swap/steal), chỉ hiển thị trên Host.
  const [scoreFx, setScoreFx] = useState(null);
  useEffect(() => {
    if (!scoreFx) return undefined;
    const id = setTimeout(() => setScoreFx(null), 4000);
    return () => clearTimeout(id);
  }, [scoreFx]);

  // Animation cướp/đổi điểm KHÔNG chiếu ngay khi chọn mục tiêu mà chờ host
  // bấm "Tiếp tục" trên lá bài — khán phòng đọc xong kết quả rồi mới xem
  // hiệu ứng điểm bay trên bảng.
  const [pendingFx, setPendingFx] = useState(null);

  // Suspense card-flip reveal: bật khi host bốc lá (drawEffect là nơi duy nhất
  // chuyển show_effect false→true). EffectCard dùng nó để biết lần mount này
  // có chơi animation lật bài hay không (reload giữa chừng thì không phát lại).
  const [revealingEffect, setRevealingEffect] = useState(false);
  const revealTimerRef = useRef(null);
  const [drawSeq, setDrawSeq] = useState(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    teamsRef.current = teams;
  }, [teams]);

  // Coalesced sync: realtime notification bursts (including the Host's own
  // writes echoing back) collapse into at most one in-flight fetch plus one
  // trailing rerun. The event-log query is capped to the latest 100 rows.
  const reload = useMemo(() => {
    if (!gameId) return null;
    return createCoalescedReloader(async () => {
      try {
        const data = await loadGame(gameId, { includeEvents: true });
        setGamePin(data.game?.pin ?? null);
        setTeams(data.teams);
        setState(data.state);
        setEvents(data.events);
        setLoading(false);
      } catch (err) {
        setError(err.message || String(err));
      }
    });
  }, [gameId]);

  // A STALE_REVISION error means another writer (the answer-deadline
  // timeout, or a just-in-time player answer) already saved first — that's
  // routine under concurrent play, not a failure. Reload the fresh state
  // instead of locking the screen behind a fatal error banner.
  const handleSaveConflict = useCallback(
    (err) => {
      if (err?.code === "STALE_REVISION") {
        reload?.schedule();
        return;
      }
      setError(err.message || String(err));
    },
    [reload]
  );

  // Mở khoá thao tác hiệu ứng cho điện thoại người chơi: khi animation lật bài
  // kết thúc (revealingEffect về false) mà cờ effect_revealed chưa bật thì lưu
  // lên Supabase. Cũng phủ cả trường hợp host reload giữa chừng — lá không lật
  // lại nhưng cờ vẫn được mở ngay nên Play không bị kẹt.
  useEffect(() => {
    if (!state?.show_effect || state.effect_revealed !== false || revealingEffect) return undefined;
    const id = setTimeout(async () => {
      const cur = stateRef.current;
      if (!cur?.show_effect || cur.effect_revealed !== false) return;
      try {
        await saveGameState(
          gameId,
          cur.revision,
          { ...cur, effect_revealed: true, revision: cur.revision + 1 },
          cur
        );
      } catch (err) {
        handleSaveConflict(err);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [state?.show_effect, state?.effect_revealed, revealingEffect, gameId, handleSaveConflict]);

  // Bootstrap: resume or create a game.
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let cancelled = false;
    (async () => {
      try {
        let id = localStorage.getItem(HOST_GAME_ID_KEY);
        let pin = null;
        const wantedPin = localStorage.getItem('vnr_game_pin');
        if (id) {
          try {
            const data = await loadGame(id);
            pin = data.game?.pin ?? null;
            // A room saved from an earlier session only counts while it still
            // matches the pin currently chosen on /pin — otherwise the host
            // would silently resume the old room (and show its old pin).
            if (wantedPin && pin != null && String(pin) !== String(wantedPin)) {
              id = null;
              pin = null;
            }
          } catch {
            id = null;
          }
        }
        if (!id) {
          const gamePin = localStorage.getItem('vnr_game_pin') || '1986';
          // Reuse the existing active room for this pin when there is one —
          // otherwise every fresh browser/tab would fork a duplicate game
          // instead of rejoining the session players are already in.
          const existing = await findGameByPin(gamePin);
          id = existing ? existing.id : await createGame(gamePin, createShuffledCardDeck(), createShuffledEffectDeck());
          pin = existing ? (existing.pin ?? null) : gamePin;
          localStorage.setItem(HOST_GAME_ID_KEY, id);
        }
        if (!cancelled) {
          setGameId(id);
          setGamePin(pin);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || String(err));
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Realtime subscription.
  useEffect(() => {
    if (!gameId || !reload) return undefined;
    return subscribeToGame(gameId, () => reload.schedule());
  }, [gameId, reload]);

  // Initial (and per-gameId) fetch, plus cleanup of any pending debounced
  // fetch when the game id changes or the page unmounts. The interval is a
  // safety net for missed realtime notifications (socket drop, channel race).
  useEffect(() => {
    if (!reload) return undefined;
    reload.schedule();
    const id = setInterval(() => reload.schedule(), 5000);
    return () => {
      clearInterval(id);
      reload.cancel();
    };
  }, [reload]);

  // Meme drops from Play devices — ephemeral, cosmetic only.
  useEffect(() => {
    if (!gameId) return undefined;
    return subscribeToMemeDrops(gameId, (payload) => addMeme(payload));
  }, [gameId, addMeme]);

  const applyAnswer = useCallback(
    async (optionIdx) => {
      const s = stateRef.current;
      const tms = teamsRef.current;
      if (!s || !tms.length) return;
      const result = computeAnswerPatch(s, tms, optionIdx);
      if (!result) return;
      try {
        if (result.kind === "abandon") {
          const next = closeCard({ ...s, option_states: result.optionStates }, tms, result.nextSelectorIdx);
          await saveGameState(gameId, s.revision, next, s);
        } else {
          await saveGameState(gameId, s.revision, { ...result.patch, revision: s.revision + 1 }, s);
        }
      } catch (err) {
        handleSaveConflict(err);
      }
    },
    [gameId, handleSaveConflict]
  );

  const rollDice = async () => {
    const s = stateRef.current;
    if (!s || s.phase !== "resolving_effect" || s.eff_body_buttons !== "dice") return;
    const face = Math.floor(Math.random() * 6) + 1;
    const DICE_VALUES = [100, 300, 500, 200, 600, 1000];
    const score = DICE_VALUES[face - 1];
    try {
      await saveGameState(gameId, s.revision, {
        ...s,
        show_dice: true,
        dice_rolling: true,
        dice_value: score,
        dice_result_visible: false,
        revision: s.revision + 1,
      }, s);

      // Optimistically update locally so animation starts and we don't rely on network speed
      stateRef.current = {
        ...s,
        show_dice: true,
        dice_rolling: true,
        dice_value: score,
        dice_result_visible: false,
        revision: s.revision + 1,
      };
    } catch (err) {
      handleSaveConflict(err);
      return;
    }

    setTimeout(async () => {
      try {
        // Fetch fresh state to guarantee we have the correct revision, preventing 406 Conflicts
        const { state: freshState } = await loadGame(gameId);
        if (freshState && freshState.dice_rolling) {
          await saveGameState(gameId, freshState.revision, {
            ...freshState,
            dice_rolling: false,
            dice_result_visible: true,
            revision: freshState.revision + 1,
          }, freshState);
        }
      } catch (err) {
        console.error("Failed to finish dice roll", err);
      }
    }, 1500);
  };

  const resolveSteal = async (targetIdx) => {
    const s = stateRef.current;
    const tms = teamsRef.current;
    if (!s) return;
    const fromIdx = s.effect_team_idx;
    const amount = Math.min(500, Math.max(0, tms[targetIdx]?.score ?? 0));
    const nextTeams = stealUpToFive(tms, fromIdx, targetIdx);
    try {
      await saveTeams(gameId, nextTeams);
      await saveGameState(gameId, s.revision, {
        ...s,
        effect_result: `${tms[fromIdx]?.name} cướp ${amount} điểm từ ${tms[targetIdx]?.name}!`,
        show_eff_continue: true,
        eff_body_buttons: null,
        revision: s.revision + 1,
      }, s);
      setPendingFx({
        key: Date.now(),
        type: "steal",
        amount,
        a: { name: tms[fromIdx]?.name, color: tms[fromIdx]?.color, before: tms[fromIdx]?.score ?? 0, after: nextTeams[fromIdx]?.score ?? 0 },
        b: { name: tms[targetIdx]?.name, color: tms[targetIdx]?.color, before: tms[targetIdx]?.score ?? 0, after: nextTeams[targetIdx]?.score ?? 0 },
      });
    } catch (err) {
      handleSaveConflict(err);
    }
  };

  const resolveSwap = async (targetIdx) => {
    const s = stateRef.current;
    const tms = teamsRef.current;
    if (!s) return;
    const fromIdx = s.effect_team_idx;
    const nextTeams = swapScores(tms, fromIdx, targetIdx);
    try {
      await saveTeams(gameId, nextTeams);
      await saveGameState(gameId, s.revision, {
        ...s,
        effect_result: `${tms[fromIdx]?.name} đã đổi điểm với ${tms[targetIdx]?.name}!`,
        show_eff_continue: true,
        eff_body_buttons: null,
        revision: s.revision + 1,
      }, s);
      setPendingFx({
        key: Date.now(),
        type: "swap",
        a: { name: tms[fromIdx]?.name, color: tms[fromIdx]?.color, before: tms[fromIdx]?.score ?? 0, after: nextTeams[fromIdx]?.score ?? 0 },
        b: { name: tms[targetIdx]?.name, color: tms[targetIdx]?.color, before: tms[targetIdx]?.score ?? 0, after: nextTeams[targetIdx]?.score ?? 0 },
      });
    } catch (err) {
      handleSaveConflict(err);
    }
  };

  // Process events from connected devices sequentially — awaiting each
  // handler stops two rapid submissions from racing on the same revision.
  useEffect(() => {
    if (!state || !teams.length) return undefined;
    let disposed = false;
    (async () => {
      for (const event of events) {
        if (disposed) return;
        if (processedEventIds.current.has(event.id)) continue;

        if (event.event_type === "PLAYER_ANSWER") {
          processedEventIds.current.add(event.id);
          const s = stateRef.current;
          if (!s || s.phase !== "answering") continue;
          const { cardNum, revision, optionIdx } = event.payload || {};
          if (cardNum !== s.active_card_num) continue;
          if (revision !== s.revision) continue;
          if (event.created_by !== s.answering_team_key) continue;
          await applyAnswer(optionIdx);
        } else if (event.event_type === "PLAYER_ROLL_DICE") {
          processedEventIds.current.add(event.id);
          const s = stateRef.current;
          if (!s || s.phase !== "resolving_effect" || s.eff_body_buttons !== "dice") continue;
          if (s.dice_rolling) continue; // Prevent duplicate rolls while animation is running
          const { revision } = event.payload || {};
          if (revision !== s.revision) continue;
          const effectTeamKey = teamsRef.current[s.effect_team_idx]?.team_key;
          if (event.created_by !== effectTeamKey) continue;

          // rollDice optimistically marks dice_rolling on stateRef after its
          // save, so duplicates later in this batch are skipped by the
          // s.dice_rolling guard above. Mutating stateRef here instead would
          // poison the diff base that rollDice compares against.
          await rollDice();
        } else if (event.event_type === "PLAYER_EFFECT_TARGET") {
          processedEventIds.current.add(event.id);
          const s = stateRef.current;
          if (!s || s.phase !== "resolving_effect") continue;
          if (s.eff_body_buttons !== "steal" && s.eff_body_buttons !== "swap") continue;
          if (s.show_eff_continue) continue; // Already resolved
          const { revision, targetIdx } = event.payload || {};
          if (revision !== s.revision) continue;
          const effectTeamKey = teamsRef.current[s.effect_team_idx]?.team_key;
          if (event.created_by !== effectTeamKey) continue;

          if (s.eff_body_buttons === "steal") await resolveSteal(targetIdx);
          if (s.eff_body_buttons === "swap") await resolveSwap(targetIdx);
        }
      }
    })();
    return () => {
      disposed = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  // Enforce the answer deadline: if it passes with no answer submitted,
  // advance the turn the same way a wrong answer would (see
  // computeTimeoutAdvance above for why option_states is left untouched).
  useEffect(() => {
    if (!state || state.phase !== "answering" || !state.deadline_at) return undefined;
    const targetDeadline = state.deadline_at;
    const ms = Math.max(0, new Date(targetDeadline).getTime() - Date.now());
    const timer = setTimeout(async () => {
      const s = stateRef.current;
      const tms = teamsRef.current;
      if (!s || !tms.length) return;
      if (s.phase !== "answering") return;
      if (s.deadline_at !== targetDeadline) return;
      const result = computeTimeoutAdvance(s, tms);
      try {
        if (result.kind === "abandon") {
          const next = closeCard(s, tms, result.nextSelectorIdx);
          await saveGameState(gameId, s.revision, next, s);
        } else {
          await saveGameState(gameId, s.revision, { ...result.patch, revision: s.revision + 1 }, s);
        }
      } catch (err) {
        handleSaveConflict(err);
      }
    }, ms);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.deadline_at, state?.phase, gameId, handleSaveConflict]);

  const openCard = async (num) => {
    const s = stateRef.current;
    const tms = teamsRef.current;
    if (!s || s.phase !== "selecting_card") return;
    const card = getCardByNumber(s.card_deck, num);
    if (!card || (s.used_card_numbers || []).includes(num)) return;
    const startIdx = Number.isInteger(s.answering_team_idx) ? s.answering_team_idx : 0;
    const order = tms.map((_, i) => (startIdx + i) % tms.length);
    const firstTeam = tms[order[0]];
    try {
      await saveGameState(gameId, s.revision, {
        ...s,
        phase: "answering",
        active_card_num: num,
        attempt_order: order,
        attempt_idx: 0,
        answering_team_idx: order[0],
        answering_team_key: firstTeam?.team_key ?? null,
        answer_submission_team_key: null,
        option_states: card.options.map(() => ""),
        attempt_label: firstTeam?.name ?? "",
        show_explain: false,
        deadline_at: computeDeadlineAt(),
        revision: s.revision + 1,
      }, s);
      await appendGameEvent(gameId, "QUESTION_OPEN", { cardNum: num }, "host");
    } catch (err) {
      handleSaveConflict(err);
    }
  };

  const updateTeamName = async (idx, name) => {
    const nextTeams = teams.map((t, i) => (i === idx ? { ...t, name: name || `Đội ${i + 1}` } : t));
    setTeams(nextTeams);
    try {
      await saveTeams(gameId, nextTeams);
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  // forcedType: dùng bởi panel Test hiệu ứng — ép bốc đúng loại lá chỉ định
  // (hoán đổi vị trí lá khớp đầu tiên về cursor để bộ bài vẫn tiêu thụ chuẩn)
  // và bỏ qua điều kiện phase/explaining để test được ở mọi thời điểm.
  const drawEffect = async (forcedType = null) => {
    const s = stateRef.current;
    const tms = teamsRef.current;
    if (!s || !tms.length) return;
    if (!forcedType && s.phase !== "explaining") return;
    if (!forcedType && !s.answer_submission_team_key) return;

    let winnerIdx = s.answer_submission_team_key
      ? tms.findIndex((t) => t.team_key === s.answer_submission_team_key)
      : -1;
    if (winnerIdx < 0 || !tms[winnerIdx]) {
      winnerIdx = Number.isInteger(s.answering_team_idx) ? s.answering_team_idx % tms.length : 0;
    }

    let deck = Array.isArray(s.effect_deck) ? s.effect_deck : [];
    let cursor = s.effect_cursor ?? 0;
    if (cursor >= deck.length) {
      deck = shuffle(deck.length ? deck : createShuffledEffectDeck());
      cursor = 0;
    }
    if (forcedType) {
      let matchIdx = deck.findIndex((e, i) => i >= cursor && e.type === forcedType);
      if (matchIdx < 0) matchIdx = deck.findIndex((e) => e.type === forcedType);
      if (matchIdx < 0) return;
      deck = [...deck];
      [deck[cursor], deck[matchIdx]] = [deck[matchIdx], deck[cursor]];
    }
    const effect = deck[cursor];

    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    setRevealingEffect(true);
    revealTimerRef.current = setTimeout(() => setRevealingEffect(false), REVEAL_TOTAL_MS);
    setDrawSeq((n) => n + 1);

    const patch = {
      ...s,
      phase: "resolving_effect",
      show_effect: true,
      effect_type: effect.type,
      effect_icon: effect.icon,
      effect_label: effect.label,
      effect_desc: effect.desc,
      effect_team_idx: winnerIdx,
      effect_result: null,
      effect_revealed: false,
      show_eff_continue: false,
      eff_body_buttons: null,
      effect_deck: deck,
      effect_cursor: cursor + 1,
      revision: s.revision + 1,
    };

    let nextTeams = tms;
    if (effect.type === "points" || effect.type === "dice_subtract") {
      patch.eff_body_buttons = "dice";
      patch.show_dice = true; // Show dice modal immediately when drawn
    } else if (effect.type === "lose_all") {
      nextTeams = loseAllScore(tms, winnerIdx);
      patch.effect_result = `${tms[winnerIdx]?.name} mất hết điểm!`;
      patch.show_eff_continue = true;
    } else if (effect.type === "reset") {
      nextTeams = resetScores(tms);
      patch.effect_result = "Điểm của tất cả các đội đã reset về 0!";
      patch.show_eff_continue = true;
    } else if (effect.type === "steal") {
      patch.eff_body_buttons = "steal";
    } else if (effect.type === "swap") {
      patch.eff_body_buttons = "swap";
    }

    try {
      if (nextTeams !== tms) await saveTeams(gameId, nextTeams);
      await saveGameState(gameId, s.revision, patch, s);
    } catch (err) {
      handleSaveConflict(err);
    }
  };

  const confirmAndContinueDice = useCallback(async () => {
    const s = stateRef.current;
    const tms = teamsRef.current;
    if (!s || !s.show_dice) return;
    
    // Apply points
    const idx = s.effect_team_idx;
    const isSub = s.effect_type === "dice_subtract";
    const nextTeams = isSub ? subtractDiceScore(tms, idx, s.dice_value) : addDiceScore(tms, idx, s.dice_value);
    
    // Move to next turn
    const nextState = closeCard(s, nextTeams, idx); 
    
    try {
      await saveTeams(gameId, nextTeams);
      await saveGameState(gameId, s.revision, nextState, s);
    } catch (err) {
      handleSaveConflict(err);
    }
  }, [gameId, handleSaveConflict]);

  // Winning team keeps the right to select the next card.
  const continueAfterEffect = async () => {
    const s = stateRef.current;
    const tms = teamsRef.current;
    if (!s) return;
    const next = closeCard(s, tms, s.effect_team_idx);
    if (pendingFx) {
      setScoreFx(pendingFx);
      setPendingFx(null);
    }
    try {
      await saveGameState(gameId, s.revision, next, s);
    } catch (err) {
      handleSaveConflict(err);
    }
  };

  const finishGame = async () => {
    const s = stateRef.current;
    const tms = teamsRef.current;
    if (!s || !tms.length) return;
    const ranked = [...tms].sort((a, b) => b.score - a.score);
    try {
      await saveGameState(gameId, s.revision, {
        ...s,
        phase: "finished",
        show_winner: true,
        winner_name: ranked[0]?.name ?? "",
        rank_list: ranked,
        revision: s.revision + 1,
      }, s);
      await setGameStatus(gameId, "finished");
    } catch (err) {
      handleSaveConflict(err);
    }
  };

  // The winner overlay is a full-screen fixed panel with no close button of
  // its own — without this, "Kết thúc & xếp hạng" strands the Host on that
  // screen with the controls underneath now unreachable.
  const closeWinner = async () => {
    const s = stateRef.current;
    if (!s) return;
    try {
      await saveGameState(gameId, s.revision, {
        ...s,
        show_winner: false,
        revision: s.revision + 1,
      }, s);
    } catch (err) {
      handleSaveConflict(err);
    }
  };

  const resetGame = async () => {
    const s = stateRef.current;
    const tms = teamsRef.current;
    if (!s || !tms.length) return;
    const shuffledKeys = shuffle(tms.map((t) => t.team_key));
    const nextTeams = tms.map((t) => ({
      ...t,
      score: 0,
      display_order: shuffledKeys.indexOf(t.team_key),
    }));
    const cardDeck = createShuffledCardDeck();
    const effectDeck = createShuffledEffectDeck();
    const firstTeam = nextTeams.find((t) => t.display_order === 0);
    try {
      await saveTeams(gameId, nextTeams);
      await saveGameState(gameId, s.revision, {
        ...s,
        phase: "selecting_card",
        card_deck: cardDeck,
        used_card_numbers: [],
        effect_deck: effectDeck,
        effect_cursor: 0,
        active_card_num: null,
        attempt_order: [],
        attempt_idx: 0,
        answering_team_idx: 0,
        answering_team_key: firstTeam?.team_key ?? null,
        answer_submission_team_key: null,
        option_states: [],
        attempt_label: "",
        deadline_at: null,
        show_explain: false,
        show_effect: false,
        effect_type: null,
        effect_icon: null,
        effect_label: null,
        effect_desc: null,
        effect_team_idx: null,
        effect_result: null,
        show_eff_continue: false,
        eff_body_buttons: null,
        show_dice: false,
        dice_rolling: false,
        dice_value: null,
        dice_result_visible: false,
        show_winner: false,
        winner_name: null,
        rank_list: [],
        revision: s.revision + 1,
      }, s);
      await setGameStatus(gameId, "playing");
    } catch (err) {
      handleSaveConflict(err);
    }
  };

  if (loading) {
    return (
      <div className="host-wrap">
        <div className="masthead">
          <div>
            <div className="sub">Đang tải ván chơi…</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="host-wrap">
        <div className="masthead">
          <div>
            <h1>Lỗi kết nối</h1>
            <div className="sub" style={{ marginTop: 6 }}>
              {error}
            </div>
            <button
              type="button"
              onClick={() => {
                setError(null);
                if (gameId) reload?.schedule();
              }}
              style={{ marginTop: 12 }}
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!state || !teams.length) return null;

  const activeCard = state.active_card_num ? getCardByNumber(state.card_deck, state.active_card_num) : null;
  const selectingTeam = teams[state.answering_team_idx ?? 0] ?? teams[0];
  const openedCount = (state.used_card_numbers || []).length;
  const totalCards = state.card_deck.length;

  return (
    <div className="host-wrap">
      <div className="masthead">
        <div>
          <div className="sub">Trò chơi thuyết trình lịch sử Đảng</div>
          <h1>Hành Trình Đổi Mới</h1>
          <div className="sub" style={{ marginTop: 6 }}>
            Đại hội VI (1986) → Đại hội VIII (1996) → Đại hội IX (2001) → 2006 · PIN: <b>{gamePin ?? "…"}</b>
          </div>
        </div>
        <div className="stamp">
          VĂN
          <br />
          KIỆN
          <br />
          ĐẢNG
        </div>
      </div>

      <div className="legend">
        <span style={{ background: CAT_COLOR.L }}>{CAT_NAME.L}</span>
        <span style={{ background: CAT_COLOR.S }}>{CAT_NAME.S}</span>
        <span style={{ background: CAT_COLOR.V }}>{CAT_NAME.V}</span>
      </div>

      <div className="legend effects">
        {EFFECT_DEFINITIONS.map((def) => (
          <span key={def.type}>
            <b style={{ background: EFFECT_COLORS[def.type] }} />
            {def.icon} {def.label}
          </span>
        ))}
      </div>

      <div className="board">
        {state.card_deck.map((c) => {
          const used = (state.used_card_numbers || []).includes(c.num);
          return (
            <div
              key={c.num}
              className={"ncard" + (used ? " used" : "")}
              style={{ "--cat-color": CAT_COLOR[c.cat] }}
              onClick={() => !used && openCard(c.num)}
            >
              {used ? (
                <>
                  <div className="ncard-done">✓</div>
                  <div className="ncard-cat">Đã mở</div>
                </>
              ) : (
                <>
                  <div className="ncard-num">{c.num}</div>
                  <div className="ncard-cat">{CAT_NAME[c.cat]}</div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="panel">
        <div className="teams">
          <h2>Bảng điểm</h2>
          {/* Display order: highest score first. `i` stays the team's index in
              the underlying teams array so renaming and the active highlight
              keep working. */}
          {[...teams]
            .map((t, i) => ({ t, i }))
            .sort((a, b) => b.t.score - a.t.score)
            .map(({ t, i }) => (
              <div key={t.team_key} className={"team-row" + (i === (state.answering_team_idx ?? 0) ? " active" : "")}>
                <div className="team-color" style={{ background: t.color }} />
                <input type="text" value={t.name} onChange={(e) => updateTeamName(i, e.target.value)} />
                <span className="team-score">{t.score}</span>
              </div>
            ))}
        </div>

        <div className="controls">
          <h2>Điều khiển ván chơi</h2>
          <div className="turn-label">Lượt chọn lá bài</div>
          <div className="turn-name">{selectingTeam?.name}</div>
          <div className="progress">
            {openedCount}/{totalCards} lá đã mở
          </div>
          <button className="host-btn ghost" onClick={finishGame}>
            Kết thúc &amp; xếp hạng
          </button>
          <button className="host-btn ghost" onClick={resetGame}>
            Ván mới
          </button>
          <details className="test-effects">
            <summary>🧪 Test hiệu ứng (bốc lá chỉ định)</summary>
            <div className="test-grid">
              {EFFECT_DEFINITIONS.map((def) => (
                <button
                  key={def.type}
                  type="button"
                  className="host-btn ghost"
                  onClick={() => drawEffect(def.type)}
                >
                  {def.icon} {def.label}
                </button>
              ))}
            </div>
          </details>
          <div className="hint">
            Đội tới lượt chọn 1 lá bài số, sau đó chọn 1 trong 4 đáp án trên thiết bị của mình. Trả lời đúng → bốc 1
            lá bài may mắn, đội đó tiếp tục lượt. Trả lời sai → quyền trả lời chuyển sang đội tiếp theo; nếu 3 đáp án
            sai, lá bài bị bỏ (không hiện đáp án, không hiệu ứng) và đội kế tiếp được chọn lá bài mới.
          </div>
        </div>
      </div>

      {/* Question Card Overlay */}
      <div className={"overlay" + (activeCard ? " show" : "")}>
        {activeCard && (
          <div className={"card cat-" + activeCard.cat}>
            <div className="card-eyebrow">
              {CAT_NAME[activeCard.cat]} · Lá số {activeCard.num}
            </div>
            <div className="card-q">{activeCard.q}</div>
            <div className="attempt-label">Lượt trả lời: {state.attempt_label}</div>

            <div className="options">
              {activeCard.options.map((opt, i) => (
                <div
                  key={i}
                  className={"opt-btn" + (state.option_states[i] ? " " + state.option_states[i] : "")}
                  style={{ cursor: "default", opacity: state.option_states[i] ? 1 : 0.75 }}
                >
                  {opt}
                  {state.option_states[i] === "correct" && " ✓"}
                  {state.option_states[i] === "wrong" && " ✗"}
                </div>
              ))}
            </div>

            {state.phase === "answering" && (
              <details style={{ marginTop: 12, fontSize: 13, color: "#887272" }}>
                <summary style={{ cursor: "pointer" }}>Nhập thủ công (khi Play không kết nối)</summary>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  {activeCard.options.map((opt, i) => (
                    <button
                      key={i}
                      className={"opt-btn" + (state.option_states[i] ? " " + state.option_states[i] : "")}
                      disabled={state.option_states[i] !== ""}
                      onClick={() => applyAnswer(i)}
                      style={{ fontSize: 13 }}
                    >
                      {String.fromCharCode(65 + i)}: {opt.substring(0, 30)}...
                    </button>
                  ))}
                </div>
              </details>
            )}

            <div className={"card-a" + (state.show_explain ? " show" : "")}>{activeCard.explain}</div>

            {state.phase === "explaining" && state.answer_submission_team_key && (
              <div className="card-actions">
                <button className="host-btn" onClick={() => drawEffect()}>
                  Bốc lá bài may mắn
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lá bài hiệu ứng duy nhất: úp → lật hồi hộp → chính lá đó hiển thị nội
          dung + tương tác (xúc xắc / chọn mục tiêu / kết quả). key=drawSeq chỉ
          đổi khi bốc lá mới nên các tương tác không remount card. */}
      {state.show_effect && (
        <EffectCard
          key={drawSeq}
          state={state}
          teams={teams}
          teamName={teams[state.effect_team_idx]?.name}
          animate={revealingEffect}
          onContinue={continueAfterEffect}
          onPickTarget={(targetIdx) =>
            state.eff_body_buttons === "steal" ? resolveSteal(targetIdx) : resolveSwap(targetIdx)
          }
          onRollDice={rollDice}
          onConfirmDice={confirmAndContinueDice}
        />
      )}

      {/* Score animation overlay (swap/steal) — cosmetic, auto-dismisses */}
      {scoreFx && <ScoreFx key={scoreFx.key} fx={scoreFx} />}

      {/* Winner Overlay */}
      <div className={"winner" + (state.show_winner ? " show" : "")}>
        <div className="winner-card">
          <h2>Kết thúc hành trình</h2>
          <div className="name">{state.winner_name}</div>
          <div>
            {(state.rank_list || []).map((t, i) => (
              <div key={t.team_key ?? i} className="rank">
                <span>
                  {i + 1}. {t.name}
                </span>
                <span>{t.score} điểm</span>
              </div>
            ))}
          </div>
          <div className="winner-actions">
            <button type="button" className="host-btn ghost" onClick={closeWinner}>
              Đóng
            </button>
            <button type="button" className="host-btn" onClick={resetGame}>
              Ván mới
            </button>
          </div>
        </div>
      </div>

      {/* Meme Drop Overlay */}
      <MemeDrop activeMemes={activeMemes} />
    </div>
  );
}
