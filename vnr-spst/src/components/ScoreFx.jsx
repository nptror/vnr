import { memo, useState, useEffect } from 'react'
import './ScoreFxArtDeco.css'

/**
 * ScoreFx — animation điểm số trên màn Host (cosmetic, local-only).
 * Style được nâng cấp Art Deco trong ScoreFxArtDeco.css.
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

function ScoreFx({ fx }) {
  const coins = [0, 1, 2, 3, 4]
  return (
    <>
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

// memo: fx object là reference bất biến giữa các lần set (useState giữ nguyên);
// Host re-render 12 lần/phút khi idle poll không còn chạm tới overlay này.
export default memo(ScoreFx)
