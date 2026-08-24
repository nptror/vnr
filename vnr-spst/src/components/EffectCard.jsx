import { useEffect, useRef, useState } from 'react'
import { rotationForDiceValue } from '../game/transitions'
import { EFFECT_COLORS } from '../game/catalog'

const SUSPENSE_MS = 1500
const FLIP_MS = 800
const HOLD_MS = 700

export const REVEAL_TOTAL_MS = SUSPENSE_MS + FLIP_MS + HOLD_MS

// Thời điểm mặt trước bắt đầu lật — Host dùng để đồng bộ sound card-flip.
export const FLIP_AT_MS = SUSPENSE_MS

const FACE_REVEAL_AT = SUSPENSE_MS + FLIP_MS
const CONFETTI_COLORS = ['#c9a227', '#7a2430', '#3F5D45', '#1F4E66', '#f4d47c']
const CONFETTI_COUNT = 10

function buildConfetti() {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => {
    const theta = (i / CONFETTI_COUNT) * Math.PI * 2 + Math.random() * 0.6
    const radius = 160 + Math.random() * 110
    return {
      '--dx': `${Math.round(Math.cos(theta) * radius)}px`,
      '--dy': `${Math.round(Math.sin(theta) * radius - 50)}px`,
      '--c': CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    }
  })
}

function DiceCube({ state }) {
  const cubeRef = useRef(null);
  const wrapperRef = useRef(null);
  const shadowRef = useRef(null);
  const rollingSeenRef = useRef(null);
  const replayedValueRef = useRef(null);
  const replayTimerRef = useRef(null);

  useEffect(() => {
    if (!state) return undefined;
    if (state.dice_rolling) {
      rollingSeenRef.current = state.dice_value;
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

      if (state.dice_value == null) {
        rollingSeenRef.current = null;
        replayedValueRef.current = null;
      } else if (
        state.dice_result_visible &&
        replayedValueRef.current !== state.dice_value &&
        rollingSeenRef.current !== state.dice_value
      ) {
        replayedValueRef.current = state.dice_value;
        const value = state.dice_value;
        const [rx, ry] = rotationForDiceValue(value);
        const cube = cubeRef.current;
        if (cube) {
          cube.style.transition = "none";
          cube.style.transform = "rotateX(0deg) rotateY(0deg)";
          void cube.offsetHeight;
          cube.style.transitionDuration = "700ms";
          cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
        }
        if (wrapperRef.current) wrapperRef.current.classList.add("dice-bouncing");
        if (shadowRef.current) shadowRef.current.classList.add("shadow-rolling");
        clearTimeout(replayTimerRef.current);
        replayTimerRef.current = setTimeout(() => {
          if (wrapperRef.current) wrapperRef.current.classList.remove("dice-bouncing");
          if (shadowRef.current) shadowRef.current.classList.remove("shadow-rolling");
          if (cubeRef.current) cubeRef.current.style.transitionDuration = "";
        }, 750);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.dice_rolling, state?.dice_value]);

  useEffect(() => () => clearTimeout(replayTimerRef.current), []);

  return (
    <div className="dice-scene">
      <div className="dice-wrapper" ref={wrapperRef}>
        <div className="dice-cube" ref={cubeRef}>
          <div className="dice-face front">100</div>
          <div className="dice-face back">1000</div>
          <div className="dice-face right">500</div>
          <div className="dice-face left">200</div>
          <div className="dice-face top">300</div>
          <div className="dice-face bottom">600</div>
        </div>
      </div>
      <div className="dice-shadow" ref={shadowRef} />
    </div>
  );
}

// Một form duy nhất cho cả 6 loại hiệu ứng: banner màu theo loại → emblem
// icon → mô tả → dock hành động cố định ở đáy lá. Nội dung dock đổi theo hiệu
// ứng nhưng kích thước và cấu trúc lá luôn giống hệt nhau.
export default function EffectCard({
  state,
  teams,
  teamName,
  animate = false,
  onContinue,
  onPickTarget,
  onRollDice,
  onConfirmDice,
}) {
  const [dismissed, setDismissed] = useState(false);
  const [playFx] = useState(() => animate);

  const confetti = buildConfetti();
  const resolved = Boolean(state.show_eff_continue);
  const dicePendingRoll =
    state.eff_body_buttons === "dice" && !state.dice_rolling && !state.dice_result_visible;
  const diceHasResult = state.eff_body_buttons === "dice" && state.dice_result_visible;
  const needsTarget =
    (state.eff_body_buttons === "steal" || state.eff_body_buttons === "swap") && !resolved;
  const fxColor = EFFECT_COLORS[state.effect_type] ?? '#c9a227';

  // ✕ chỉ ẩn tạm khi chưa có kết quả; khi xúc xắc tung hoặc đội chọn mục tiêu
  // xong, lá bài tự hiện lại để lộ kết quả.
  if (dismissed && !resolved && !state.dice_rolling && !diceHasResult) return null;

  return (
    <>
      <style>{STYLE}</style>
      <div className="er-overlay">
        <div className={`er-stage${playFx ? " er-animate" : ""}`}>
          {playFx && <div className="er-burst" />}
          {playFx && (
            <div className="er-confetti">
              {confetti.map((vars, i) => (
                <span key={i} style={vars} />
              ))}
            </div>
          )}
          <div className="er-lift">
            <div className={`er-card${playFx ? "" : " er-show-front"}`}>
              <div className="er-face er-face--back">
                <div className="er-back-frame" />
                <div className="er-back-shine" />
                <div className="er-back-mark">?</div>
              </div>
              <div className="er-face er-face--front" style={{ '--fx': fxColor }}>
                {!resolved && !diceHasResult && (
                  <button
                    type="button"
                    aria-label="Ẩn lá bài"
                    className="er-close"
                    onClick={() => setDismissed(true)}
                  >
                    ✕
                  </button>
                )}

                <div className="er-banner">
                  {teams[state.effect_team_idx]?.color && (
                    <span
                      className="er-team-dot"
                      style={{ background: teams[state.effect_team_idx]?.color }}
                    />
                  )}
                  <span>
                    <span className="er-eyebrow">Đội {teamName ?? '???'} bốc được</span>
                    <span className="er-title">{state.effect_label}</span>
                  </span>
                </div>

                <div className="er-art">
                  <span className="er-icon">{state.effect_icon}</span>
                </div>

                <div className="er-desc">{state.effect_desc}</div>

                <div className="er-dock">
                  {state.eff_body_buttons === "dice" && (
                    <>
                      <DiceCube state={state} />
                      {dicePendingRoll && (
                        <div className="er-note">
                          <div>Đang chờ Đội {teamName} tung xúc xắc…</div>
                          <div className="er-actions">
                            <button type="button" className="host-btn ghost" onClick={onRollDice}>
                              🎲 Tung hộ
                            </button>
                            <button type="button" className="host-btn ghost" onClick={onContinue}>
                              Đóng
                            </button>
                          </div>
                        </div>
                      )}
                      {diceHasResult && (
                        <div className="er-note">
                          <div
                            className={`er-dice-line ${
                              state.effect_type === "dice_subtract" ? "down" : "up"
                            }`}
                          >
                            🎲 {state.dice_value} — {teamName}{" "}
                            {state.effect_type === "dice_subtract" ? "−" : "+"}
                            {state.dice_value} điểm!
                          </div>
                          <div className="er-actions">
                            <button type="button" className="dice-roll-btn" onClick={onConfirmDice}>
                              Tiếp tục
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {needsTarget && (
                    <>
                      <div className="er-hint">
                        Đang chờ Đội {teamName} chọn mục tiêu trên điện thoại — hoặc chọn hộ:
                      </div>
                      <div className="er-targets">
                        {teams.map(
                          (t, i) =>
                            i !== state.effect_team_idx && (
                              <button
                                key={t.team_key}
                                type="button"
                                style={{ background: t.color }}
                                onClick={() => onPickTarget(i)}
                              >
                                {state.eff_body_buttons === "steal"
                                  ? `Cướp hộ từ ${t.name} (${t.score}đ)`
                                  : `Đổi hộ với ${t.name} (${t.score}đ)`}
                              </button>
                            )
                        )}
                      </div>
                    </>
                  )}

                  {state.effect_result && <div className="er-result">{state.effect_result}</div>}

                  {resolved && (
                    <button type="button" className="host-btn er-continue" onClick={onContinue}>
                      Tiếp tục
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

const STYLE = `
  .er-overlay {
    position: fixed; inset: 0; z-index: 120;
    display: flex; align-items: center; justify-content: center;
    background: rgba(20,16,10,0.55);
    backdrop-filter: blur(2px);
    padding: 20px;
    animation: er-overlay-in 220ms ease-out;
  }
  @keyframes er-overlay-in { from { opacity: 0; } }

  .er-stage {
    position: relative;
    perspective: 1400px;
    width: min(400px, 94vw);
  }

  .er-animate .er-lift {
    animation: er-suspense ${SUSPENSE_MS}ms cubic-bezier(0.34, 1.2, 0.5, 1) both;
  }
  @keyframes er-suspense {
    0%   { transform: translateY(70px) scale(0.5); opacity: 0; }
    20%  { transform: translateY(-16px) scale(1.06); opacity: 1; }
    34%  { transform: translateY(0) scale(0.99) rotate(-2.5deg); }
    48%  { transform: rotate(2.5deg) scale(1.005); }
    62%  { transform: rotate(-3.5deg) scale(1.01); }
    76%  { transform: rotate(3.5deg) scale(1.015); }
    88%  { transform: rotate(-1.5deg) scale(1.02); }
    100% { transform: rotate(0deg) scale(1); }
  }

  .er-card {
    position: relative;
    width: 100%;
    height: clamp(480px, calc(100vh - 110px), 600px);
    transform-style: preserve-3d;
  }
  .er-animate .er-card {
    animation: er-flip ${FLIP_MS}ms cubic-bezier(0.35, 0.05, 0.2, 1) ${SUSPENSE_MS}ms forwards;
  }
  @keyframes er-flip {
    from { transform: rotateY(0deg); }
    to   { transform: rotateY(180deg); }
  }

  /* Reload giữa chừng: không phát lại animation — lá hiển thị sẵn mặt trước */
  .er-card.er-show-front { transform: rotateY(180deg); }

  .er-face {
    border-radius: 18px;
    backface-visibility: hidden;
    display: flex; flex-direction: column;
    box-shadow: 0 18px 44px rgba(0,0,0,0.45);
  }

  .er-face--back {
    position: absolute; inset: 0;
    background:
      repeating-linear-gradient(45deg, rgba(244,212,124,0.09) 0 12px, transparent 12px 24px),
      linear-gradient(160deg, #7a2430, #43121c 72%);
    border: 3px double #f4d47c;
    align-items: center; justify-content: center;
  }
  .er-back-frame {
    position: absolute; inset: 12px;
    border: 1px solid rgba(244,212,124,0.55);
    border-radius: 12px;
  }
  .er-back-mark {
    font-family: 'Noto Serif', serif;
    font-size: 130px; font-weight: 700; font-style: italic;
    color: #f4d47c;
    text-shadow: 0 4px 0 rgba(0,0,0,0.35);
    animation: er-mark-pulse 550ms ease-in-out infinite alternate;
  }
  @keyframes er-mark-pulse {
    from { opacity: 0.75; transform: scale(0.97); }
    to   { opacity: 1; transform: scale(1.07); }
  }
  .er-back-shine {
    position: absolute; inset: 0;
    border-radius: 18px;
    overflow: hidden;
    pointer-events: none;
  }
  .er-back-shine::after {
    content: '';
    position: absolute; top: -25%; bottom: -25%;
    width: 46px; left: -80px;
    background: linear-gradient(105deg, transparent, rgba(255,240,200,0.30), transparent);
    transform: skewX(-18deg);
    animation: er-shine 850ms ease-in-out 2;
  }
  @keyframes er-shine { to { left: 460px; } }

  /* ── Mặt trước: banner màu → emblem icon → desc → dock hành động ── */
  .er-face--front {
    position: relative;
    transform: rotateY(180deg);
    background: #fdfbf7;
    border: 3px double #141b2c;
    border-top: none;
    overflow: hidden;
  }

  .er-close {
    position: absolute; top: 8px; right: 10px;
    z-index: 2;
    width: 28px; height: 28px;
    border-radius: 9999px;
    border: 1px solid rgba(255,255,255,0.55);
    background: rgba(20,27,44,0.22);
    color: #fff;
    font-size: 14px; line-height: 1;
    cursor: pointer;
  }
  .er-close:hover { background: rgba(20,27,44,0.45); }

  .er-banner {
    flex-shrink: 0;
    display: flex; align-items: center; gap: 10px;
    background: var(--fx, #c9a227);
    color: #fff;
    padding: 14px 44px 14px 18px;
    box-shadow: inset 0 -4px 0 rgba(0,0,0,0.18);
  }
  .er-eyebrow {
    display: block;
    font-family: 'Noto Sans', sans-serif;
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.14em; text-transform: uppercase;
    opacity: 0.85;
  }
  .er-title {
    display: block;
    font-family: 'Noto Serif', serif;
    font-weight: 700;
    font-size: 24px; line-height: 1.15;
  }
  .er-team-dot {
    width: 13px; height: 13px; border-radius: 9999px;
    border: 2px solid rgba(255,255,255,0.65);
    flex-shrink: 0;
  }

  .er-art {
    flex-shrink: 0;
    margin: 26px auto 0;
    width: 118px; height: 118px;
    border-radius: 9999px;
    background: #faf8ff;
    border: 3px double var(--fx, #c9a227);
    display: flex; align-items: center; justify-content: center;
  }
  .er-icon {
    font-size: 62px; line-height: 1;
  }

  .er-desc {
    flex-shrink: 0;
    padding: 16px 30px 0;
    text-align: center;
    font-size: 17px; line-height: 1.5;
    color: #6b6455;
  }

  .er-dock {
    margin-top: auto;
    min-height: 172px;
    max-height: 46%;
    width: 100%;
    display: flex; flex-direction: column;
    align-items: stretch; justify-content: center;
    gap: 10px;
    padding: 14px 18px;
    background: #f7f3e8;
    border-top: 2px dashed #d8d2c2;
    overflow-y: auto;
  }

  .er-note { text-align: center; display: flex; flex-direction: column; gap: 12px; }
  .er-note > div:first-child { color: #887272; font-style: italic; font-size: 16px; }
  .er-actions {
    display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;
  }
  .er-actions .host-btn { padding: 8px 18px; font-size: 16px; }

  .er-dice-line { font-size: 25px; font-weight: 700; }
  .er-dice-line.up { color: #3F5D45; }
  .er-dice-line.down { color: #9B2335; }

  .er-hint {
    font-style: italic; color: #887272; font-size: 15px;
    text-align: center;
  }
  .er-targets {
    display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%;
  }
  .er-targets button {
    border: none; color: #fff; padding: 9px 8px;
    font-size: 13px; font-weight: bold; border-radius: 6px; cursor: pointer;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .er-result {
    font-weight: 600; font-size: 19px; text-align: center; color: #141b2c;
  }
  .er-continue { margin-top: 2px; }

  .er-burst {
    position: absolute; top: 40%; left: 50%;
    width: 60px; height: 60px; margin: -30px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,236,170,0.95), rgba(255,236,170,0) 70%);
    opacity: 0;
    pointer-events: none;
    animation: er-flash 520ms ease-out ${FACE_REVEAL_AT}ms forwards;
  }
  @keyframes er-flash {
    0%   { opacity: 0; transform: scale(0.4); }
    30%  { opacity: 0.95; }
    100% { opacity: 0; transform: scale(9); }
  }

  .er-confetti span {
    position: absolute; top: 40%; left: 50%;
    width: 9px; height: 13px;
    border-radius: 2px;
    background: var(--c);
    opacity: 0;
    z-index: 3;
    animation: er-confetti-fly 720ms cubic-bezier(0.15, 0.6, 0.4, 1) ${FACE_REVEAL_AT + 40}ms forwards;
  }
  @keyframes er-confetti-fly {
    0%   { opacity: 0; transform: translate(0, 0) rotate(0deg) scale(0.4); }
    20%  { opacity: 1; }
    100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(420deg) scale(1); }
  }

  .er-animate .er-banner {
    opacity: 0;
    animation: er-rise 480ms ease-out ${FACE_REVEAL_AT - 250}ms forwards;
  }
  .er-animate .er-icon {
    opacity: 0;
    animation: er-pop 520ms cubic-bezier(0.34, 1.56, 0.64, 1) ${FACE_REVEAL_AT - 150}ms forwards;
  }
  @keyframes er-pop {
    0%   { opacity: 0; transform: scale(0.2) rotate(-14deg); }
    60%  { opacity: 1; transform: scale(1.18) rotate(4deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  .er-animate .er-desc {
    opacity: 0;
    animation: er-rise 500ms ease-out ${FACE_REVEAL_AT - 60}ms forwards;
  }
  .er-animate .er-dock {
    opacity: 0;
    animation: er-rise 520ms ease-out ${FACE_REVEAL_AT + 140}ms forwards;
  }
  @keyframes er-rise {
    0%   { opacity: 0; transform: translateY(12px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  .dice-scene {
    perspective: 1000px;
    width: 96px; height: 96px;
    margin: 2px auto;
    position: relative;
    flex-shrink: 0;
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
    font-size: 28px; font-weight: bold;
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
    font-size: 19px; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase;
    padding: 0.65rem 2rem;
    border: none; cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .dice-roll-btn:hover { transform: translateY(2px); box-shadow: 0 0 0 2px #141b2c; }

  @media (max-width: 640px), (max-height: 720px) {
    .er-card { height: clamp(430px, calc(100vh - 70px), 520px); }
    .er-art { width: 92px; height: 92px; margin-top: 16px; }
    .er-icon { font-size: 46px; }
    .er-title { font-size: 20px; }
    .er-desc { font-size: 15px; padding: 12px 22px 0; }
    .er-dock { min-height: 140px; padding: 10px 12px; }
    .er-back-mark { font-size: 90px; }
  }
`
