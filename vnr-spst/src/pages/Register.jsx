import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── CẤU HÌNH TEST ───────────────────────────────────────────
const HARDCODED_PIN = '1986'
// ─────────────────────────────────────────────────────────────

export default function Register() {
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [role, setRole] = useState('player')
  const [error, setError] = useState('')
  const [showPin, setShowPin] = useState(false)

  const handlePinChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4)
    setPin(val)
    setError('')
  }

  const handleSubmit = () => {
    if (pin !== HARDCODED_PIN) {
      setError('Mã PIN không đúng. Vui lòng thử lại.')
      return
    }
    if (role === 'coordinator') {
      navigate('/host')
    } else {
      navigate('/pick-team')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600;700&family=Noto+Sans:wght@400;500;700&display=swap"
        rel="stylesheet"
      />

      <style>{`
        .reg-body {
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
        .doc-card {
          background-color: #fdfbf7;
          box-shadow: 1px 1px 0px 0px rgba(136,114,114,0.2);
          width: 100%;
          max-width: 768px;
          border: 3px double #141b2c;
          padding: 2rem;
          position: relative;
          transform: rotate(-0.5deg);
          box-sizing: border-box;
        }
        @media (min-width: 768px) { .doc-card { padding: 3rem; } }
        .stamp {
          position: absolute;
          top: 1rem; right: 1rem;
          width: 6rem; height: 6rem;
          border-radius: 9999px;
          border: 2px dashed #ba1a1a;
          color: #ba1a1a;
          transform: rotate(15deg);
          display: flex; align-items: center; justify-content: center;
          z-index: 10; pointer-events: none; opacity: 0.8;
          font-family: 'Noto Serif', serif;
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-align: center; line-height: 1.3;
        }
        .masthead {
          text-align: center;
          margin-bottom: 2.5rem;
          border-bottom: 0.5px solid #141b2c;
          padding-bottom: 1.5rem;
        }
        .masthead h1 {
          font-family: 'Noto Serif', serif;
          font-size: clamp(26px, 6vw, 44px);
          line-height: 1.15; letter-spacing: -0.02em; font-weight: 700;
          color: #5c0c1c; text-transform: uppercase;
          margin: 0 0 0.5rem; padding-right: 5.5rem;
        }
        .masthead p {
          font-size: 17px; line-height: 28px; color: #554243; font-style: italic;
        }
        .test-banner {
          background: #ffdadb; border: 1px dashed #ba1a1a; border-radius: 4px;
          padding: 0.5rem 1rem; margin-bottom: 1.5rem;
          display: flex; align-items: center; justify-content: center;
          gap: 0.5rem; font-size: 13px; color: #7f2833; flex-wrap: wrap;
        }
        .test-banner .pin-badge {
          background: #5c0c1c; color: #fff; border-radius: 4px;
          padding: 2px 10px; font-family: 'Noto Serif', serif;
          font-weight: 700; font-size: 15px; letter-spacing: 0.2em;
          cursor: pointer; user-select: all;
        }
        .test-banner .eye-btn {
          cursor: pointer; background: none; border: none;
          color: #7f2833; font-size: 18px; line-height: 1; opacity: 0.8;
        }
        .pin-section {
          display: flex; flex-direction: column; align-items: center;
          max-width: 320px; margin: 0 auto;
        }
        .pin-label {
          font-family: 'Noto Serif', serif; font-size: 13px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase; color: #141b2c;
          margin-bottom: 0.5rem;
        }
        .pin-input {
          border: none; border-bottom: 1px solid #141b2c;
          background: transparent; border-radius: 0; width: 100%;
          text-align: center; font-family: 'Noto Serif', serif;
          font-size: 32px; line-height: 40px; font-weight: 700;
          color: #5c0c1c; letter-spacing: 0.4em; padding: 0.5rem 0;
          transition: border-bottom-width 0.15s;
        }
        .pin-input:focus { outline: none; box-shadow: none; border-bottom: 2px solid #5c0c1c; }
        .pin-input.err { border-bottom: 2px solid #ba1a1a; color: #ba1a1a; }
        .error-msg { margin-top: 0.5rem; font-size: 13px; color: #ba1a1a; text-align: center; }
        .divider { border: none; border-top: 0.5px solid #554243; opacity: 0.5; margin: 2rem 0; }
        .role-heading {
          font-family: 'Noto Serif', serif; font-size: 24px; line-height: 32px;
          font-weight: 600; text-align: center; color: #141b2c; margin: 0 0 1.5rem;
        }
        .role-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
        @media (min-width: 540px) { .role-grid { grid-template-columns: 1fr 1fr; } }
        .role-label { cursor: pointer; }
        .role-label input[type="radio"] {
          position: absolute; width: 1px; height: 1px;
          padding: 0; margin: -1px; overflow: hidden;
          clip: rect(0,0,0,0); white-space: nowrap; border-width: 0;
        }
        .role-card {
          border: 1px solid #141b2c; padding: 1.5rem; background: #fff;
          display: flex; flex-direction: column; justify-content: space-between;
          height: 100%; box-sizing: border-box;
          transition: border 0.1s, background 0.1s; min-height: 140px;
        }
        .role-card.coordinator { border-top: 4px solid #7a2430; }
        .role-card.player      { border-top: 4px solid #7b5800; }
        .role-card:hover { border-width: 2px; border-top-width: 4px; }
        .role-label input:checked + .role-card { border: 3px double #141b2c; background: #f1f3ff; }
        .role-card .role-name {
          font-family: 'Noto Serif', serif; font-size: 13px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 0.5rem;
        }
        .role-card.coordinator .role-name { color: #7a2430; }
        .role-card.player      .role-name { color: #7b5800; }
        .role-card .role-desc { font-size: 15px; line-height: 22px; color: #554243; }
        .role-card .check-box { margin-top: 1rem; display: flex; justify-content: flex-end; }
        .role-card .check-box .box {
          width: 1.5rem; height: 1.5rem; border: 1px solid #141b2c;
          display: flex; align-items: center; justify-content: center;
        }
        .role-label input:checked + .role-card .check-box .box::after {
          content: '✕'; font-size: 14px; font-weight: 700; color: #141b2c;
        }
        .submit-wrap { padding-top: 2rem; display: flex; justify-content: center; }
        .submit-btn {
          background: #7a2430; color: #fff;
          font-family: 'Noto Serif', serif; font-size: 13px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          padding: 1rem 3rem; border: none; border-radius: 0; cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .submit-btn:hover { transform: translateY(2px); box-shadow: 0 0 0 2px #141b2c; }
        .submit-btn:active { transform: translateY(3px); }
        .reg-footer {
          margin-top: 2rem; text-align: center;
          max-width: 672px; width: 100%;
          display: flex; flex-direction: column;
          justify-content: space-between; align-items: center;
          padding: 0.5rem 2rem; background: #d3d9f0;
          border-top: 0.5pt solid #554243;
          font-size: 12px; line-height: 16px; font-weight: 500; color: #554243;
          gap: 0.25rem;
        }
        @media (min-width: 540px) { .reg-footer { flex-direction: row; gap: 0; } }
      `}</style>

      <div className="reg-body">
        <main className="doc-card">
          {/* Stamp */}
          <div className="stamp">Văn Kiện<br />Đảng</div>

          {/* Masthead */}
          <header className="masthead">
            <h1>Hành Trình Đổi Mới</h1>
            <p>Văn kiện phiên làm việc 1986</p>
          </header>

          {/* ── TEST BANNER: hiển thị PIN để test ── */}
          <div className="test-banner">
            <span>🔐 PIN TEST:</span>
            <span className="pin-badge" title="Click để sao chép">
              {showPin ? HARDCODED_PIN : '••••'}
            </span>
            <button
              className="eye-btn"
              type="button"
              onClick={() => setShowPin(v => !v)}
              title={showPin ? 'Ẩn PIN' : 'Hiện PIN'}
            >
              {showPin ? '🙈' : '👁️'}
            </button>
            <span style={{ opacity: 0.6 }}>— Chỉ hiển thị khi test</span>
          </div>

          {/* PIN Input */}
          <div className="pin-section">
            <label className="pin-label" htmlFor="pin-input">Nhập Mật Mã Truy Cập</label>
            <input
              id="pin-input"
              className={`pin-input${error ? ' err' : ''}`}
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={handlePinChange}
              onKeyDown={handleKeyDown}
              autoComplete="off"
            />
            {error && <p className="error-msg">{error}</p>}
          </div>

          <hr className="divider" />

          {/* Role Selection */}
          <div>
            <h2 className="role-heading">Xác Định Vai Trò</h2>
            <div className="role-grid">
              {/* Coordinator */}
              <label className="role-label">
                <input
                  type="radio" name="role" value="coordinator"
                  checked={role === 'coordinator'}
                  onChange={() => setRole('coordinator')}
                />
                <div className="role-card coordinator">
                  <div>
                    <div className="role-name">Người Điều Phối</div>
                    <p className="role-desc">Quản lý lượt chơi và chấm điểm.</p>
                  </div>
                  <div className="check-box"><div className="box" /></div>
                </div>
              </label>

              {/* Player */}
              <label className="role-label">
                <input
                  type="radio" name="role" value="player"
                  checked={role === 'player'}
                  onChange={() => setRole('player')}
                />
                <div className="role-card player">
                  <div>
                    <div className="role-name">Người Chơi</div>
                    <p className="role-desc">Tham gia trả lời câu hỏi.</p>
                  </div>
                  <div className="check-box"><div className="box" /></div>
                </div>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="submit-wrap">
            <button className="submit-btn" type="button" onClick={handleSubmit}>
              Xác Nhận Truy Cập
            </button>
          </div>
        </main>

        <footer className="reg-footer">
          <span>© 1986-2024 BAN TUYÊN GIÁO TRUNG ƯƠNG</span>
          <span>Hệ thống lưu trữ số liệu 1986-2024</span>
        </footer>
      </div>
    </>
  )
}
