import { useState, useEffect } from 'react'

/**
 * ScoreFx — animation điểm số trên màn Host (cosmetic, local-only).
 *
 * Props:
 *   fx = {
 *     type: 'swap' | 'steal',
 *     a: { name, color, before, after },  // đội bốc lá bài (kẻ cướp / đội đổi)
 *     b: { name, color, before, after },  // đội mục tiêu (bị cướp / đội đổi)
 *     amount: number                      // (chỉ steal) số điểm chuyển giao
 *   }
 *
 * Choreography (~2.2s, parent tự gỡ sau ~4s):
 *   - swap : hai thẻ trượt ngang xuyên nhau (A vắt phía trên B), số điểm
 *            tick dần trong lúc bay, đáp xuống với overshoot nhẹ.
 *   - steal: cụm đồng xu bay theo quỹ đạo cong từ thẻ mục tiêu sang thẻ
 *            đội cướp (stagger 70ms/đồng).
 *   - Khi tick xong, con số điểm mới POP phóng to rồi về lại cỡ chuẩn.
 */

const FLY_MS = 900        // thời gian tick số / di chuyển chính
const INTRO_DELAY_MS = 250 // chờ fade-in trước khi bay

const fmt = (n) => n.toLocaleString('vi-VN')

function useTick(from, to, delayMs, durationMs) {
  const [state, setState] = useState({ value: from, done: false })
  useEffect(() => {
    let raf
    const startAt = performance.now() + delayMs
    const step = (now) => {
      if (now <= startAt) {
        raf = requestAnimationFrame(step)
        return
      }
      const p = Math.min(1, (now - startAt) / durationMs)
      const eased = 1 - Math.pow(1 - p, 3)
      setState({
        value: Math.round(from + (to - from) * eased),
        done: p >= 1,
      })
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [from, to, delayMs, durationMs])
  return state
}

function TeamCard({ side, data, type }) {
  const { value, done } = useTick(data.before, data.after, INTRO_DELAY_MS, FLY_MS)
  const delta = data.after - data.before
  return (
    <div className={`sf-card sf-card--${side} sf-card--${type}${done ? ' sf-done' : ''}`}>
      <div className="sf-head">
        <span className="sf-dot" style={{ background: data.color }} />
        <span className="sf-name">{data.name}</span>
      </div>
      <div className={`sf-score ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}${done ? ' sf-pop' : ''}`}>
        {fmt(value)}
        <small>đ</small>
      </div>
      {delta !== 0 && (
        <div className={`sf-float ${delta > 0 ? 'up' : 'down'}`}>
          {delta > 0 ? '+' : '−'}
          {fmt(Math.abs(delta))}
        </div>
      )}
    </div>
  )
}

export default function ScoreFx({ fx }) {
  const coins = [0, 1, 2, 3, 4]
  return (
    <>
      <style>{STYLE}</style>
      <div className="sf-overlay" aria-hidden="true">
        <div className={`sf-stage sf-stage--${fx.type}`}>
          <TeamCard side="a" data={fx.a} type={fx.type} />

          <div className="sf-mid">
            {fx.type === 'swap' ? (
              <div className="sf-swap-glyph">⇄</div>
            ) : (
              <>
                <div className="sf-steal-glyph">🗡️</div>
                <div className="sf-steal-amount">+{fmt(fx.amount ?? Math.max(0, fx.a.after - fx.a.before))}</div>
                <div className="sf-coins">
                  {coins.map((i) => (
                    <span key={i} className="sf-coin-track" style={{ '--i': i }}>
                      <span className="sf-coin" />
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          <TeamCard side="b" data={fx.b} type={fx.type} />
        </div>
      </div>
    </>
  )
}

const STYLE = `
  .sf-overlay {
    position: fixed; inset: 0; z-index: 95;
    display: flex; align-items: center; justify-content: center;
    background: rgba(20,16,10,0.45);
    backdrop-filter: blur(2px);
    pointer-events: none; /* host vẫn bấm được nút bên dưới */
    animation: sf-fade 180ms ease-out;
  }
  @keyframes sf-fade { from { opacity: 0; } }

  .sf-stage {
    display: flex; align-items: stretch; gap: 24px;
    padding: 28px 36px;
    background: #fdfbf7;
    border: 3px double #141b2c;
    border-radius: 8px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.35);
    font-family: 'Courier New', monospace;
  }

  /* ── Thẻ đội ── */
  .sf-card {
    position: relative;
    width: 230px; min-height: 130px;
    border: 2px solid #141b2c;
    border-radius: 10px;
    background: #faf8ff;
    box-shadow: 4px 4px 0 rgba(20,27,44,0.18);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 8px; padding: 14px 12px;
  }
  .sf-head { display: flex; align-items: center; gap: 8px; max-width: 100%; }
  .sf-dot { width: 12px; height: 12px; border-radius: 9999px; border: 1px solid rgba(20,27,44,0.35); flex-shrink: 0; }
  .sf-name {
    font-family: 'Noto Serif', serif;
    font-size: 15px; font-weight: 700;
    letter-spacing: 0.04em; text-transform: uppercase;
    color: #554243;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sf-score {
    font-size: 42px; font-weight: bold; line-height: 1;
    color: #141b2c; display: flex; align-items: baseline; gap: 3px;
    transition: color 200ms;
  }
  .sf-score small { font-size: 17px; font-weight: 700; color: #887272; }
  .sf-score.up { color: #3F5D45; }
  .sf-score.down { color: #9B2335; }

  /* Điểm chốt: POP phóng to rồi về lại */
  .sf-score.sf-pop { animation: sf-pop 520ms cubic-bezier(0.34, 1.56, 0.64, 1); }
  @keyframes sf-pop {
    0%   { transform: scale(1); }
    45%  { transform: scale(1.55); filter: brightness(1.25); }
    100% { transform: scale(1); }
  }

  /* Số điểm thay đổi bay lên rồi mờ dần */
  .sf-float {
    position: absolute; top: -14px; left: 50%;
    transform: translateX(-50%);
    font-size: 22px; font-weight: 800;
    opacity: 0;
    animation: sf-rise 1100ms ease-out 500ms forwards;
  }
  .sf-float.up { color: #3F5D45; }
  .sf-float.down { color: #9B2335; }
  @keyframes sf-rise {
    0%   { opacity: 0; transform: translate(-50%, 10px); }
    25%  { opacity: 1; }
    100% { opacity: 0; transform: translate(-50%, -34px); }
  }

  /* ── SWAP: hai thẻ trượt xuyên nhau ── */
  .sf-card--a.sf-card--swap { animation: sf-fly-a 2200ms cubic-bezier(0.45, 0, 0.2, 1); }
  .sf-card--b.sf-card--swap { animation: sf-fly-b 2200ms cubic-bezier(0.45, 0, 0.2, 1); }
  @keyframes sf-fly-a {
    0%   { transform: translateX(0) rotate(0deg); z-index: 1; }
    18%  { z-index: 3; }
    46%  { transform: translateX(calc(100% + 48px)) rotate(7deg) scale(1.05); z-index: 3; }
    62%  { transform: translateX(calc(100% + 48px)) rotate(0deg) scale(1.02); z-index: 3; }
    78%  { z-index: 3; }
    82%  { transform: translateX(calc(100% + 52px)) rotate(0deg) scale(1); }
    100% { transform: translateX(calc(100% + 48px)) rotate(0deg); z-index: 1; }
  }
  @keyframes sf-fly-b {
    0%   { transform: translateX(0) rotate(0deg); }
    46%  { transform: translateX(calc(-100% - 48px)) rotate(-7deg) scale(0.97); }
    62%  { transform: translateX(calc(-100% - 48px)) rotate(0deg) scale(0.99); }
    82%  { transform: translateX(calc(-100% - 52px)) rotate(0deg) scale(1); }
    100% { transform: translateX(calc(-100% - 48px)) rotate(0deg); }
  }

  /* ── STEAL: đồng xu bay quỹ đạo cong ── */
  .sf-mid {
    position: relative;
    width: 96px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    overflow: visible;
  }
  .sf-swap-glyph { font-size: 54px; font-weight: 800; color: #4A3A6B; line-height: 1; }
  .sf-steal-glyph { font-size: 40px; line-height: 1; margin-bottom: 4px; }
  .sf-steal-amount { font-size: 19px; font-weight: 800; color: #8A4B08; }
  .sf-coins {
    position: absolute; inset: 0;
    pointer-events: none;
  }
  .sf-coin-track {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    animation: sf-coin-x 720ms cubic-bezier(0.5, 0, 0.9, 0.4) both;
    animation-delay: calc(${INTRO_DELAY_MS}ms + var(--i) * 70ms);
  }
  @keyframes sf-coin-x {
    from { transform: translate(28px, -50%); opacity: 1; }
    to   { transform: translate(-128px, -50%); opacity: 1; }
  }
  .sf-coin {
    display: block; width: 26px; height: 26px;
    border-radius: 9999px;
    background: radial-gradient(circle at 35% 30%, #f4d47c, #d9a53a 65%, #a9762a);
    border: 2px solid #8a6420;
    box-shadow: 0 2px 4px rgba(0,0,0,0.25);
    animation:
      sf-coin-y 720ms ease-in both,
      sf-coin-spin 360ms linear infinite;
    animation-delay: inherit;
  }
  @keyframes sf-coin-y {
    0%   { transform: translateY(0); }
    50%  { transform: translateY(-72px); }
    100% { transform: translateY(0); }
  }
  @keyframes sf-coin-spin {
    from { transform: rotate(0deg) scaleX(1); }
    50%  { transform: rotate(180deg) scaleX(0.25); }
    to   { transform: rotate(360deg) scaleX(1); }
  }

  /* Màn hình nhỏ (laptop thấp) thu toàn bộ stage lại */
  @media (max-width: 780px) {
    .sf-stage { transform: scale(0.78); }
  }
`
