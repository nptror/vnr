import { useEffect, useState } from 'react'
import { playSound } from '../game/sounds'

const STAMP_TEXTS = ['CHIẾN THẮNG', 'VICTORY', 'XUẤT SẮC', 'VÔ ĐỊCH']
const CONFETTI_COLORS = ['#c9a227', '#7a2430', '#3F5D45', '#1F4E66', '#f4d47c', '#D9A930', '#ff9098']

function buildStamps(count) {
  return Array.from({ length: count }, (_, i) => ({
    text: STAMP_TEXTS[i % STAMP_TEXTS.length],
    key: i,
    r: Math.random().toFixed(2),
    left: (Math.random() * 80 + 10).toFixed(0),
  }))
}

function buildConfetti(count) {
  return Array.from({ length: count }, (_, i) => ({
    key: i,
    left: (Math.random() * 100).toFixed(1),
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: (6 + Math.random() * 8).toFixed(1),
    delay: (Math.random() * 6).toFixed(2),
    duration: (4 + Math.random() * 4).toFixed(2),
    sway: (20 + Math.random() * 40).toFixed(0),
    rotate: (Math.random() * 720 - 360).toFixed(0),
  }))
}

export default function WinnerPodium({ rankList = [], onClose, onNewGame }) {
  const [visible, setVisible] = useState(false)
  const [stamps] = useState(() => buildStamps(30))
  const [confetti] = useState(() => buildConfetti(60))
  const podiumCount = Math.min(rankList.length, 3)

  useEffect(() => {
    // Small delay so CSS transitions fire after mount
    const id = setTimeout(() => {
      setVisible(true)
      playSound('victory-appear')
    }, 50)
    // Swoosh bám theo delay trượt vào của từng cột bục (xem .wp-pod-col trong Host.css)
    const slideDelays = podiumCount >= 3 ? [550, 1250] : podiumCount === 2 ? [1250] : []
    const slideTimers = slideDelays.map((delay) =>
      setTimeout(() => playSound('victory-slide'), delay)
    )
    return () => {
      clearTimeout(id)
      slideTimers.forEach((t) => clearTimeout(t))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ranked = rankList.map((t, i) => ({ ...t, rank: i + 1 }))
  const podium = ranked.slice(0, 3)
  const rest = ranked.slice(3)

  // Build podium order: 2nd (left), 1st (center), 3rd (right)
  const podiumSlots = []
  if (podium.length === 1) {
    podiumSlots.push({ ...podium[0], slot: 'rank-1' })
  } else if (podium.length === 2) {
    podiumSlots.push({ ...podium[1], slot: 'rank-2' })
    podiumSlots.push({ ...podium[0], slot: 'rank-1' })
  } else if (podium.length >= 3) {
    podiumSlots.push({ ...podium[1], slot: 'rank-2' })
    podiumSlots.push({ ...podium[0], slot: 'rank-1' })
    podiumSlots.push({ ...podium[2], slot: 'rank-3' })
  }

  const gold = podium[0]

  return (
    <div className={`wp-overlay ${visible ? 'show' : ''}`}>
      {/* Cinematic vignette */}
      <div className="wp-vignette" />

      {/* Camera flash for rank-1 reveal */}
      <div className="wp-flash" />

      {/* Infinite confetti rain */}
      <div className="wp-confetti-layer">
        {confetti.map((c) => (
          <div
            key={c.key}
            className="wp-confetti-piece"
            style={{
              left: `${c.left}%`,
              width: `${c.size}px`,
              height: `${c.size * 1.4}px`,
              background: c.color,
              '--sway': `${c.sway}px`,
              '--rotate': `${c.rotate}deg`,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Digital stamp rain */}
      <div className="wp-stamps-layer">
        {stamps.map((s) => (
          <div
            key={s.key}
            className="wp-dstamp"
            style={{ '--r': s.r, '--d': s.key, left: `${s.left}vw` }}
          >
            {s.text}
          </div>
        ))}
      </div>

      <header className="wp-header">
        <span className="wp-header-title">HÀNH TRÌNH ĐỔI MỚI</span>
      </header>

      <main className="wp-main">
        <div className="wp-doc-title">
          <h1>Báo Cáo Thành Tích Chung Cuộc</h1>
          <p>Hội thi — Bảng xếp hạng cuối cùng</p>
        </div>

        <div className="wp-podium-container">
          {podiumSlots.map((t) => (
            <div key={t.team_key ?? t.rank} className={`wp-pod-col ${t.slot}`}>
              <div
                className="wp-pod-card"
                style={
                  t.slot === 'rank-1'
                    ? { borderColor: t.color || 'var(--gold)' }
                    : t.slot === 'rank-2'
                    ? { borderColor: t.color || 'var(--gold)' }
                    : { borderColor: t.color || 'var(--forest)' }
                }
              >
                {t.slot === 'rank-1' && gold && (
                  <div className="wp-victory-stamp">
                    <span>
                      CHIẾN
                      <br />
                      THẮNG
                    </span>
                  </div>
                )}
                <h3 className="wp-pod-name">{t.name}</h3>
                <p className="wp-pod-label">Điểm Tích Lũy</p>
                <div className={`wp-pod-score ${t.slot === 'rank-1' ? 'metallic' : ''}`}>
                  {t.score.toLocaleString()}
                </div>
              </div>
              <div
                className={`wp-pod-base ${t.slot}`}
                style={
                  t.slot === 'rank-1'
                    ? { background: `linear-gradient(to bottom, ${t.color || 'var(--gold)'}33, transparent)` }
                    : undefined
                }
              >
                <span className="wp-pod-rank-num">{t.rank}</span>
                {t.slot !== 'rank-1' && (
                  <span className="wp-pod-medal">🎖</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Remaining teams ranked list */}
        {rest.length > 0 && (
          <div className="wp-rest">
            {rest.map((t) => (
              <div key={t.team_key ?? t.rank} className="wp-rest-row">
                <span className="wp-rest-rank">#{t.rank}</span>
                <div className="wp-rest-dot" style={{ background: t.color }} />
                <span className="wp-rest-name">{t.name}</span>
                <span className="wp-rest-score">{t.score.toLocaleString()} điểm</span>
              </div>
            ))}
          </div>
        )}

        <div className="wp-actions">
          <button type="button" className="host-btn ghost" onClick={onClose}>
            Đóng
          </button>
          <button type="button" className="host-btn" onClick={onNewGame}>
            Ván mới
          </button>
        </div>
      </main>
    </div>
  )
}
