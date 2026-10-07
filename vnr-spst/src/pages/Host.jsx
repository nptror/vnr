import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  CAT_COLOR,
  CAT_NAME,
  createShuffledCardDeck,
  createShuffledEffectDeck,
  EFFECT_COLORS,
  EFFECT_DEFINITIONS,
  getCardByNumber,
  normalizeTeamCount,
  QUESTION_CAT,
  shuffle,
} from "../game/catalog";
import {
  closeCard,
  addDiceScore,
  subtractDiceScore,
  loseAllScore,
  resetScores,
  stealScore,
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
import EffectCard, { REVEAL_TOTAL_MS, FLIP_AT_MS } from "../components/EffectCard.jsx";
import WinnerPodium from "../components/WinnerPodium.jsx";
import { playSound, stopSound, playMemeSoundFromPool } from "../game/sounds";
import { getMemeSoundPool } from "../config/memes";
import { useMemeDrop, MEME_LIFETIME } from "../hooks/useMemeDrop.js";
import { useBackgroundMusic } from "../hooks/useBackgroundMusic.js";
import "./Host.css";

const HOST_GAME_ID_KEY = "vnr_host_game_id";
const ANSWER_SECONDS = 15;

const MAX_WRONG_BEFORE_ABANDON = 3;

// Dice faces 1-6 → points, used both for the guaranteed Tầng 1 roll on every
// correct answer (startGuaranteedDiceRoll) and whenever a "points"/
// "dice_subtract" effect card is drawn in Tầng 2 (pickAndApplyEffect).
const DICE_VALUES = [100, 200, 300, 400, 500, 600];
const FLAT_BONUS_POINTS = 200;

function computeDeadlineAt() {
  return new Date(Date.now() + ANSWER_SECONDS * 1000).toISOString();
}

// Wrong answer → next attempt, unless 3 options have been marked wrong or the
// attempt order is exhausted, in which case the card is revealed (correct
// option shown, phase → closing_card) without drawing an effect, and the
// round ends the same way a correct answer's effect resolution would
// (GAMEPLAY.md).
function computeAnswerPatch(state, teams, optionIdx) {
  const card = getCardByNumber(state.card_deck, state.active_card_num);
  if (!card) return null;
  const optionStates = Array.isArray(state.option_states) ? [...state.option_states] : [];

  if (optionIdx === card.correct) {
    optionStates[optionIdx] = "correct";
    // Tầng 1 — vào thẳng phase xúc xắc, không dừng ở "explaining" chờ Host
    // bấm "Tung xúc xắc may mắn" nữa: popup tung xúc xắc hiện NGAY trên điện
    // thoại đội vừa trả lời đúng, đồng thời Host thấy lá "Rút Điểm May Mắn"
    // với nút "🎲 Tung hộ" (EffectCard).
    const effectDef = EFFECT_DEFINITIONS.find((d) => d.type === "points");
    return {
      kind: "correct",
      patch: {
        ...state,
        option_states: optionStates,
        phase: "resolving_effect",
        answer_submission_team_key: state.answering_team_key,
        show_effect: true,
        show_dice: true,
        effect_type: "points_base",
        effect_icon: effectDef?.icon ?? "🎲",
        effect_label: "Rút Điểm May Mắn",
        effect_desc: effectDef?.desc ?? "Tung xúc xắc để nhận điểm.",
        effect_team_idx: Number.isInteger(state.answering_team_idx)
          ? state.answering_team_idx
          : 0,
        effect_result: null,
        effect_revealed: true,
        show_eff_continue: false,
        eff_body_buttons: "dice",
        dice_rolling: false,
        dice_value: null,
        dice_result_visible: false,
      },
    };
  }

  optionStates[optionIdx] = "wrong";
  const wrongCount = optionStates.filter((s) => s === "wrong").length;
  const attemptIdx = state.attempt_idx + 1;

  if (wrongCount >= MAX_WRONG_BEFORE_ABANDON || attemptIdx >= state.attempt_order.length) {
    optionStates[card.correct] = "correct";
    return {
      kind: "reveal_fail",
      patch: {
        ...state,
        option_states: optionStates,
        phase: "closing_card",
        answer_submission_team_key: null,
      },
    };
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
// advances answering_team_idx (or reveals the correct answer via the same
// closing_card path as computeAnswerPatch when the attempt order is
// exhausted).
function computeTimeoutAdvance(state, teams) {
  const attemptIdx = state.attempt_idx + 1;

  if (attemptIdx >= state.attempt_order.length) {
    const card = getCardByNumber(state.card_deck, state.active_card_num);
    const optionStates = Array.isArray(state.option_states) ? [...state.option_states] : [];
    if (card) optionStates[card.correct] = "correct";
    return {
      kind: "reveal_fail",
      patch: {
        ...state,
        option_states: optionStates,
        phase: "closing_card",
        answer_submission_team_key: null,
      },
    };
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
  const bgm = useBackgroundMusic();

  // ScoreFx — animation điểm số (swap/steal), chỉ hiển thị trên Host.
  const [scoreFx, setScoreFx] = useState(null);
  useEffect(() => {
    if (!scoreFx) return undefined;
    const id = setTimeout(() => setScoreFx(null), 4000);
    return () => clearTimeout(id);
  }, [scoreFx]);

  // Suspense card-flip reveal: bật mỗi khi có thẻ hiệu ứng mới lật lên
  // (startGuaranteedDiceRoll / pickAndApplyEffect / grantFlatBonus đều
  // chuyển show_effect false→true). EffectCard dùng nó để biết lần mount này
  // có chơi animation lật bài hay không (reload giữa chừng thì không phát lại).
  const [revealingEffect, setRevealingEffect] = useState(false);
  const revealTimerRef = useRef(null);
  const flipSoundTimerRef = useRef(null);
  const [drawSeq, setDrawSeq] = useState(0);

  // Toast hướng dẫn không chặn thao tác — mục đích duy nhất là thay cho "bấm
  // thẻ mà không có gì xảy ra": giải thích lý do thẻ bị khoá (đang giữa lượt /
  // lá đã mở) hoặc báo host rằng lượt kẹt đã được tự đóng khi mở trang.
  const [cardHint, setCardHint] = useState(null);
  useEffect(() => {
    if (!cardHint) return undefined;
    const id = setTimeout(() => setCardHint(null), 3800);
    return () => clearTimeout(id);
  }, [cardHint]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    teamsRef.current = teams;
  }, [teams]);

  // So sánh mảng theo nội dung — poll/realtime re-fire 12 lần/phút kể cả khi
  // 0 byte đổi; JSON.stringify mỗi chu kỳ (vài kB) rẻ hơn nhiều so với
  // re-render toàn cây Host.
  const sameList = (a, b) =>
    a === b || (a?.length === b?.length && JSON.stringify(a) === JSON.stringify(b));

  // Bảng điểm sắp theo score giảm dần; `i` giữ index gốc trong mảng teams
  // để đổi tên và highlight đội đang trả lời vẫn đúng. useMemo tránh cấp
  // phát 2 mảng trung gian trong JSX mỗi render (12 lần/phút khi idle).
  // Đặt trước mọi early return (rules-of-hooks).
  const rankedTeams = useMemo(
    () =>
      teams
        .map((t, i) => ({ t, i }))
        .sort((a, b) => b.t.score - a.t.score),
    [teams]
  );

  // Coalesced sync: realtime notification bursts (including the Host's own
  // writes echoing back) collapse into at most one in-flight fetch plus one
  // trailing rerun. The event-log query is capped to the latest 100 rows.
  const reload = useMemo(() => {
    if (!gameId) return null;
    return createCoalescedReloader(async () => {
      try {
        const data = await loadGame(gameId, { includeEvents: true });
        setGamePin(data.game?.pin ?? null);
        // Guard setState vô nghĩa: bỏ qua khi payload tương đương. `revision`
        // là vân tay của game_state — mọi writer đều bump revision trước khi
        // ghi (invariant của optimistic concurrency), nên revision không đổi
        // ⇒ state không đổi, không cần deep-compare.
        setState((prev) => (prev?.revision === data.state?.revision ? prev : data.state));
        setTeams((prev) => (sameList(prev, data.teams) ? prev : data.teams));
        setEvents((prev) => (sameList(prev, data.events) ? prev : data.events));
        setLoading(false);
        // Mạng vừa hồi phục → xoá màn hình lỗi (poll 5s sẽ gọi lại ở đây).
        setError(null);
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

  // Chỉ lùa một lần mỗi lần mount trang: nếu game được resume lại với một câu
  // hỏi đang kẹt ở phase "closing_card" (đáp án đã lộ nhưng host bị refresh/đóng
  // tab trước khi nhấn "Tiếp tục"), tự đóng lá đó về "selecting_card" để bộ bài
  // bấm được ngay thay vì im lặng. Chỉ áp dụng cho closing_card — không có điểm
  // / hiệu ứng đang chờ bốc nên tự đóng không mất gì. Các phase khác (explaining,
  // resolving_effect…) đang chờ host quyết định → không tự ý đóng.
  const bootRecoveryRef = useRef(false);
  useEffect(() => {
    if (bootRecoveryRef.current) return undefined;
    const s = stateRef.current;
    const tms = teamsRef.current;
    if (!gameId || !s?.phase || !tms.length) return undefined;
    bootRecoveryRef.current = true;
    if (s.phase !== "closing_card") return undefined;
    if (s.deadline_at && new Date(s.deadline_at).getTime() > Date.now()) return undefined;
    const next = closeCard(s, tms);
    saveGameState(gameId, s.revision, next, s)
      .then(() => {
        playSound("card-flip");
        setCardHint(
          `Đã tự đóng lượt câu hỏi còn dở (Lá số ${s.active_card_num ?? ""}) — có thể bốc lá mới.`
        );
      })
      .catch(handleSaveConflict);
    return undefined;
  }, [gameId, state, handleSaveConflict]);

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

  // Bootstrap: resume or create a game. Tách thành hàm để cả nút "Thử lại"
  // lẫn màn tự hồi phục đều gọi lại được — trước đây khi bootstrap lỗi (mất
  // mạng lúc tải trang) thì gameId = null nên "Thử lại" là no-op.
  const cancelledRef = useRef(false);
  const boot = useCallback(() => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    setError(null);
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
          //
          // Số đội cấu hình ở /pin (localStorage['vnr_team_count']) chỉ có tác
          // dụng lúc TẠO phòng mới. Khi `existing` truthy, createGame KHÔNG được
          // gọi — findGameByPin (gameRepository.js) lọc neq('status','finished')
          // nên phòng đang chơi dở luôn được resume nguyên đội hình cũ, cấu hình
          // mới bị bỏ qua. Đó là hành vi cố ý: muốn N đội khác, host phải đổi
          // mã PIN hoặc kết thúc ván cũ (create_game tự 'finished' mọi game cùng
          // PIN khi tạo phòng mới).
          const teamCount = normalizeTeamCount(localStorage.getItem('vnr_team_count'));
          const existing = await findGameByPin(gamePin);
          id = existing ? existing.id : await createGame(gamePin, createShuffledCardDeck(), createShuffledEffectDeck(), teamCount);
          pin = existing ? (existing.pin ?? null) : gamePin;
          localStorage.setItem(HOST_GAME_ID_KEY, id);
        }
        if (!cancelledRef.current) {
          setGameId(id);
          setGamePin(pin);
        }
      } catch (err) {
        if (!cancelledRef.current) {
          setError(err.message || String(err));
          setLoading(false);
        }
      }
    })();
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    if (!isSupabaseConfigured) return undefined;
    const t = setTimeout(boot, 0);
    return () => {
      clearTimeout(t);
      cancelledRef.current = true;
    };
  }, [boot]);

  // Mất kết nối (bootstrap lỗi hoặc poll/reload lỗi đều fall vào `error`):
  // tự xoá error và chạy lại sau 5s để trang sống lại khi mạng hồi phục —
  // không cần bấm "Thử lại". Poll 5s cũng đã tự hồi phục khi reload thành
  // công (setError(null) trong reload), hiệu ứng này chỉ lo trường hợp
  // bootstrap chưa có gameId.
  const retryNow = useCallback(() => {
    setError(null);
    if (gameId) reload?.schedule();
    else boot();
  }, [gameId, reload, boot]);
  useEffect(() => {
    if (!error) return undefined;
    const id = setTimeout(retryNow, 5000);
    return () => clearTimeout(id);
  }, [error, retryNow]);

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

  // Meme drops from Play devices — ephemeral, cosmetic only. Each arrival
  // also plays a random meme stinger on the room speakers.
  useEffect(() => {
    if (!gameId) return undefined;
    return subscribeToMemeDrops(gameId, (payload) => {
      addMeme(payload);
      // Âm thanh đặc trưng của đúng sticker vừa thả (xem
      // config/memes.js#getMemeSoundPool) — cắt đúng lúc sticker biến mất
      // (MEME_LIFETIME) vì vài file âm thanh dài hơn 3.5s hiển thị.
      playMemeSoundFromPool(getMemeSoundPool(payload.memeId), MEME_LIFETIME);
    });
  }, [gameId, addMeme]);

  const applyAnswer = useCallback(
    async (optionIdx) => {
      const s = stateRef.current;
      const tms = teamsRef.current;
      if (!s || !tms.length) return;
      const result = computeAnswerPatch(s, tms, optionIdx);
      if (!result) return;
      stopSound("timer-tick");
      if (result.kind === "correct") playSound("answer-correct");
      else if (result.kind === "reveal_fail") playSound("card-abandoned");
      else playSound("answer-wrong");
      try {
        await saveGameState(gameId, s.revision, { ...result.patch, revision: s.revision + 1 }, s);
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
    const score = DICE_VALUES[face - 1];
    playSound("dice-roll");
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

  // Core of the "bốc 1 trong 6 lá phép" mechanic — shared by the Tầng 2
  // "Thử vận may" choice (see resolveBonusChoice) and the "🧪 Test hiệu ứng"
  // panel (forcedType set). No phase guard: by the time this runs we're
  // already committed to drawing a card (Host forced a type for testing, or
  // the player/Host already chose "bốc lá phép" on the bonus-choice screen),
  // so re-checking phase === "explaining" would incorrectly block the Tầng 2
  // path (phase is "resolving_effect" there, not "explaining").
  const pickAndApplyEffect = async (forcedType = null) => {
    const s = stateRef.current;
    const tms = teamsRef.current;
    if (!s || !tms.length) return;

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

    // Sound: tiếng rút lá ngay khi bấm, tiếng lật đúng lúc mặt trước hé mở,
    // kèm stinger riêng theo từng loại hiệu ứng: hai lá "chấn động"
    // (mất hết điểm / reset) và hai lá liên quan tiền (cướp điểm / đổi điểm —
    // tiếng coin drop ngay khi lá bắt đầu lật ra).
    playSound("effect-draw");
    if (flipSoundTimerRef.current) clearTimeout(flipSoundTimerRef.current);
    flipSoundTimerRef.current = setTimeout(() => {
      playSound("card-flip");
      if (effect.type === "lose_all") {
        setTimeout(() => playSound("meme-vine-boom"), 350);
      } else if (effect.type === "reset") {
        setTimeout(() => playSound("meme-bell"), 350);
      } else if (effect.type === "steal" || effect.type === "swap") {
        setTimeout(() => playSound("coin-drop"), 350);
      }
    }, FLIP_AT_MS);

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
      patch.show_dice = true;
      // Reset dice state — tránh carry-over từ lượt trước khiến kết quả hiện ngay
      patch.dice_rolling = false;
      patch.dice_value = null;
      patch.dice_result_visible = false;
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

  const grantFlatBonus = async () => {
    const s = stateRef.current;
    const tms = teamsRef.current;
    if (!s || !tms.length) return;
    const winnerIdx = Number.isInteger(s.effect_team_idx) ? s.effect_team_idx : 0;
    const nextTeams = addDiceScore(tms, winnerIdx, FLAT_BONUS_POINTS);

    // Bỏ qua animation lật bài — hiện popup kết quả ngay lập tức.
    setRevealingEffect(false);
    setDrawSeq((n) => n + 1);

    const patch = {
      ...s,
      effect_type: "flat_bonus",
      effect_icon: "🎉",
      effect_label: "Cơ Hội May Mắn",
      effect_desc: `Thưởng cố định ${FLAT_BONUS_POINTS} điểm.`,
      effect_result: `${tms[winnerIdx]?.name} nhận thêm +${FLAT_BONUS_POINTS} điểm may mắn!`,
      show_eff_continue: true,
      eff_body_buttons: null,
      revision: s.revision + 1,
    };
    try {
      await saveTeams(gameId, nextTeams);
      await saveGameState(gameId, s.revision, patch, s);
    } catch (err) {
      handleSaveConflict(err);
    }
  };

  // TẦNG 2 (nhánh "có Cơ Hội May Mắn") — chuyển sang màn hình lựa chọn, chờ
  // đội trên /play (hoặc Host bấm hộ) CHỌN giữa 2 phần thưởng.
  const offerBonusChoice = useCallback(async () => {
    const s = stateRef.current;
    if (!s) return;
    try {
      await saveGameState(gameId, s.revision, {
        ...s,
        effect_type: "bonus_choice",
        effect_icon: "🍀",
        effect_label: "Cơ Hội May Mắn",
        effect_desc: "Chọn: nhận chắc +200 điểm, hay thử vận may bốc 1 lá phép?",
        effect_result: null,
        show_dice: false,
        show_eff_continue: false,
        eff_body_buttons: "bonus_choice",
        revision: s.revision + 1,
      }, s);
    } catch (err) {
      handleSaveConflict(err);
    }
  }, [gameId, handleSaveConflict]);

  // choice: 0 = nhận chắc +200đ, 1 = thử vận may bốc 1 lá phép. Tái dùng
  // nguyên kênh PLAYER_EFFECT_TARGET/targetIdx đã có cho steal/swap.
  const resolveBonusChoice = async (choice) => {
    if (choice === 1) {
      await pickAndApplyEffect();
    } else {
      await grantFlatBonus();
    }
  };

  // Lá "Cướp Điểm": bấm đội chỉ CHỌN mục tiêu (lưu steal_target_idx) rồi
  // chuyển sang chế độ xúc xắc — số điểm cướp đúng bằng mặt xúc xắc, áp dụng
  // ở confirmAndContinueDice (nhánh effect_type === "steal").
  const resolveSteal = async (targetIdx) => {
    const s = stateRef.current;
    const tms = teamsRef.current;
    if (!s || !tms[targetIdx]) return;
    const victim = tms[targetIdx];
    try {
      await saveGameState(gameId, s.revision, {
        ...s,
        steal_target_idx: targetIdx,
        effect_desc: `Cướp điểm từ ${victim.name} — tung xúc xắc, số điểm cướp đúng bằng điểm xúc xắc (tối đa ${victim.score}đ).`,
        effect_result: null,
        show_dice: true,
        dice_rolling: false,
        dice_value: null,
        dice_result_visible: false,
        eff_body_buttons: "dice",
        revision: s.revision + 1,
      }, s);
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
      // Chiếu animation đổi điểm NGAY khi đội được chọn (trên /play hoặc
      // Host bấm hộ) — không chờ bấm "Tiếp tục" nữa.
      playSound("meme-money");
      setScoreFx({
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
          if (!["steal", "swap", "bonus_choice"].includes(s.eff_body_buttons)) continue;
          if (s.show_eff_continue) continue; // Already resolved
          const { revision, targetIdx } = event.payload || {};
          if (revision !== s.revision) continue;
          const effectTeamKey = teamsRef.current[s.effect_team_idx]?.team_key;
          if (event.created_by !== effectTeamKey) continue;

          if (s.eff_body_buttons === "steal") await resolveSteal(targetIdx);
          if (s.eff_body_buttons === "swap") await resolveSwap(targetIdx);
          if (s.eff_body_buttons === "bonus_choice") await resolveBonusChoice(targetIdx);
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
      stopSound("timer-tick");
      if (result.kind === "reveal_fail") playSound("card-abandoned");
      else playSound("turn-pass");
      try {
        await saveGameState(gameId, s.revision, { ...result.patch, revision: s.revision + 1 }, s);
      } catch (err) {
        handleSaveConflict(err);
      }
    }, ms);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.deadline_at, state?.phase, gameId, handleSaveConflict]);

  // Đồng hồ cát tắt: phát sound tick đúng một lần khi còn đúng 7 giây của
  // lượt trả lời (hoặc ngay lập tức nếu host reload khi đã dưới 7 giây).
  useEffect(() => {
    if (!state?.deadline_at || state?.phase !== "answering") return undefined;
    const targetDeadline = state.deadline_at;
    const remaining = new Date(targetDeadline).getTime() - Date.now();
    if (remaining <= 0) return undefined;
    const delay = Math.max(0, remaining - 7000);
    const tickTimer = setTimeout(() => {
      const s = stateRef.current;
      if (!s || s.phase !== "answering" || s.deadline_at !== targetDeadline) return;
      playSound("timer-tick");
    }, delay);
    return () => {
      clearTimeout(tickTimer);
      // Rời khỏi lượt trả lời (đã chọn / hết giờ / bỏ lá) → ngắt tiếng tick
      // ngay lập tức thay vì để phát nốt hết file.
      stopSound("timer-tick");
    };
  }, [state?.deadline_at, state?.phase]);

  const openCard = async (num) => {
    const s = stateRef.current;
    const tms = teamsRef.current;
    if (!s) return;
    if (s.phase !== "selecting_card") {
      // Không im lặng: báo rõ lý do thẻ đang bị khoá để khỏi ngỡ là bug.
      setCardHint(
        s.active_card_num
          ? `Đang giữa lượt câu hỏi Lá số ${s.active_card_num} — hãy xử lý câu hỏi đang mở trước.`
          : "Đang xử lý lượt hiện tại — chờ chuyển về lượt chọn lá trước."
      );
      return;
    }
    const card = getCardByNumber(s.card_deck, num);
    if (!card) return;
    if ((s.used_card_numbers || []).includes(num)) {
      setCardHint(`Lá số ${num} đã được mở rồi.`);
      return;
    }
    playSound("card-flip");
    const startIdx = Number.isInteger(s.answering_team_idx) ? s.answering_team_idx : 0;
    const order = tms.map((_, i) => (startIdx + i) % tms.length);
    const firstTeam = tms[order[0]];
    try {
      await saveGameState(gameId, s.revision, {
        ...s,
        phase: "answering",
        active_card_num: num,
        active_card: card,
        attempt_order: order,
        attempt_idx: 0,
        answering_team_idx: order[0],
        answering_team_key: firstTeam?.team_key ?? null,
        answer_submission_team_key: null,
        option_states: card.options.map(() => ""),
        attempt_label: firstTeam?.name ?? "",
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

  // TẦNG 1 — luôn luôn xảy ra khi trả lời đúng: tung xúc xắc, cộng điểm ngay
  // theo mặt xúc xắc. Không đụng effect_deck/effect_cursor vì đây là thưởng
  // chắc-chắn-có, không phải bốc từ bộ 32 lá giới hạn. effect_type đánh dấu
  // "points_base" (khác "points" thường) để confirmAndContinueDice biết đây
  // là lượt xúc xắc bắt buộc cần xét thêm Tầng 2, phân biệt với một lượt xúc
  // xắc đến từ lá "rút điểm/trừ điểm" bốc được ở Tầng 2 (không xét lại nữa).
  const startGuaranteedDiceRoll = () => {
    const s = stateRef.current;
    const tms = teamsRef.current;
    if (!s || !tms.length) return;
    if (s.phase !== "explaining" || !s.answer_submission_team_key) return;

    const winnerIdx = tms.findIndex((t) => t.team_key === s.answer_submission_team_key);
    const effectDef = EFFECT_DEFINITIONS.find((d) => d.type === "points");

    // Bỏ qua animation lật bài — hiện popup "Rút Điểm May Mắn" ngay lập tức.
    setRevealingEffect(false);
    setDrawSeq((n) => n + 1);

    const patch = {
      ...s,
      phase: "resolving_effect",
      show_effect: true,
      show_dice: true,
      effect_type: "points_base",
      effect_icon: effectDef?.icon ?? "🎲",
      effect_label: "Rút Điểm May Mắn",
      effect_desc: effectDef?.desc ?? "Tung xúc xắc để nhận điểm.",
      effect_team_idx: winnerIdx < 0 ? 0 : winnerIdx,
      effect_result: null,
      effect_revealed: true,
      show_eff_continue: false,
      eff_body_buttons: "dice",
      revision: s.revision + 1,
    };
    saveGameState(gameId, s.revision, patch, s).catch(handleSaveConflict);
  };

  const confirmAndContinueDice = useCallback(async () => {
    const s = stateRef.current;
    const tms = teamsRef.current;
    if (!s || !s.show_dice) return;

    // Apply points
    const idx = s.effect_team_idx;

    // Lá "Cướp Điểm": mặt xúc xắc là số điểm cướp từ đội mục tiêu đã chọn
    // (steal_target_idx), tối đa điểm đội đó đang có. Chiếu ScoreFx ngay lúc
    // điểm đổi, lá bài ở lại để Host bấm "Tiếp tục" đóng lá.
    if (s.effect_type === "steal") {
      const victimIdx = s.steal_target_idx;
      const rolled = Math.max(0, s.dice_value ?? 0);
      const amount = Math.min(rolled, Math.max(0, tms[victimIdx]?.score ?? 0));
      const nextStealTeams = stealScore(tms, idx, victimIdx, rolled);
      try {
        await saveTeams(gameId, nextStealTeams);
        await saveGameState(gameId, s.revision, {
          ...s,
          effect_result: `${tms[idx]?.name} tung 🎲 ${rolled}, cướp ${amount} điểm từ ${tms[victimIdx]?.name}!`,
          show_eff_continue: true,
          eff_body_buttons: null,
          revision: s.revision + 1,
        }, s);
        playSound("steal");
        setScoreFx({
          key: Date.now(),
          type: "steal",
          amount,
          a: { name: tms[idx]?.name, color: tms[idx]?.color, before: tms[idx]?.score ?? 0, after: nextStealTeams[idx]?.score ?? 0 },
          b: { name: tms[victimIdx]?.name, color: tms[victimIdx]?.color, before: tms[victimIdx]?.score ?? 0, after: nextStealTeams[victimIdx]?.score ?? 0 },
        });
      } catch (err) {
        handleSaveConflict(err);
      }
      return;
    }

    const isSub = s.effect_type === "dice_subtract";
    const nextTeams = isSub ? subtractDiceScore(tms, idx, s.dice_value) : addDiceScore(tms, idx, s.dice_value);

    try {
      await saveTeams(gameId, nextTeams);
      if (s.effect_type === "points_base") {
        // TẦNG 2 — 50/50 ngẫu nhiên chỉ để quyết định "Cơ Hội May Mắn" có
        // xuất hiện hay không. Nếu có, đội (hoặc Host) sẽ CHỌN chứ không
        // random giữa +200đ và bốc lá phép (xem offerBonusChoice).
        if (Math.random() < 0.5) {
          await saveGameState(gameId, s.revision, closeCard(s, nextTeams), s);
        } else {
          await offerBonusChoice();
        }
      } else {
        // Xúc xắc này đến từ 1 lá "rút điểm/trừ điểm" bốc được ở Tầng 2 —
        // đóng lá luôn, không xét lại Tầng 2 (chỉ 1 lần/câu trả lời đúng).
        await saveGameState(gameId, s.revision, closeCard(s, nextTeams), s);
      }
    } catch (err) {
      handleSaveConflict(err);
    }
  }, [gameId, handleSaveConflict, offerBonusChoice]);

  // Đội được chọn lá tiếp theo luôn xoay vòng cố định (xem closeCard) — thắng
  // hiệu ứng không còn nghĩa là được chơi tiếp.
  const continueAfterEffect = async () => {
    const s = stateRef.current;
    const tms = teamsRef.current;
    if (!s) return;
    const next = closeCard(s, tms);
    try {
      await saveGameState(gameId, s.revision, next, s);
    } catch (err) {
      handleSaveConflict(err);
    }
  };

  // Nút "Tiếp tục" khi ở phase closing_card (cả 3 đội đều sai / hết giờ, đáp
  // án đúng đã được tiết lộ) — không có hiệu ứng gì để bốc, chỉ đóng lá.
  const continueAfterReveal = async () => {
    const s = stateRef.current;
    const tms = teamsRef.current;
    if (!s) return;
    try {
      await saveGameState(gameId, s.revision, closeCard(s, tms), s);
    } catch (err) {
      handleSaveConflict(err);
    }
  };

  const finishGame = async () => {
    const s = stateRef.current;
    const tms = teamsRef.current;
    if (!s || !tms.length) return;
    const ranked = [...tms].sort((a, b) => b.score - a.score);
    playSound("victory");
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
        active_card: null,
        attempt_order: [],
        attempt_idx: 0,
        answering_team_idx: 0,
        answering_team_key: firstTeam?.team_key ?? null,
        answer_submission_team_key: null,
        option_states: [],
        attempt_label: "",
        deadline_at: null,
        show_effect: false,
        effect_type: null,
        effect_icon: null,
        effect_label: null,
        effect_desc: null,
        effect_team_idx: null,
        effect_result: null,
        show_eff_continue: false,
        eff_body_buttons: null,
        steal_target_idx: null,
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
              <br />
              <span className="masthead-retry-hint">
                Sẽ tự thử lại sau 5 giây khi mạng hồi phục…
              </span>
            </div>
            <button type="button" onClick={retryNow} style={{ marginTop: 12 }}>
              Thử lại ngay
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!state || !teams.length) return null;

  const activeCard = state.active_card_num ? getCardByNumber(state.card_deck, state.active_card_num) : null;
  const selectingTeam = teams[state.answering_team_idx ?? 0] ?? teams[0];
  const totalCards = state.card_deck.length;

  return (
    <div className="host-wrap">
      {/* Toast hướng dẫn (không chặn): lý do thẻ bị khoá / lượt kẹt đã tự đóng */}
      {cardHint && (
        <div className="deco-toast" role="status" data-purpose="host-toast">
          <span className="material-symbols-outlined deco-toast-icon">info</span>
          <span className="deco-toast-text">{cardHint}</span>
        </div>
      )}

      {/* ========== HEADER ART DECO (Task 2) ========== */}
      <header className="art-deco-header">
        {/* Crest chưởng hoàng gia */}
        <div className="deco-crest">
          <div className="deco-crest-inner">
            <div className="deco-crest-frame" />
            <span className="material-symbols-outlined text-gold-deco deco-crown">crown</span>
          </div>
        </div>

        {/* Tiêu đề chính */}
        <div className="deco-title-block">
          <h1 className="font-playfair deco-title">THỬ VẬN MAY</h1>
          <div className="deco-subtitle font-marcellus">XÚC XÁC · LÁ PHÉP · 35 CÂU HỎI</div>
        </div>

        {/* Badge giải đấu */}
        <div className="deco-badge">
          <span className="deco-badge-star">★</span>
          <span className="deco-badge-text">GRAND TOURNAMENT</span>
          <span className="deco-badge-star">★</span>
        </div>

      </header>

      {/* ===== TOOLBAR: badge đếm lá + quick-action bar (Task 3) ===== */}
      <div className="deco-toolbar">
        {/* Badge trái: số lượng lá */}
        <div className="deco-card-count-badge">
          <span className="deco-card-count-mark">◆</span>
          <span className="deco-card-count-text">
            <span className="deco-card-count-num font-playfair">{totalCards}</span>
            <span className="deco-card-count-label">Lá Thẻ Bài</span>
          </span>
          <span className="deco-card-count-hint font-marcellus">Bấm thẻ vàng để mở</span>
        </div>

        {/* Legend nhóm câu hỏi + legend 9 hiệu ứng — chip trắng viền gold.
            Bộ câu hỏi chỉ còn MỘT nhóm (chủ đề gia đình trong thời kỳ quá độ)
            nên chỉ có đúng 1 chip nhóm. */}
        <div className="deco-legend-category">
          <span className="deco-category-chip" style={{ background: CAT_COLOR[QUESTION_CAT], color: '#fff' }}>
            {CAT_NAME[QUESTION_CAT]}
          </span>
        </div>

        <div className="deco-legend-effects">
          {EFFECT_DEFINITIONS.map((def) => (
            <span key={def.type} className="deco-effect-chip">
              <span className="deco-effect-dot" style={{ background: EFFECT_COLORS[def.type] }} />
              <span className="deco-effect-label">
                {def.icon} {def.label}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Quick-action bar: 9 nút test effect → pill trắng viền #c5ad7a */}
      <div className="deco-quick-actions" data-purpose="quick-actions">
        {EFFECT_DEFINITIONS.map((def) => (
          <button
            key={def.type}
            type="button"
            className="deco-quick-action-btn"
            onClick={() => pickAndApplyEffect(def.type)}
            disabled={state.phase !== "selecting_card" && state.phase !== "explaining"}
            title={`Test hiệu ứng: ${def.label}`}
          >
            <span className="deco-quick-action-dot" style={{ background: EFFECT_COLORS[def.type] }} />
            <span className="deco-quick-action-label">
              {def.icon} {def.label}
            </span>
          </button>
        ))}
      </div>

      <div className="board">
        {state.card_deck.map((c) => {
          const used = (state.used_card_numbers || []).includes(c.num);
          // Biểu tượng góc trên xoay vòng theo (n-1) % 3: ◆ / ✦ / ★
          const cornerIdx = (c.num - 1) % 3;
          const cornerMark = cornerIdx === 0 ? '◆' : cornerIdx === 1 ? '✦' : '★';
          return (
            <div
              key={c.num}
              className={"art-deco-token ncard" + (used ? " used" : "")}
              style={{ "--cat-color": CAT_COLOR[c.cat] }}
              onClick={() => !used && openCard(c.num)}
              role="button"
              aria-label={`Thẻ số ${c.num}`}
              aria-disabled={used}
            >
              {/* Góc trên: số nhỏ + ký hiệu */}
              <span className="art-deco-token-corner">
                <span className="art-deco-token-corner-mark">{cornerMark}</span>
              </span>

              {/* Số lớn chính giữa */}
              <span className="art-deco-token-num">{c.num}</span>

              {/* Góc dưới: bản sao rotate-180 */}
              <span className="art-deco-token-corner art-deco-token-corner-bottom">
                <span className="art-deco-token-corner-mark">{cornerMark}</span>
              </span>

              {/* Kết quả sau khi mở */}
              {used && (
                <span className="art-deco-token-done" title="Đã mở">✓</span>
              )}
            </div>
          );
        })}
      </div>        <div className="panel">
        {/* ===== SCOREBOARD BẢNG ĐIỂM XẾP HẠNG (Task 5) ===== */}
        <div className="art-deco-scoreboard">
          <div className="scoreboard-header">
            <div className="scoreboard-icon">
              <span className="material-symbols-outlined text-gold-deco">workspace_premium</span>
            </div>
            <h2 className="scoreboard-title font-playfair">BẢNG ĐIỂM XẾP HẠNG</h2>
            <div className="scoreboard-badge" data-team-count={teams.length}>
              <span className="scoreboard-badge-num font-playfair">{teams.length}</span>
              <span className="scoreboard-badge-text">Đội</span>
            </div>
          </div>

          <div className="scoreboard-divider" />

          {/* Row đội: giữ rankedTeams, input sửa tên, .active = lượt chơi */}
          {rankedTeams
            .map(({ t, i }) => {
              const isCurrentTurn = i === (state.answering_team_idx ?? 0);
              const rank = i + 1;
              return (
                <div
                  key={t.team_key}
                  className={"scoreboard-row" + (isCurrentTurn ? " active" : "")}
                >
                  {/* Rank badge tròn */}
                  <span className={"scoreboard-rank-badge rank-" + rank}>
                    {rank}
                  </span>

                  {/* Thanh màu dọc team */}
                  <span className="scoreboard-team-bar" style={{ background: t.color }} />

                  {/* Tên đội + input sửa */}
                  <input
                    type="text"
                    className="scoreboard-team-name font-bold"
                    value={t.name}
                    onChange={(e) => updateTeamName(i, e.target.value)}
                    aria-label="Tên đội"
                  />

                  {/* Score Playfair màu team */}
                  <span className="scoreboard-score font-playfair" style={{ color: t.color }}>
                    {t.score}
                    <span className="scoreboard-score-suffix">pts</span>
                  </span>

                  {/* Badge lượt chơi hiện tại (chỉ khi .active) */}
                  {isCurrentTurn && (
                    <span className="scoreboard-current-turn-badge">
                      Lượt chơi hiện tại
                    </span>
                  )}
                </div>
              );
            })}
        </div>

        {/* ===== GAME CONTROLLER ĐIỀU KHIỂN VÁN CHƠI (Task 6) ===== */}
        <div className="art-deco-controller art-deco-frame">
          {/* Header section */}
          <div className="controller-header">
            <div className="controller-header-icon">
              <span className="material-symbols-outlined text-gold-deco">tune</span>
            </div>
            <h2 className="controller-header-title font-marcellus">
              ĐIỀU KHIỂN VÁN CHƠI
            </h2>
          </div>

          <div className="controller-divider" />

          {/* ═══ Card Lượt chơi (dark metal double gold) ═══ */}
          <div className="host-metal-card turn-card">
            <div className="turn-showcase">
              <div className="turn-showcase-icon">
                <span className="material-symbols-outlined" style={{ color: 'rgba(229,190,101,0.7)', fontSize: '22px' }}>schedule</span>
              </div>
              <div className="turn-showcase-label font-marcellus">
                LƯỢT BỐC LÁ BÀI HIỆN TẠI
              </div>
              <div className="turn-showcase-team">
                <span className="turn-showcase-dot" style={{ background: selectingTeam?.color ?? 'var(--gold-primary)' }} />
                <span className="turn-showcase-name font-playfair">{selectingTeam?.name ?? '—'}</span>
              </div>
              <div className="turn-showcase-crest">
                <span className="material-symbols-outlined" style={{ opacity: 0.05, fontSize: '72px' }}>casino</span>
              </div>
            </div>
          </div>

          {/* ═══ Card Mã PIN (ivory metal double gold) ═══ */}
          <div className="host-metal-card pin-card">
            <div className="pin-vault">
              <div className="pin-vault-label-row">
                <span className="material-symbols-outlined text-gold-deco pin-vault-icon" style={{ fontSize: '18px' }}>vpn_key</span>
                <span className="pin-vault-label font-marcellus">MÃ PIN PHÒNG / BẢO MẠT MÁY CHỦ</span>
              </div>
              <div className="pin-vault-value">
                <span className="pin-vault-prefix font-marcellus">PIN:</span>
                <span className="pin-vault-code font-playfair">{gamePin ?? '…'}</span>
              </div>
            </div>
          </div>

          {/* Nút giải đấu */}
          <div className="controller-actions">
            <button className="controller-btn-primary" onClick={finishGame}>
              <span className="material-symbols-outlined controller-btn-icon">workspace_premium</span>
              <span className="controller-btn-text">Kết Thúc &amp; Xếp Hạng Giải Đấu</span>
            </button>
            <button className="controller-btn-ghost" onClick={resetGame}>
              <span className="material-symbols-outlined controller-btn-icon">refresh</span>
              <span className="controller-btn-text">Khởi Tạo Ván Mới</span>
            </button>
          </div>

          {/* BGM block */}
          <div className="bgm-block">
            <div className="bgm-block-inner">
              <span className="material-symbols-outlined bgm-block-icon" style={{ fontSize: '20px' }}>volume_up</span>
              <span className="bgm-block-label font-marcellus">NHẠC NỀN</span>
            </div>
            <button
              type="button"
              className={"bgm-toggle-btn" + (bgm.enabled ? " on" : "")}
              onClick={bgm.toggle}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                {bgm.enabled ? 'volume_up' : 'volume_off'}
              </span>
              <span className="bgm-toggle-text">{bgm.enabled ? 'Đang Bật' : 'Đang Tắt'}</span>
            </button>
            <div className="bgm-slider-wrap">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={bgm.volume}
                onChange={(e) => bgm.setVolume(Number(e.target.value))}
                className="bgm-art-slider"
                aria-label="Th控件 nhạc nền"
              />
              <span className="bgm-volume-pct font-marcellus">{Math.round(bgm.volume * 100)}%</span>
            </div>
          </div>

    
         
        </div>
      </div>


      {/* ===== QUESTION OVERLAY ART DECO (Task 7) ===== */}
      <div className="art-deco-overlay" data-show={activeCard ? "true" : "false"}>
        {activeCard && (
          <div className="art-deco-question-card art-deco-frame">
            {/* Corner inlay */}
            <span className="deco-corner deco-corner-tl" />
            <span className="deco-corner deco-corner-tr" />
            <span className="deco-corner deco-corner-bl" />
            <span className="deco-corner deco-corner-br" />

            {/* Eyebrow chip dark */}
            <div className="question-eyebrow">
              <span className="question-eyebrow-category">{CAT_NAME[activeCard.cat]}</span>
              <span className="question-eyebrow-sep">·</span>
              <span className="question-eyebrow-num">Lá số {activeCard.num}</span>
            </div>

            <div className="question-title">{activeCard.q}</div>

            <div className="question-attempt-label">
              <span>Lượt trả lời:</span>
              <span>{state.attempt_label}</span>
            </div>

            <div className="question-options">
              {activeCard.options.map((opt, i) => (
                <button
                  key={i}
                  className={"question-opt-btn" + (state.option_states[i] ? " " + state.option_states[i] : "")}
                  disabled={true}
                  style={{ opacity: state.option_states[i] ? 1 : 0.75 }}
                >
                  {opt}
                  {state.option_states[i] === "correct" && " ✓"}
                  {state.option_states[i] === "wrong" && " ✗"}
                </button>
              ))}
            </div>

            {state.phase === "answering" && (
              <details className="question-manual-entry">
                <summary>Nhập thủ công (khi Play không kết nối)</summary>
                <div className="question-manual-grid">
                  {activeCard.options.map((opt, i) => (
                    <button
                      key={i}
                      className={"question-opt-btn" + (state.option_states[i] ? " " + state.option_states[i] : "")}
                      disabled={state.option_states[i] !== ""}
                      onClick={() => applyAnswer(i)}
                    >
                      {String.fromCharCode(65 + i)}: {opt.substring(0, 30)}...
                    </button>
                  ))}
                </div>
              </details>
            )}

            {state.phase === "explaining" && state.answer_submission_team_key && (
              <div className="question-actions">
                <button className="question-btn-primary" onClick={startGuaranteedDiceRoll}>
                  <span className="material-symbols-outlined question-btn-icon">casino</span>
                  Tung xúc xắc may mắn
                </button>
              </div>
            )}

            {state.phase === "closing_card" && (
              <div className="question-actions">
                <button className="question-btn-ghost" onClick={continueAfterReveal}>
                  Tiếp tục
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
          onPickTarget={(targetIdx) => {
            if (state.eff_body_buttons === "steal") return resolveSteal(targetIdx);
            if (state.eff_body_buttons === "swap") return resolveSwap(targetIdx);
            return resolveBonusChoice(targetIdx);
          }}
          onRollDice={rollDice}
          onConfirmDice={confirmAndContinueDice}
        />
      )}

      {/* Score animation overlay (swap/steal) — cosmetic, auto-dismisses */}
      {scoreFx && <ScoreFx key={scoreFx.key} fx={scoreFx} />}

      {/* Winner Overlay — cinematic podium */}
      {state.show_winner && (
        <WinnerPodium
          rankList={state.rank_list || []}
          onClose={closeWinner}
          onNewGame={resetGame}
        />
      )}

      {/* Meme Drop Overlay */}
      <MemeDrop activeMemes={activeMemes} />
    </div>
  );
}
