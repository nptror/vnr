const SUSPENSE_MS = 1500
const FLIP_MS = 800
const HOLD_MS = 700

export const REVEAL_TOTAL_MS = SUSPENSE_MS + FLIP_MS + HOLD_MS

const FACE_REVEAL_AT = SUSPENSE_MS + FLIP_MS
const FADE_OUT_MS = 320

const CONFETTI_COLORS = ['#c9a227', '#7a2430', '#3F5D45', '#1F4E66', '#f4d47c']
const CONFETTI_COUNT = 10

function buildConfetti() {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => {
    const theta = (i / CONFETTI_COUNT) * Math.PI * 2 + Math.random() * 0.6
    const radius = 150 + Math.random() * 90
    return {
      '--dx': `${Math.round(Math.cos(theta) * radius)}px`,
      '--dy': `${Math.round(Math.sin(theta) * radius - 40)}px`,
      '--c': CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    }
  })
}

export default function EffectReveal({ icon, label, teamName, teamColor }) {
  const confetti = buildConfetti()
  return (
    <>
      <style>{STYLE}</style>
      <div className="er-overlay" aria-hidden="true">
        <div className="er-scene">
          <div className="er-burst" />
          <div className="er-confetti">
            {confetti.map((vars, i) => (
              <span key={i} style={vars} />
            ))}
          </div>
          <div className="er-lift">
            <div className="er-card">
              <div className="er-face er-face--back">
                <div className="er-back-frame" />
                <div className="er-back-shine" />
                <div className="er-back-mark">?</div>
              </div>
              <div className="er-face er-face--front">
                <div className="er-eyebrow">
                  {teamColor && <span className="er-team-dot" style={{ background: teamColor }} />}
                  Đội {teamName ?? '???'} bốc được
                </div>
                <div className="er-icon">{icon}</div>
                <div className="er-label">{label}</div>
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
    pointer-events: none;
    animation:
      er-overlay-in 220ms ease-out,
      er-overlay-out ${FADE_OUT_MS}ms ease-in ${REVEAL_TOTAL_MS - FADE_OUT_MS}ms forwards;
  }
  @keyframes er-overlay-in { from { opacity: 0; } }
  @keyframes er-overlay-out { to { opacity: 0; } }

  .er-scene {
    position: relative;
    perspective: 1400px;
  }

  .er-lift {
    animation: er-suspense ${SUSPENSE_MS}ms cubic-bezier(0.34, 1.2, 0.5, 1) both;
  }
  @keyframes er-suspense {
    0%   { transform: translateY(70px) scale(0.5); opacity: 0; }
    20%  { transform: translateY(-16px) scale(1.06); opacity: 1; }
    34%  { transform: translateY(0) scale(0.99) rotate(-3deg); }
    48%  { transform: rotate(3deg) scale(1.005); }
    62%  { transform: rotate(-4deg) scale(1.015); }
    76%  { transform: rotate(4deg) scale(1.025); }
    88%  { transform: rotate(-2deg) scale(1.04); }
    100% { transform: rotate(0deg) scale(1); }
  }

  .er-card {
    position: relative;
    width: 280px; height: 400px;
    transform-style: preserve-3d;
    animation: er-flip ${FLIP_MS}ms cubic-bezier(0.35, 0.05, 0.2, 1) ${SUSPENSE_MS}ms forwards;
  }
  @keyframes er-flip {
    from { transform: rotateY(0deg); }
    to   { transform: rotateY(180deg); }
  }

  .er-face {
    position: absolute; inset: 0;
    border-radius: 16px;
    backface-visibility: hidden;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 14px;
    box-shadow: 0 18px 44px rgba(0,0,0,0.45);
  }

  .er-face--back {
    background:
      repeating-linear-gradient(45deg, rgba(244,212,124,0.09) 0 12px, transparent 12px 24px),
      linear-gradient(160deg, #7a2430, #43121c 72%);
    border: 3px double #f4d47c;
  }
  .er-back-frame {
    position: absolute; inset: 12px;
    border: 1px solid rgba(244,212,124,0.55);
    border-radius: 10px;
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
    border-radius: 16px;
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
  @keyframes er-shine { to { left: 340px; } }

  .er-face--front {
    transform: rotateY(180deg);
    background: #fdfbf7;
    border-top: 8px solid var(--gold, #c9a227);
    padding: 24px;
    text-align: center;
  }
  .er-eyebrow {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    font-family: 'Noto Serif', serif;
    font-size: 17px; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: #554243;
    opacity: 0;
    animation: er-rise 480ms ease-out ${FACE_REVEAL_AT - 250}ms forwards;
  }
  .er-team-dot {
    width: 11px; height: 11px; border-radius: 9999px;
    border: 1px solid rgba(20,27,44,0.35);
    flex-shrink: 0;
  }
  .er-icon {
    font-size: 96px; line-height: 1;
    opacity: 0;
    animation: er-pop 520ms cubic-bezier(0.34, 1.56, 0.64, 1) ${FACE_REVEAL_AT - 150}ms forwards;
  }
  @keyframes er-pop {
    0%   { opacity: 0; transform: scale(0.2) rotate(-14deg); }
    60%  { opacity: 1; transform: scale(1.18) rotate(4deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  .er-label {
    font-family: 'Noto Serif', serif;
    font-weight: 700;
    font-size: 30px; line-height: 1.25;
    color: #141b2c;
    opacity: 0;
    animation: er-rise 500ms ease-out ${FACE_REVEAL_AT}ms forwards;
  }
  @keyframes er-rise {
    0%   { opacity: 0; transform: translateY(12px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  .er-burst {
    position: absolute; top: 50%; left: 50%;
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
    100% { opacity: 0; transform: scale(8); }
  }

  .er-confetti span {
    position: absolute; top: 50%; left: 50%;
    width: 9px; height: 13px;
    border-radius: 2px;
    background: var(--c);
    opacity: 0;
    animation: er-confetti-fly 720ms cubic-bezier(0.15, 0.6, 0.4, 1) ${FACE_REVEAL_AT + 40}ms forwards;
  }
  @keyframes er-confetti-fly {
    0%   { opacity: 0; transform: translate(0, 0) rotate(0deg) scale(0.4); }
    20%  { opacity: 1; }
    100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(420deg) scale(1); }
  }

  @media (max-width: 640px), (max-height: 560px) {
    .er-card { width: 210px; height: 300px; }
    .er-back-mark { font-size: 96px; }
    .er-icon { font-size: 68px; }
    .er-label { font-size: 23px; }
    .er-eyebrow { font-size: 13px; }
  }
`
