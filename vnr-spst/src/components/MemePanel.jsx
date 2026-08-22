import { useState, useCallback } from 'react'
import { MEME_FOLDERS } from '../config/memes'

/**
 * MemePanel — panel chọn meme theo folder, dùng ảnh GIF.
 * Props:
 *   - onDrop(memeId) — callback khi user chọn meme
 *   - disabled — disable panel
 *   - teamColor — màu đội hiện tại
 */

const COOLDOWN_MS = 3000

const STYLE = `
  .meme-panel {
    border: 1px solid #887272;
    background: #faf8ff;
    padding: 1rem;
    margin-top: 1rem;
    transform: rotate(0.3deg);
    position: relative;
  }
  .meme-panel.disabled { opacity: 0.5; pointer-events: none; }

  /* ── Header ── */
  .meme-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }
  .meme-panel-title {
    font-family: 'Noto Serif', serif;
    font-size: 12px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #554243;
    display: flex; align-items: center; gap: 0.5rem;
  }
  .meme-stamp {
    font-size: 10px; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: #ba1a1a;
    border: 1px dashed #ba1a1a;
    padding: 1px 4px;
    transform: rotate(-8deg);
    opacity: 0.7;
  }

  /* ── Folder tabs ── */
  .meme-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 0.75rem;
    overflow-x: auto;
    padding-bottom: 2px;
  }
  .meme-tab {
    display: flex; align-items: center; gap: 4px;
    padding: 6px 12px;
    border: 1px solid #dbc0c1;
    background: #fff;
    cursor: pointer;
    font-family: 'Noto Serif', serif;
    font-size: 12px; font-weight: 600;
    color: #554243;
    white-space: nowrap;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .meme-tab:hover { border-color: #5c0c1c; background: #f1f3ff; }
  .meme-tab.active {
    border-color: #5c0c1c;
    background: #5c0c1c;
    color: #fff;
  }
  .meme-tab-icon { font-size: 14px; line-height: 1; }

  /* ── Meme grid ── */
  .meme-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }
  @media (max-width: 640px) {
    .meme-grid { grid-template-columns: repeat(3, 1fr); }
  }
  .meme-btn {
    aspect-ratio: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border: 1px solid #dbc0c1;
    background: #fff;
    cursor: pointer;
    transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
    padding: 4px;
    position: relative;
    overflow: hidden;
  }
  .meme-btn:hover:not(:disabled) {
    transform: scale(1.08);
    border-color: #5c0c1c;
    box-shadow: 0 2px 8px rgba(92,12,28,0.2);
  }
  .meme-btn:active:not(:disabled) { transform: scale(0.95); }
  .meme-btn:disabled { cursor: not-allowed; opacity: 0.4; }

  .meme-btn-img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 2px;
    background: #f0f0f0;
  }
  .meme-btn-emoji {
    font-size: 32px;
    line-height: 1;
  }
  .meme-btn-label {
    font-size: 9px; font-weight: 600;
    color: #554243;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  /* ── Cooldown ── */
  .meme-cooldown-bar {
    margin-top: 0.75rem;
    height: 3px;
    background: #dbc0c1;
    border-radius: 2px;
    overflow: hidden;
  }
  .meme-cooldown-fill {
    height: 100%;
    background: #7a2430;
    border-radius: 2px;
    transition: width linear;
  }
  .meme-cooldown-text {
    font-size: 11px; color: #887272;
    text-align: center; margin-top: 0.35rem;
    font-style: italic;
  }
`

function MemeImg({ file, label }) {
  if (!file) return null
  return (
    <img
      className="meme-btn-img"
      src={file}
      alt={label}
      loading="lazy"
    />
  )
}

export default function MemePanel({ onDrop, disabled = false, teamColor = '#7a2430' }) {
  const [activeTab, setActiveTab] = useState(MEME_FOLDERS[0]?.folder.id)
  const [cooldownLeft, setCooldownLeft] = useState(0)
  const [cooldownPct, setCooldownPct] = useState(0)

  const activeFolder = MEME_FOLDERS.find(f => f.folder.id === activeTab) || MEME_FOLDERS[0]

  const handleDrop = useCallback((memeId) => {
    if (cooldownLeft > 0) return
    onDrop(memeId)

    setCooldownLeft(COOLDOWN_MS)
    setCooldownPct(100)
    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = COOLDOWN_MS - elapsed
      if (remaining <= 0) {
        clearInterval(interval)
        setCooldownLeft(0)
        setCooldownPct(0)
      } else {
        setCooldownLeft(remaining)
        setCooldownPct((remaining / COOLDOWN_MS) * 100)
      }
    }, 50)
  }, [cooldownLeft, onDrop])

  return (
    <>
      <style>{STYLE}</style>
      <div className={`meme-panel${disabled ? ' disabled' : ''}`}>
        <div className="meme-panel-header">
          <div className="meme-panel-title">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>image</span>
            THẢ MEME
          </div>
          <div className="meme-stamp">Gửi yêu thương</div>
        </div>

        {/* Folder tabs */}
        <div className="meme-tabs">
          {MEME_FOLDERS.map(f => (
            <button
              key={f.folder.id}
              className={`meme-tab${activeTab === f.folder.id ? ' active' : ''}`}
              onClick={() => setActiveTab(f.folder.id)}
            >
              <span className="meme-tab-icon">{f.folder.icon}</span>
              {f.folder.name}
              <span style={{ opacity: 0.5 }}>({f.memes.length})</span>
            </button>
          ))}
        </div>

        {/* Meme grid */}
        <div className="meme-grid">
          {activeFolder.memes.map(meme => (
            <button
              key={meme.id}
              className="meme-btn"
              disabled={disabled || cooldownLeft > 0}
              onClick={() => handleDrop(meme.id)}
              title={meme.label}
            >
              <MemeImg file={meme.file} label={meme.label} />
              <span className="meme-btn-label">{meme.label}</span>
            </button>
          ))}
        </div>

        {cooldownLeft > 0 && (
          <>
            <div className="meme-cooldown-bar">
              <div
                className="meme-cooldown-fill"
                style={{ width: `${cooldownPct}%`, background: teamColor }}
              />
            </div>
            <div className="meme-cooldown-text">
              Đợi {(cooldownLeft / 1000).toFixed(1)}s...
            </div>
          </>
        )}
      </div>
    </>
  )
}
