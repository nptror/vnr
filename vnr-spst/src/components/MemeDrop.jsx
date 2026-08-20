import { useState, useEffect, useCallback } from 'react'
import MEMES from '../config/memes'

/**
 * MemeDrop — overlay hiển thị meme "rơi" từ trên xuống.
 * Nhận mảng activeMemes qua props, mỗi item:
 *   { id, teamId, teamColor, memeId, x (0-100%), createdAt }
 * Meme tự xóa sau MEME_LIFETIME ms.
 */

const MEME_LIFETIME = 3500 // 3.5 giây rồi fade out

const STYLE = `
  .meme-drop-layer {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 100;
    overflow: hidden;
  }

  .meme-drop-item {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    animation: meme-pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards,
               meme-fade-out 1.5s ease-out forwards;
    animation-delay: 0s, 2s;
  }

  .meme-drop-emoji {
    font-size: 160px;
    line-height: 1;
    filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4));
  }

  .meme-drop-label {
    font-family: 'Noto Serif', serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #fff;
    background: rgba(0,0,0,0.7);
    padding: 3px 10px;
    border-radius: 9999px;
    white-space: nowrap;
  }

  .meme-drop-team-dot {
    width: 12px; height: 12px;
    border-radius: 9999px;
    border: 2px solid #fff;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  }

  @keyframes meme-pop-in {
    0%   { opacity: 0; transform: scale(0.3); }
    100% { opacity: 1; transform: scale(1); }
  }

  @keyframes meme-fade-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.6); }
  }
`

function getMemeData(memeId) {
  return MEMES.find(m => m.id === memeId) || MEMES[0]
}

function MemeImg({ file, label }) {
  return (
    <img
      src={file}
      alt={label}
      style={{ width: 160, height: 160, objectFit: 'contain' }}
    />
  )
}

export default function MemeDrop({ activeMemes = [] }) {
  return (
    <>
      <style>{STYLE}</style>
      <div className="meme-drop-layer">
        {activeMemes.map(item => {
          const meme = getMemeData(item.memeId)
          return (
            <div
              key={item.id}
              className="meme-drop-item"
              style={{
                left: `${item.x}%`,
                top: `${item.y || 40}%`,
              }}
            >
              <div className="meme-drop-team-dot" style={{ background: item.teamColor }} />
              <div className="meme-drop-emoji">
                <MemeImg file={meme.file} label={meme.label} />
              </div>
              <div className="meme-drop-label">{item.teamName}</div>
            </div>
          )
        })}
      </div>
    </>
  )
}

/**
 * Hook để quản lý lifecycle của meme drops.
 * Tự xóa meme sau MEME_LIFETIME.
 */
export function useMemeDrop() {
  const [activeMemes, setActiveMemes] = useState([])

  const addMeme = useCallback((memeData) => {
    const item = {
      ...memeData,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    }
    setActiveMemes(prev => [...prev, item])
  }, [])

  // Cleanup meme quá hạn
  useEffect(() => {
    if (activeMemes.length === 0) return
    const timer = setInterval(() => {
      const now = Date.now()
      setActiveMemes(prev => prev.filter(m => now - m.createdAt < MEME_LIFETIME))
    }, 500)
    return () => clearInterval(timer)
  }, [activeMemes.length])

  return { activeMemes, addMeme }
}
