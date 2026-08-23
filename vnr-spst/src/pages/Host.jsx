import { useState, useCallback, useRef, useEffect } from "react";
import {
  CAT_COLOR,
  CAT_NAME,
  createShuffledCardDeck,
  createShuffledEffectDeck,
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
  rotationForDiceValue,
} from "../game/transitions";
import {
  createGame,
  loadGame,
  subscribeToGame,
  saveGameState,
  saveTeams,
  appendGameEvent,
  setGameStatus,
  subscribeToMemeDrops,
} from "../game/gameRepository";
import { isSupabaseConfigured } from "../lib/supabase";
import MemeDrop from "../components/MemeDrop.jsx";
import { useMemeDrop } from "../hooks/useMemeDrop.js";
import "./Host.css";

const HOST_GAME_ID_KEY = "vnr_host_game_id";
const ANSWER_SECONDS = 15;

// Excludes visually-ambiguous characters (0/O, 1/I) so a code read off the
// Host screen and typed on a phone doesn't get mistyped.
const TEAM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomTeamCode() {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += TEAM_CODE_CHARS[Math.floor(Math.random() * TEAM_CODE_CHARS.length)];
  }
  return code;
}
const MAX_WRONG_BEFORE_ABANDON = 3;

function computeDeadlineAt() {
  return new Date(Date.now() + ANSWER_SECONDS * 1000).toISOString();
}

/* ─── Dice Modal Styles (injected once) ─── */
const DICE_STYLE = `
  .dice-overlay {
    position: fixed; inset: 0; z-index: 70;
    display: flex; align-items: center; justify-content: center;
    background: rgba(20,16,10,0.6);
    padding: 20px;
  }
  .dice-overlay.hidden { display: none; }
  .dice-modal {
    background: #fdfbf7;
    border: 3px double #141b2c;
    border-radius: 4px;
    padding: 2.5rem;
    max-width: 420px; width: 100%;
    display: flex; flex-direction: column; align-items: center;
    position: relative;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    transform: rotate(-0.4deg);
  }
  .dice-modal-title {
    font-family: 'Noto Serif', serif;
    font-size: 13px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #554243;
    margin-bottom: 2rem;
    border-bottom: 0.5px solid #887272;
    padding-bottom: 0.5rem;
    width: 100%; text-align: center;
  }
  .dice-close-btn {
    position: absolute; top: 1rem; right: 1rem;
    background: none; border: none; cursor: pointer;
    color: #887272; font-size: 20px; line-height: 1;
    transition: color 0.15s;
  }
  .dice-close-btn:hover { color: #5c0c1c; }
  .dice-scene {
    perspective: 1000px;
    width: 96px; height: 96px;
    margin-bottom: 3rem;
    position: relative;
  }
  .dice-wrapper {
    width: 100%; height: 100%; position: absolute;
  }
  .dice-cube {
    width: 100%; height: 100%; position: absolute;
    transform-style: preserve-3d;
    transition: transform 1500ms ease-out;
  }
  .dice-face {
    position: absolute;
    width: 96px; height: 96px;
    background-color: #faf8ff;
    border: 2px solid #141b2c;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Courier New', monospace;
    font-size: 48px; font-weight: bold;
    color: #141b2c;
    text-shadow: 1px 1px 0 rgba(0,0,0,0.4), -0.5px -0.5px 0 rgba(0,0,0,0.2);
    box-shadow: inset 0 0 15px rgba(0,0,0,0.05);
  }
  .dice-face.front  { transform: rotateY(  0deg) translateZ(48px); }
  .dice-face.back   { transform: rotateY(180deg) translateZ(48px); }
  .dice-face.right  { transform: rotateY( 90deg) translateZ(48px); }
  .dice-face.left   { transform: rotateY(-90deg) translateZ(48px); }
  .dice-face.top    { transform: rotateX( 90deg) translateZ(48px); }
  .dice-face.bottom { transform: rotateX(-90deg) translateZ(48px); }
  .dice-shadow {
    position: absolute; bottom: -1.5rem; left: 50%;
    transform: translateX(-50%);
    width: 80px; height: 16px;
    background: rgba(0,0,0,0.2);
    border-radius: 50%;
    filter: blur(4px);
  }
  @keyframes dice-bounce {
    0%   { transform: translate(-120px,-80px) scale(0.6); }
    20%  { transform: translate(100px,60px) scale(1.1); }
    45%  { transform: translate(-60px,-40px) scale(0.85); }
    70%  { transform: translate(40px,30px) scale(1.05); }
    85%  { transform: translate(-15px,-15px) scale(0.95); }
    100% { transform: translate(0,0) scale(1); }
  }
  @keyframes shadow-pulse {
    0%   { transform: translateX(-50%) scale(0.6); opacity: 0.1; }
    20%  { transform: translateX(-50%) scale(1.1); opacity: 0.05; }
    45%  { transform: translateX(-50%) scale(0.85); opacity: 0.15; }
    70%  { transform: translateX(-50%) scale(1.05); opacity: 0.08; }
    85%  { transform: translateX(-50%) scale(0.95); opacity: 0.12; }
    100% { transform: translateX(-50%) scale(1); opacity: 0.1; }
  }
  .dice-bouncing { animation: dice-bounce 1.5s cubic-bezier(0.25,1,0.5,1) forwards; }
  .shadow-rolling { animation: shadow-pulse 1.5s cubic-bezier(0.25,1,0.5,1) forwards; }
  .dice-roll-btn {
    background: #7a2430; color: #fff;
    font-family: 'Noto Serif', serif;
    font-size: 13px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    padding: 0.75rem 2.5rem;
    border: none; border-radius: 0; cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
    z-index: 10; position: relative;
  }
  .dice-roll-btn:hover { transform: translateY(2px); box-shadow: 0 0 0 2px #141b2c; }
  .dice-roll-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
  .dice-result {
    margin-top: 1.5rem; height: 2rem;
    display: flex; align-items: center; justify-content: center;
    gap: 0.5rem; z-index: 10;
    transition: opacity 0.3s;
    font-family: 'Noto Serif', serif;
  }
  .dice-result.hidden-result { opacity: 0; }
  .dice-result-num {
    font-size: 32px; font-weight: 700; color: #7a2430; line-height: 1;
  }
  .dice-result-text { font-size: 18px; font-weight: 600; color: #141b2c; }
  .dice-confirm-btn {
    margin-top: 1rem;
    background: transparent; color: #141b2c;
    font-family: 'Noto Serif', serif;
    font-size: 13px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    padding: 0.5rem 2rem;
    border: 1px solid #887272; border-radius: 0; cursor: pointer;
    transition: background 0.15s;
  }
  .dice-confirm-btn:hover { background: #f1e7cf; }
`;

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
  const cubeRef = useRef(null);
  const wrapperRef = useRef(null);
  const shadowRef = useRef(null);

  const { activeMemes, addMeme } = useMemeDrop();

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    teamsRef.current = teams;
  }, [teams]);

  const reload = useCallback(async (id) => {
    try {
      const data = await loadGame(id);
      setTeams(data.teams);
      setState(data.state);
      setEvents(data.events);
      setLoading(false);
    } catch (err) {
      setError(err.message || String(err));
    }
  }, []);

  // A STALE_REVISION error means another writer (the answer-deadline
  // timeout, or a just-in-time player answer) already saved first — that's
  // routine under concurrent play, not a failure. Reload the fresh state
  // instead of locking the screen behind a fatal error banner.
  const handleSaveConflict = useCallback(
    (err) => {
      if (err?.code === "STALE_REVISION") {
        reload(gameId);
        return;
      }
      setError(err.message || String(err));
    },
    [gameId, reload]
  );

  // Bootstrap: resume or create a game.
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let cancelled = false;
    (async () => {
      try {
        let id = localStorage.getItem(HOST_GAME_ID_KEY);
        if (id) {
          try {
            await loadGame(id);
          } catch {
            id = null;
          }
        }
        if (!id) {
          const gamePin = localStorage.getItem('vnr_game_pin') || '1986';
          id = await createGame(gamePin, createShuffledCardDeck(), createShuffledEffectDeck());
          localStorage.setItem(HOST_GAME_ID_KEY, id);
        }
        if (!cancelled) {
          setGameId(id);
          await reload(id);
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
  }, [reload]);

  // Realtime subscription.
  useEffect(() => {
    if (!gameId) return undefined;
    return subscribeToGame(gameId, () => reload(gameId));
  }, [gameId, reload]);

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
          await saveGameState(gameId, s.revision, next);
        } else {
          await saveGameState(gameId, s.revision, { ...result.patch, revision: s.revision + 1 });
        }
      } catch (err) {
        handleSaveConflict(err);
      }
    },
    [gameId, handleSaveConflict]
  );

  // Process events from connected devices.
  useEffect(() => {
    if (!state || !teams.length) return;
    events.forEach((event) => {
      if (processedEventIds.current.has(event.id)) return;

      if (event.event_type === "PLAYER_ANSWER") {
        processedEventIds.current.add(event.id);
        const s = stateRef.current;
        if (!s || s.phase !== "answering") return;
        const { cardNum, revision, optionIdx } = event.payload || {};
        if (cardNum !== s.active_card_num) return;
        if (revision !== s.revision) return;
        if (event.created_by !== s.answering_team_key) return;
        applyAnswer(optionIdx);
      } else if (event.event_type === "PLAYER_ROLL_DICE") {
        processedEventIds.current.add(event.id);
        const s = stateRef.current;
        if (!s || s.phase !== "resolving_effect" || s.eff_body_buttons !== "dice") return;
        if (s.dice_rolling) return; // Prevent duplicate rolls while animation is running
        const { revision } = event.payload || {};
        if (revision !== s.revision) return;
        const effectTeamKey = teamsRef.current[s.effect_team_idx]?.team_key;
        if (event.created_by !== effectTeamKey) return;
        
        // Optimistically block subsequent duplicate events in this loop
        stateRef.current = { ...s, show_dice: true, dice_rolling: true };
        
        rollDice();
      }
    });
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
          await saveGameState(gameId, s.revision, next);
        } else {
          await saveGameState(gameId, s.revision, { ...result.patch, revision: s.revision + 1 });
        }
      } catch (err) {
        handleSaveConflict(err);
      }
    }, ms);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.deadline_at, state?.phase, gameId, handleSaveConflict]);

  // Dice cube animation reacts to shared state.
  useEffect(() => {
    if (!state) return;
    if (state.dice_rolling) {
      const [rx, ry] = rotationForDiceValue(state.dice_value);
      if (cubeRef.current) {
        cubeRef.current.style.transition = "none";
        cubeRef.current.style.transform = "rotateX(0deg) rotateY(0deg)";
        void cubeRef.current.offsetHeight;
        cubeRef.current.style.transition = "";
      }
      if (wrapperRef.current) wrapperRef.current.classList.add("dice-bouncing");
      if (shadowRef.current) shadowRef.current.classList.add("shadow-rolling");
      requestAnimationFrame(() => {
        if (cubeRef.current) cubeRef.current.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      });
    } else {
      if (wrapperRef.current) wrapperRef.current.classList.remove("dice-bouncing");
      if (shadowRef.current) shadowRef.current.classList.remove("shadow-rolling");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.dice_rolling, state?.dice_value]);

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
      });
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

  const regenerateTeamCode = async (idx) => {
    const nextTeams = teams.map((t, i) => (i === idx ? { ...t, team_code: randomTeamCode() } : t));
    setTeams(nextTeams);
    try {
      await saveTeams(gameId, nextTeams);
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  const drawEffect = async () => {
    const s = stateRef.current;
    const tms = teamsRef.current;
    if (!s || s.phase !== "explaining") return;
    if (!s.answer_submission_team_key) return;
    const winnerIdx = tms.findIndex((t) => t.team_key === s.answer_submission_team_key);
    if (winnerIdx < 0) return;

    let deck = Array.isArray(s.effect_deck) ? s.effect_deck : [];
    let cursor = s.effect_cursor ?? 0;
    if (cursor >= deck.length) {
      deck = shuffle(deck.length ? deck : createShuffledEffectDeck());
      cursor = 0;
    }
    const effect = deck[cursor];

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
      await saveGameState(gameId, s.revision, patch);
    } catch (err) {
      handleSaveConflict(err);
    }
  };

  const rollDice = async () => {
    const s = stateRef.current;
    if (!s || s.phase !== "resolving_effect" || s.eff_body_buttons !== "dice") return;
    const face = Math.floor(Math.random() * 6) + 1;
    const score = Math.min(face, 5);
    try {
      await saveGameState(gameId, s.revision, {
        ...s,
        show_dice: true,
        dice_rolling: true,
        dice_value: score,
        dice_result_visible: false,
        revision: s.revision + 1,
      });
    } catch (err) {
      handleSaveConflict(err);
      return;
    }
    setTimeout(async () => {
      const latest = stateRef.current;
      if (!latest || !latest.dice_rolling) return;
      try {
        await saveGameState(gameId, latest.revision, {
          ...latest,
          dice_rolling: false,
          dice_result_visible: true,
          revision: latest.revision + 1,
        });
      } catch (err) {
        handleSaveConflict(err);
      }
    }, 1500);
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
      await saveGameState(gameId, s.revision, nextState);
    } catch (err) {
      handleSaveConflict(err);
    }
  }, [gameId, handleSaveConflict]);

  const resolveSteal = async (targetIdx) => {
    const s = stateRef.current;
    const tms = teamsRef.current;
    if (!s) return;
    const fromIdx = s.effect_team_idx;
    const amount = Math.min(5, Math.max(0, tms[targetIdx]?.score ?? 0));
    const nextTeams = stealUpToFive(tms, fromIdx, targetIdx);
    try {
      await saveTeams(gameId, nextTeams);
      await saveGameState(gameId, s.revision, {
        ...s,
        effect_result: `${tms[fromIdx]?.name} cướp ${amount} điểm từ ${tms[targetIdx]?.name}!`,
        show_eff_continue: true,
        eff_body_buttons: null,
        revision: s.revision + 1,
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
      });
    } catch (err) {
      handleSaveConflict(err);
    }
  };

  // Winning team keeps the right to select the next card.
  const continueAfterEffect = async () => {
    const s = stateRef.current;
    const tms = teamsRef.current;
    if (!s) return;
    const next = closeCard(s, tms, s.effect_team_idx);
    try {
      await saveGameState(gameId, s.revision, next);
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
      });
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
      });
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
      });
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
                if (gameId) reload(gameId);
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
            Đại hội VI (1986) → Đại hội VIII (1996) → Đại hội IX (2001) → 2006 · PIN: <b>1986</b>
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
        <span>
          <b style={{ background: "#3F5D45" }} />+1–5 điểm (tung xúc xắc)
        </span>
        <span>
          <b style={{ background: "#9B2335" }} />-1–5 điểm (tung xúc xắc trừ)
        </span>
        <span>
          <b style={{ background: "#B4B2A9" }} />Mất hết điểm
        </span>
        <span>
          <b style={{ background: "#22293A" }} />Reset điểm cả bàn
        </span>
        <span>
          <b style={{ background: "#8A4B08" }} />Cướp điểm
        </span>
        <span>
          <b style={{ background: "#4A3A6B" }} />Đổi điểm
        </span>
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
          {teams.map((t, i) => (
            <div key={t.team_key} className={"team-row" + (i === (state.answering_team_idx ?? 0) ? " active" : "")}>
              <div className="team-color" style={{ background: t.color }} />
              <input type="text" value={t.name} onChange={(e) => updateTeamName(i, e.target.value)} />
              <span className="team-code" title="Mã đội — chia cho đại diện đội để tham gia ở /pick-team">
                {t.team_code || t.team_key}
              </span>
              <button
                type="button"
                className="team-code-btn"
                title="Tạo mã mới cho đội này"
                onClick={() => regenerateTeamCode(i)}
              >
                🔄
              </button>
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
                <button className="host-btn" onClick={drawEffect}>
                  Bốc lá bài may mắn
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Effect Card Overlay: skip for dice so dice modal handles its own display */}
      <div className={"overlay" + (state.show_effect && state.eff_body_buttons !== "dice" ? " show" : "")}>
        {state.show_effect && state.eff_body_buttons !== "dice" && (
          <div className="effect-card">
            <div className="eff-target">
              Đội {teams[state.effect_team_idx]?.name} bốc được:
            </div>
            <div className="eff-label">
              {state.effect_icon} {state.effect_label}
            </div>
            <div className="eff-desc">{state.effect_desc}</div>
            <div className="eff-body">
              {state.eff_body_buttons === "steal" && !state.show_eff_continue && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", width: "100%" }}>
                  {teams.map(
                    (t, i) =>
                      i !== state.effect_team_idx && (
                        <button
                          key={t.team_key}
                          style={{ background: t.color, borderColor: t.color, padding: "8px 6px", fontSize: "13px" }}
                          onClick={() => resolveSteal(i)}
                        >
                          Cướp từ {t.name} ({t.score}đ)
                        </button>
                      )
                  )}
                </div>
              )}
              {state.eff_body_buttons === "swap" && !state.show_eff_continue && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", width: "100%" }}>
                  {teams.map(
                    (t, i) =>
                      i !== state.effect_team_idx && (
                        <button
                          key={t.team_key}
                          style={{ background: t.color, borderColor: t.color, padding: "8px 6px", fontSize: "13px" }}
                          onClick={() => resolveSwap(i)}
                        >
                          Đổi với {t.name} ({t.score}đ)
                        </button>
                      )
                  )}
                </div>
              )}
              {state.effect_result && <div style={{ marginTop: 12, fontWeight: 600 }}>{state.effect_result}</div>}
            </div>
            {state.show_eff_continue && (
              <button className="host-btn" style={{ marginTop: 14 }} onClick={continueAfterEffect}>
                Tiếp tục
              </button>
            )}
          </div>
        )}
      </div>

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

      {/* ── Dice Modal ── */}
      <style>{DICE_STYLE}</style>
      <div className={"dice-overlay" + (state.show_dice ? "" : " hidden")}>
        <div className="dice-modal" style={{ position: "relative" }}>
          
          <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '0.5px solid #887272', paddingBottom: '1rem', width: '100%' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#554243', marginBottom: '1rem' }}>
              Gieo Xúc Xắc — {teams[state.effect_team_idx]?.name ?? ""}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#5c0c1c', marginBottom: '4px' }}>
              <span style={{ fontSize: '28px', marginRight: '8px' }}>{state.effect_icon}</span>
              {state.effect_label}
            </div>
            <div style={{ fontSize: '14px', color: '#555' }}>
              {state.effect_desc}
            </div>
          </div>

          <div className="dice-scene">
            <div className="dice-wrapper" ref={wrapperRef}>
              <div className="dice-cube" ref={cubeRef}>
                <div className="dice-face front">1</div>
                <div className="dice-face back">6</div>
                <div className="dice-face right">3</div>
                <div className="dice-face left">4</div>
                <div className="dice-face top">2</div>
                <div className="dice-face bottom">5</div>
              </div>
            </div>
            <div className="dice-shadow" ref={shadowRef} />
          </div>

          {!state.dice_rolling && !state.dice_result_visible && (
            <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '15px', color: '#887272', fontStyle: 'italic' }}>
              <div style={{ marginBottom: '12px' }}>
                Đang chờ Đội {teams[state.effect_team_idx]?.name} tung xúc xắc…
              </div>
              <button onClick={rollDice} className="host-btn ghost" style={{ padding: '6px 12px', fontSize: '13px' }}>
                🎲 Tung hộ
              </button>
            </div>
          )}

          {state.dice_result_visible && (
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <div style={{
                fontSize: '22px', fontWeight: 700,
                color: state.effect_type === 'dice_subtract' ? '#9B2335' : '#3F5D45',
                marginBottom: '1.2rem'
              }}>
                🎲 {state.dice_value} — {teams[state.effect_team_idx]?.name} {state.effect_type === 'dice_subtract' ? '-' : '+'}{state.dice_value} điểm!
              </div>
              <button className="dice-roll-btn" onClick={confirmAndContinueDice}>
                Tiếp tục
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Meme Drop Overlay */}
      <MemeDrop activeMemes={activeMemes} />
    </div>
  );
}
