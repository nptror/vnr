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
          background-color: #F7F3E9;
          background-image: radial-gradient(circle at 50% 0%, rgba(212,175,55,0.18) 0%, transparent 60%),
            radial-gradient(circle, rgba(247,230,164,0.12) 1px, transparent 1px);
          background-size: 100% 100%, 28px 28px;
          font-family: 'Noto Sans', sans-serif;
          color: #1c1c18;
          width: 100%;
          box-sizing: border-box;
        }
        .doc-card {
          background-color: #faf6ee;
          box-shadow: 0 8px 24px rgba(28,25,23,0.08), 0 1px 0 rgba(255,255,255,0.5) inset;
          width: 100%;
          max-width: 820px;
          border: 1px solid #d1c5b0;
          padding: 1.75rem;
          position: relative;
          box-sizing: border-box;
        }
        @media (min-width: 768px) { .doc-card { padding: 2.5rem; } }
        .stamp {
          position: absolute;
          top: 1rem; right: 1rem;
          width: 5.5rem; height: 5.5rem;
          border-radius: 9999px;
          border: 2px dashed #9e7422;
          color: #9e7422;
          transform: rotate(8deg);
          display: flex; align-items: center; justify-content: center;
          z-index: 10; pointer-events: none; opacity: 0.85;
          font-family: 'Noto Serif', serif;
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-align: center; line-height: 1.3;
          background: linear-gradient(135deg, #faebb4 0%, #d4af37 40%, #aa821d 80%, #5e4308 100%);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.4), 0 2px 8px rgba(0,0,0,0.2);
        }
        .masthead {
          text-align: center;
          margin-bottom: 2rem;
          border-bottom: 0.5px solid #d1c5b0;
          padding-bottom: 1.25rem;
        }
        .masthead h1 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 6vw, 46px);
          line-height: 1.15; letter-spacing: 0.06em; font-weight: 700;
          color: #1c1c18; text-transform: uppercase;
          margin: 0 0 0.5rem; padding-right: 0;
          text-shadow: 0 1px 0 rgba(255,255,255,0.4);
        }
        .masthead p {
          font-size: 16px; line-height: 26px; color: #775a00; font-style: italic;
        }
        .masthead-eyebrow {
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          margin-bottom: 0.75rem;
        }
        .masthead-eyebrow span {
          height: 1px; width: 28px; background: #d1c5b0;
        }
        .masthead-eyebrow-label {
          font-family: 'Noto Serif', serif; font-weight: 700;
          font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase;
          color: #775a00;
        }
        .intro-text {
          font-size: 15px; line-height: 24px; color: #775a00;
          text-align: center; max-width: 560px; margin: 0 auto 1.75rem;
        }
        .divider { border: none; border-top: 0.5px solid #d1c5b0; opacity: 0.55; margin: 1.75rem 0; }
        .role-heading {
          font-family: 'Noto Serif', serif; font-size: 22px; line-height: 30px;
          font-weight: 600; text-align: center; color: #1c1c18; margin: 0 0 1.25rem;
          letter-spacing: 0.02em;
        }
        .role-grid { display: flex; justify-content: center; gap: 1.25rem; flex-wrap: wrap; }
        .role-card {
          border: 1px solid #d1c5b0; padding: 1.25rem; background: #ffffff;
          display: flex; flex-direction: column; justify-content: space-between;
          height: 100%; box-sizing: border-box;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
          min-height: 140px;
          text-decoration: none; cursor: pointer;
          box-shadow: 0 1px 0 rgba(255,255,255,0.5) inset, 0 4px 12px rgba(28,25,23,0.05);
        }
        .role-card.coordinator { border-top: 4px solid #9e7422; }
        .role-card.player      { border-top: 4px solid #9e7422; }
        .role-card:hover {
          border-color: #807664;
          border-top-width: 4px;
          box-shadow: 0 1px 0 rgba(255,255,255,0.5) inset, 0 8px 18px rgba(28,25,23,0.1);
          transform: translateY(-2px);
        }
        .role-card .role-name {
          font-family: 'Noto Serif', serif; font-size: 13px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 0.5rem;
        }
        .role-card.coordinator .role-name { color: #7a2430; }
        .role-card.player      .role-name { color: #775a00; }
        .role-card .role-desc { font-size: 15px; line-height: 22px; color: #775a00; }
        .role-card .go-arrow { margin-top: 1rem; display: flex; justify-content: center; }
        .role-card .go-arrow .box {
          width: 100%; min-width: 140px; padding: 0.6rem 1rem; border: none;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: #fff;
          background: #111927;
          letter-spacing: 0.12em; text-transform: uppercase;
          transition: background 0.15s ease;
        }
        .role-card:hover .go-arrow .box { background: #1f293d; }
        .reg-footer {
          margin-top: 1.75rem; text-align: center;
          max-width: 820px; width: 100%;
          display: flex; flex-direction: column;
          justify-content: space-between; align-items: center;
          padding: 0.75rem 2rem; background: #faf6ee;
          border-top: 0.5pt solid #d1c5b0;
          font-size: 12px; line-height: 16px; font-weight: 500; color: #775a00;
          gap: 0.25rem;
          box-shadow: 0 -1px 0 rgba(255,255,255,0.5) inset;
        }
        @media (min-width: 540px) { .reg-footer { flex-direction: row; gap: 0.75rem; } }
      `}</style>

      <div className="reg-body">
        <main className="doc-card">
          {/* Stamp */}
          <div className="stamp">THỬ<br />VẬN<br />MAY</div>

          {/* Masthead */}
          <header className="masthead">
         
            <h1>THỬ VẬN MAY</h1>
            <p>Xúc xắc, lá phép và 35 cơ hội may mắn</p>
          </header>



          <div className="flex items-center justify-center gap-3 w-full max-w-[620px] mx-auto mb-9">
            <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent via-[#d1c5b0] to-transparent" />
            <div className="w-1.5 h-1.5 rotate-45 border border-[#807664] bg-[#807664]/40" />
            <div className="h-[1px] flex-grow bg-gradient-to-l from-transparent via-[#d1c5b0] to-transparent" />
          </div>

          <hr className="divider" />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
            <label htmlFor="landing-pin"              style={{ fontFamily: "'Noto Serif', serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem', color: '#775a00' }}>MÃ PIN PHÒNG CHƠI</label>
            <input
              id="landing-pin"
              value={pin}
              onChange={e => setPin(e.target.value)}
              maxLength={8}
              autoComplete="off"
              inputMode="numeric"
              style={{ border: '1px solid #807664', padding: '0.5rem 1rem', fontSize: '20px', textAlign: 'center', maxWidth: '160px', fontFamily: "'Playfair Display', serif", fontWeight: '900', color: '#111927', letterSpacing: '0.32em', boxShadow: '0 1px 0 rgba(255,255,255,0.5) inset, 0 1px 3px rgba(28,25,23,0.06)' }}
            />

          </div>

          {/* Role navigation */}
          <div>
            <div className="role-grid">


              <Link to="/pick-team" className="role-card player" onClick={savePin}>
                <div>
                  <div className="role-name">NGƯỜI CHƠI</div>
                  <p className="role-desc">Trả lời câu hỏi, tung xúc xắc, bốc lá phép.</p>
                </div>
                <div className="go-arrow"><div className="box">VÀO PHÒNG →</div></div>
              </Link>
            </div>
          </div>
        </main>

        <footer className="reg-footer">
          <span>© 2026 THỬ VẬN MAY</span>
          <span>Trò chơi lớp học nhiều thiết bị · 2–7 đội</span>
        </footer>
      </div>
    </>
  )
}
