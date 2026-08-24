import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Landing() {
  // Start from the stored room code so visiting /pin (or a previous session)
  // isn't silently reset back to '1986' when navigating via role cards.
  const [pin, setPin] = useState(() => localStorage.getItem('vnr_game_pin') || '1986')

  const savePin = () => {
    localStorage.setItem('vnr_game_pin', pin.trim() || '1986')
  }

  return (
    <>
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
        .intro-text {
          font-size: 15px; line-height: 24px; color: #554243;
          text-align: center; max-width: 560px; margin: 0 auto 2rem;
        }
        .divider { border: none; border-top: 0.5px solid #554243; opacity: 0.5; margin: 2rem 0; }
        .role-heading {
          font-family: 'Noto Serif', serif; font-size: 24px; line-height: 32px;
          font-weight: 600; text-align: center; color: #141b2c; margin: 0 0 1.5rem;
        }
        .role-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
        @media (min-width: 540px) { .role-grid { grid-template-columns: 1fr 1fr; } }
        .role-card {
          border: 1px solid #141b2c; padding: 1.5rem; background: #fff;
          display: flex; flex-direction: column; justify-content: space-between;
          height: 100%; box-sizing: border-box;
          transition: border 0.1s, background 0.1s; min-height: 140px;
          text-decoration: none; cursor: pointer;
        }
        .role-card.coordinator { border-top: 4px solid #7a2430; }
        .role-card.player      { border-top: 4px solid #7b5800; }
        .role-card:hover { border-width: 2px; border-top-width: 4px; }
        .role-card .role-name {
          font-family: 'Noto Serif', serif; font-size: 13px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 0.5rem;
        }
        .role-card.coordinator .role-name { color: #7a2430; }
        .role-card.player      .role-name { color: #7b5800; }
        .role-card .role-desc { font-size: 15px; line-height: 22px; color: #554243; }
        .role-card .go-arrow { margin-top: 1rem; display: flex; justify-content: flex-end; }
        .role-card .go-arrow .box {
          width: 1.5rem; height: 1.5rem; border: 1px solid #141b2c;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 700; color: #141b2c;
        }
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



          <hr className="divider" />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
            <label htmlFor="landing-pin" style={{ fontFamily: "'Noto Serif', serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem', color: '#141b2c' }}>MÃ PIN PHÒNG CHƠI</label>
            <input
              id="landing-pin"
              value={pin}
              onChange={e => setPin(e.target.value)}
              maxLength={8}
              autoComplete="off"
              inputMode="numeric"
              style={{ border: '2px solid #141b2c', padding: '0.5rem 1rem', fontSize: '18px', textAlign: 'center', maxWidth: '160px', fontFamily: "'Courier New', monospace", fontWeight: 'bold', color: '#141b2c' }}
            />

          </div>

          {/* Role navigation */}
          <div>
            <h2 className="role-heading">Chọn Vai Trò Của Bạn</h2>
            <div className="role-grid">
              <Link to="/host" className="role-card coordinator" onClick={savePin}>
                <div>
                  <div className="role-name">Người Điều Phối</div>
                  <p className="role-desc">Quản lý lượt chơi và chấm điểm.</p>
                </div>
                <div className="go-arrow"><div className="box">→</div></div>
              </Link>

              <Link to="/pick-team" className="role-card player" onClick={savePin}>
                <div>
                  <div className="role-name">Người Chơi</div>
                  <p className="role-desc">Tham gia trả lời câu hỏi.</p>
                </div>
                <div className="go-arrow"><div className="box">→</div></div>
              </Link>
            </div>
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
