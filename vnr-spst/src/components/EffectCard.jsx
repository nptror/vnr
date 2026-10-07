import { memo, useEffect, useRef, useState } from 'react'
import { rotationForDiceValue } from '../game/transitions'
import { EFFECT_COLORS } from '../game/catalog'
import './EffectCardArtDeco.css'

const SUSPENSE_MS = 1500
const FLIP_MS = 800
const HOLD_MS = 700

export const REVEAL_TOTAL_MS = SUSPENSE_MS + FLIP_MS + HOLD_MS

// Thời điểm mặt trước bắt đầu lật — Host dùng để đồng bộ sound card-flip.
export const FLIP_AT_MS = SUSPENSE_MS

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
          <div className="dice-face back">400</div>
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
function EffectCard({
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

  // Dựng đúng một lần khi mount (mẫu của WinnerPodium): gọi thẳng trong render
  // tạo 10 object --dx/--dy/--c mới mỗi lần → React ghi lại inline style của
  // 10 <span> → animation er-confetti-fly restart từ đầu mỗi re-render
  // (12 lần/phút khi Host poll).
  const [confetti] = useState(() => buildConfetti());
  const resolved = Boolean(state.show_eff_continue);
  const dicePendingRoll =
    state.eff_body_buttons === "dice" && !state.dice_rolling && !state.dice_result_visible;
  const diceHasResult = state.eff_body_buttons === "dice" && state.dice_result_visible;
  const needsTarget =
    (state.eff_body_buttons === "steal" || state.eff_body_buttons === "swap") && !resolved;
  const needsBonusChoice = state.eff_body_buttons === "bonus_choice" && !resolved;
  const fxColor = EFFECT_COLORS[state.effect_type] ?? '#c9a227';

  // ✕ chỉ ẩn tạm khi chưa có kết quả; khi xúc xắc tung hoặc đội chọn mục tiêu
  // xong, lá bài tự hiện lại để lộ kết quả.
  if (dismissed && !resolved && !state.dice_rolling && !diceHasResult) return null;

  return (
    <>

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
                    <span className="er-eyebrow">{teamName ?? 'Đội ???'} bốc được</span>
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
                      <div className="er-dice-wrap">
                        <DiceCube state={state} />
                      </div>
                      {dicePendingRoll && (
                        <div className="er-note">
                          <div>Đang chờ {teamName} tung xúc xắc…</div>
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
                            {state.effect_type === "steal"
                              ? `🎲 ${state.dice_value} — ${teamName} sẽ cướp từ ${teams[state.steal_target_idx]?.name ?? "?"}!`
                              : `🎲 ${state.dice_value} — ${teamName} ${
                                  state.effect_type === "dice_subtract" ? "−" : "+"
                                }${state.dice_value} điểm!`}
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
                                  ? `Cướp ${t.name} (${t.score}đ)`
                                  : `Đổi ${t.name} (${t.score}đ)`}
                              </button>
                            )
                        )}
                      </div>
                    </>
                  )}

                  {needsBonusChoice && (
                    <>
                      <div className="er-hint">
                        Đang chờ Đội {teamName} chọn trên điện thoại — hoặc chọn hộ:
                      </div>
                      <div className="er-targets">
                        <button type="button" className="host-btn ghost" onClick={() => onPickTarget(0)}>
                          Nhận chắc +200đ
                        </button>
                        <button type="button" className="host-btn ghost" onClick={() => onPickTarget(1)}>
                          🍀 Thử vận may — bốc lá phép
                        </button>
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

// memo: Host re-render 12 lần/phút khi idle poll — mọi prop (state object giữ
// nguyên reference giữa các poll nếu revision không đổi, teams, callbacks) bất
// biến ⇒ bọc memo bỏ được toàn bộ render vô nghĩa này.
export default memo(EffectCard);
