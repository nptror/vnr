import { useState } from 'react'
import { Link } from 'react-router-dom'
import { findGameByPin } from '../game/gameRepository'
import { isSupabaseConfigured } from '../lib/supabase'

/**
 * /pin — trang nhập mã PIN phòng chơi.
 * Lưu mã vào localStorage ('vnr_game_pin') để /host dùng khi tạo phòng mới
 * và /pick-team dùng khi đội tham gia. Có nút kiểm tra phòng tồn tại.
 */

const STYLE = `
  .pin-body {
    min-height: 100svh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1rem 1rem 0;
    background-color: #F1E7CF;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
    font-family: 'Noto Sans', sans-serif;
    color: #141b2c;
    width: 100%;
    box-sizing: border-box;
  }
  .pin-card {
    background-color: #fdfbf7;
    box-shadow: 1px 1px 0px 0px rgba(136,114,114,0.2);
    width: 100%;
    max-width: 560px;
    border: 3px double #141b2c;
    padding: 2rem;
    position: relative;
    transform: rotate(-0.5deg);
    box-sizing: border-box;
  }
  @media (min-width: 640px) { .pin-card { padding: 3rem; } }
  .pin-stamp {
    position: absolute;
    top: 1rem; right: 1rem;
    width: 5.25rem; height: 5.25rem;
    border-radius: 9999px;
    border: 2px dashed #ba1a1a;
    color: #ba1a1a;
    transform: rotate(15deg);
    display: flex; align-items: center; justify-content: center;
    z-index: 10; pointer-events: none; opacity: 0.8;
    font-family: 'Noto Serif', serif;
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-align: center; line-height: 1.3;
  }
  .pin-masthead {
    text-align: center;
    margin-bottom: 1.75rem;
    border-bottom: 0.5px solid #141b2c;
    padding-bottom: 1.25rem;
  }
  .pin-masthead h1 {
    font-family: 'Noto Serif', serif;
    font-size: clamp(24px, 5vw, 34px);
    line-height: 1.15; letter-spacing: -0.01em; font-weight: 700;
    color: #5c0c1c; text-transform: uppercase;
    margin: 0 0 0.4rem; padding-right: 4.75rem;
  }
  .pin-masthead p {
    font-size: 15px; color: #554243; font-style: italic; margin: 0;
  }
  .pin-label {
    font-family: 'Noto Serif', serif;
    font-size: 13px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    display: block; text-align: center;
    margin-bottom: 0.75rem; color: #141b2c;
  }
  .pin-input-row { display: flex; flex-direction: column; align-items: center; gap: 0.9rem; }
  .pin-input {
    border: 2px solid #141b2c;
    padding: 0.65rem 1rem;
    font-size: 30px;
    text-align: center;
    width: 220px;
    max-width: 240px;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    color: #141b2c;
    -webkit-text-fill-color: #141b2c;
    letter-spacing: 0.35em;
    background: #fff;
    outline: none;
    box-sizing: border-box;
  }
  .pin-input:focus { border-color: #5c0c1c; box-shadow: 2px 2px 0 rgba(92,12,28,0.25); }
  .pin-save-btn {
    border: 2px solid #141b2c;
    background: #d3d9f0;
    padding: 0.55rem 1.75rem;
    font-family: 'Noto Serif', serif;
    font-size: 14px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    cursor: pointer;
    transition: background 0.1s, transform 0.05s;
  }
  .pin-save-btn:hover { background: #c3cbe8; }
  .pin-save-btn:active { transform: translate(1px, 1px); }
  .pin-status {
    min-height: 22px;
    text-align: center;
    font-size: 14px; line-height: 20px;
    margin-top: 0.9rem;
  }
  .pin-status.ok { color: #3F5D45; font-weight: 600; }
  .pin-status.miss { color: #8A4B08; }
  .pin-status.err { color: #ba1a1a; }
  .pin-divider { border: none; border-top: 0.5px solid #554243; opacity: 0.5; margin: 1.5rem 0; }
  .pin-role-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
  @media (min-width: 480px) { .pin-role-grid { grid-template-columns: 1fr 1fr; } }
  .pin-role {
    border: 1px solid #141b2c; padding: 1rem; background: #fff;
    display: flex; flex-direction: column; justify-content: space-between;
    min-height: 96px; box-sizing: border-box;
    text-decoration: none; cursor: pointer;
    transition: border 0.1s;
  }
  .pin-role:hover { border-width: 2px; }
  .pin-role.host { border-top: 4px solid #7a2430; }
  .pin-role.play { border-top: 4px solid #7b5800; }
  .pin-role .name {
    font-family: 'Noto Serif', serif; font-size: 13px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 0.35rem;
  }
  .pin-role.host .name { color: #7a2430; }
  .pin-role.play .name { color: #7b5800; }
  .pin-role .desc { font-size: 13.5px; line-height: 19px; color: #554243; }
  .pin-back {
    margin-top: 1.25rem; text-align: center;
    font-size: 13px; color: #554243;
  }
  .pin-back a { color: #5c0c1c; font-weight: 600; text-decoration: underline; }
`

export default function PinEntry() {
  const [pin, setPin] = useState(() => localStorage.getItem('vnr_game_pin') || '1986')
  const [status, setStatus] = useState({ kind: null, text: '' })
  const [checking, setChecking] = useState(false)

  const savedPin = () => pin.trim() || '1986'

  const savePin = () => {
    localStorage.setItem('vnr_game_pin', savedPin())
  }

  const checkRoom = async () => {
    if (!isSupabaseConfigured) {
      setStatus({ kind: 'err', text: 'Supabase chưa cấu hình — không kiểm tra được.' })
      return
    }
    setChecking(true)
    setStatus({ kind: null, text: '' })
    try {
      const game = await findGameByPin(savedPin())
      if (game) {
        setStatus({ kind: 'ok', text: `✓ Đã có phòng đang hoạt động với mã ${savedPin()} — vào thẳng được.` })
      } else {
        setStatus({ kind: 'miss', text: `Chưa có phòng với mã ${savedPin()} — mở Máy chiếu (/host) sẽ tự tạo phòng này.` })
      }
    } catch (err) {
      setStatus({ kind: 'err', text: `Lỗi kiểm tra: ${err.message || String(err)}` })
    } finally {
      setChecking(false)
    }
  }

  return (
    <>
      <style>{STYLE}</style>
      <div className="pin-body">
        <main className="pin-card">
          <div className="pin-stamp">Mật<br />Lệnh</div>

          <header className="pin-masthead">
            <h1>Mã PIN Phòng Chơi</h1>
            <p>Thiết lập mã trước khi vào vai</p>
          </header>

          <div className="pin-input-row">
            <label className="pin-label" htmlFor="pin-entry-input">Nhập mã PIN</label>
            <input
              id="pin-entry-input"
              className="pin-input"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value)
                setStatus({ kind: null, text: '' })
              }}
              maxLength={8}
              autoComplete="off"
              inputMode="numeric"
            />
            <button type="button" className="pin-save-btn" onClick={savePin}>
              Lưu mã phòng
            </button>
            <button type="button" className="pin-save-btn" onClick={checkRoom} disabled={checking}>
              {checking ? 'Đang kiểm tra…' : 'Kiểm tra phòng'}
            </button>
          </div>

          <div className={`pin-status ${status.kind ?? ''}`}>{status.text}</div>

          <hr className="pin-divider" />

          <div className="pin-role-grid">
            <Link to="/host" className="pin-role host" onClick={savePin}>
              <div>
                <div className="name">Người Điều Phối</div>
                <p className="desc">Mở trên màn hình trình chiếu.</p>
              </div>
            </Link>
            <Link to="/pick-team" className="pin-role play" onClick={savePin}>
              <div>
                <div className="name">Người Chơi</div>
                <p className="desc">Thiết bị của từng đội.</p>
              </div>
            </Link>
          </div>

          <div className="pin-back">
            <Link to="/">← Về trang chính</Link>
          </div>
        </main>
      </div>
    </>
  )
}
