import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { findGameByPin, joinGame } from '../game/gameRepository'
import { isSupabaseConfigured } from '../lib/supabase'

const SESSION_KEY = 'vnr_game_session'

const TEAMS = [
    {
        id: 'red',
        name: 'Đội Đỏ',
        color: '#7A2430',
        icon: 'star',
        desc: 'Lực lượng nòng cốt, tiên phong trong mọi thử thách.',
        rotate: '-0.2deg',
    },
    {
        id: 'blue',
        name: 'Đội Xanh',
        color: '#1F4E66',
        icon: 'menu_book',
        desc: 'Trí tuệ chiến lược, nền tảng của tri thức.',
        rotate: '0.4deg',
    },
    {
        id: 'yellow',
        name: 'Đội Vàng',
        color: '#B8860B',
        icon: 'grass',
        desc: 'Gắn kết bền bỉ, mang lại sự phồn vinh.',
        rotate: '-0.5deg',
    },
    {
        id: 'purple',
        name: 'Đội Tím',
        color: '#4A3A6B',
        icon: 'local_fire_department',
        desc: 'Ngọn đuốc sáng tạo, dẫn lối tương lai.',
        rotate: '0.1deg',
    },
    {
        id: 'orange',
        name: 'Đội Cam',
        color: '#D97706',
        icon: 'flag',
        desc: 'Xung kích, đi đầu trong mọi phong trào đổi mới.',
        rotate: '0.3deg',
    },
    {
        id: 'pink',
        name: 'Đội Hồng',
        color: '#DB2777',
        icon: 'favorite',
        desc: 'Gắn kết cộng đồng, lan tỏa giá trị nhân văn.',
        rotate: '-0.3deg',
    },
    {
        id: 'lam',
        name: 'Đội Lam',
        color: '#2563EB',
        icon: 'verified_user',
        desc: 'Bảo vệ thành quả, giữ vững kỷ cương hệ thống.',
        rotate: '0.2deg',
    },
]

export default function PickTeam() {
    const navigate = useNavigate()
    const pinInputRef = useRef(null)
    const [pin, setPin] = useState('')
    const [pinError, setPinError] = useState(null)
    const [teamCode, setTeamCode] = useState('')
    const [selectedTeam, setSelectedTeam] = useState(null)
    const [error, setError] = useState(null)
    const [joining, setJoining] = useState(false)

    const openJoinForm = (team) => {
        if (!pin.trim()) {
            setPinError('Nhập mã PIN phòng trước khi chọn đội.')
            pinInputRef.current?.focus()
            return
        }
        setPinError(null)
        setSelectedTeam(team)
        setTeamCode('')
        setError(null)
    }

    const handleJoin = async (e) => {
        e.preventDefault()
        if (!selectedTeam) return
        if (!isSupabaseConfigured) {
            setError('Supabase chưa được cấu hình.')
            return
        }
        setJoining(true)
        setError(null)
        try {
            const game = await findGameByPin(pin.trim())
            if (!game) throw new Error('Không tìm thấy phòng chơi với mã PIN này.')
            const { gameId, teamKey } = await joinGame(game.id, selectedTeam.id, teamCode.trim())
            localStorage.setItem(SESSION_KEY, JSON.stringify({ gameId, teamKey }))
            navigate('/play')
        } catch (err) {
            setError(err.message || 'Không thể tham gia. Kiểm tra lại PIN và mã đội.')
        } finally {
            setJoining(false)
        }
    }

    return (
        <>
            <link
                href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,600;0,700;1,400&family=Noto+Sans:wght@400;500&display=swap"
                rel="stylesheet"
            />
            <link
                href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
                rel="stylesheet"
            />

            <style>{`
        .pt-page {
          min-height: 100svh;
          display: flex;
          flex-direction: column;
          font-family: 'Noto Sans', sans-serif;
          color: #141b2c;
          background-color: #f4f1ea;
          width: 100%;
          box-sizing: border-box;
        }
        .pt-nav {
          background: #faf8ff;
          border-bottom: 3px double #887272;
          width: 100%;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .pt-nav-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .pt-nav-title {
          font-family: 'Noto Serif', serif;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 0.01em;
          color: #5c0c1c;
          text-transform: uppercase;
        }
        .pt-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
          position: relative;
        }
        .pt-header {
          text-align: center;
          margin-bottom: 2.5rem;
          max-width: 768px;
        }
        .pt-header h1 {
          font-family: 'Noto Serif', serif;
          font-size: clamp(28px, 5vw, 48px);
          line-height: 1.15; letter-spacing: -0.02em; font-weight: 700;
          color: #5c0c1c;
          margin: 0 0 1rem;
          display: inline-block;
          border-bottom: 2px solid #dbc0c1;
          padding-bottom: 1rem;
        }
        .pt-header p {
          font-size: 18px; line-height: 28px;
          color: #554243; font-style: italic;
        }
        .pt-pin-row {
          display: flex; gap: 0.75rem; align-items: center; justify-content: center;
          margin-bottom: 3rem; flex-wrap: wrap;
        }
        .pt-pin-row label {
          font-family: 'Noto Serif', serif; font-weight: 700;
          font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase;
          color: #554243;
        }
        .pt-pin-row input {
          border: 1px solid #887272; padding: 0.6rem 1rem; font-size: 16px;
          background: #fff; min-width: 140px;
        }
        .pt-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 2rem;
          max-width: 1200px;
          width: 100%;
        }
        @media (min-width: 640px)  { .pt-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .pt-grid { grid-template-columns: repeat(4, 1fr); } }
        .pt-card {
          background: #ffffff;
          border: 1px solid #887272;
          border-top-width: 8px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          min-height: 260px;
          box-sizing: border-box;
        }
        .pt-card-body { text-align: center; width: 100%; }
        .pt-card-icon {
          font-size: 56px !important;
          margin-bottom: 1rem;
          display: block;
          font-variation-settings: 'FILL' 1;
        }
        .pt-card-name {
          font-family: 'Noto Serif', serif;
          font-size: 22px; line-height: 30px; font-weight: 600;
          color: #141b2c;
          margin: 0 0 0.75rem;
        }
        .pt-card-divider {
          height: 1px; background: #dbc0c1;
          margin: 0 0 1rem; border: none;
        }
        .pt-card-desc {
          font-size: 14px; line-height: 20px; color: #554243;
          margin-bottom: 1.5rem;
        }
        .pt-join-btn {
          width: 100%;
          font-family: 'Noto Serif', serif;
          font-size: 13px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          padding: 0.75rem 0;
          border: 2px solid;
          cursor: pointer;
          color: #fff;
        }
        .pt-modal-backdrop {
          position: fixed; inset: 0; background: rgba(20,16,10,0.55);
          display: flex; align-items: center; justify-content: center; z-index: 80;
          padding: 20px;
        }
        .pt-modal {
          background: #fdfbf7; border: 3px double #141b2c; padding: 2rem;
          max-width: 380px; width: 100%;
        }
        .pt-modal h3 {
          font-family: 'Noto Serif', serif; font-size: 18px; margin: 0 0 1rem;
        }
        .pt-modal label {
          display: block; font-size: 12px; font-weight: 700; letter-spacing: 0.06em;
          text-transform: uppercase; color: #554243; margin-bottom: 4px; margin-top: 12px;
        }
        .pt-modal input {
          width: 100%; box-sizing: border-box; border: 1px solid #887272;
          padding: 0.6rem 0.75rem; font-size: 16px;
        }
        .pt-modal-actions { display: flex; gap: 0.5rem; margin-top: 1.5rem; }
        .pt-modal-actions button {
          flex: 1; padding: 0.6rem; font-family: 'Noto Serif', serif;
          font-weight: 700; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase;
          border: 1px solid #887272; cursor: pointer; background: #fff;
        }
        .pt-modal-actions button.primary { background: #7a2430; color: #fff; border-color: #7a2430; }
        .pt-modal-error { color: #ba1a1a; font-size: 13px; margin-top: 0.75rem; }
        .pt-footer {
          background: #faf8ff;
          border-top: 0.5pt solid #887272;
          width: 100%;
          padding: 1.5rem 2rem;
          text-align: center;
          margin-top: auto;
        }
        .pt-footer-copy {
          font-family: 'Noto Serif', serif;
          font-size: 13px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: #7b5800;
        }
      `}</style>

            <div className="pt-page">
                <nav className="pt-nav">
                    <div className="pt-nav-inner">
                        <span className="pt-nav-title">Hành Trình Đổi Mới</span>
                    </div>
                </nav>

                <main className="pt-main">
                    <header className="pt-header">
                        <h1>XÁC ĐỊNH ĐƠN VỊ CHIẾN ĐẤU</h1>
                        <p>Nhập mã PIN phòng chơi, chọn đội của bạn và nhập mã đội để tham gia.</p>
                    </header>

                    <div className="pt-pin-row">
                        <label htmlFor="pt-pin">Mã PIN phòng</label>
                        <input
                            id="pt-pin"
                            ref={pinInputRef}
                            value={pin}
                            onChange={(e) => {
                                setPin(e.target.value)
                                if (pinError) setPinError(null)
                            }}
                            placeholder="1986"
                        />
                    </div>
                    {pinError && (
                        <div className="pt-modal-error" style={{ marginBottom: 24, textAlign: 'center' }}>
                            {pinError}
                        </div>
                    )}

                    {!isSupabaseConfigured && (
                        <div className="pt-modal-error" style={{ marginBottom: 24 }}>
                            Supabase chưa được cấu hình — không thể tham gia phòng chơi.
                        </div>
                    )}

                    <div className="pt-grid">
                        {TEAMS.map((team) => (
                            <article
                                key={team.id}
                                className="pt-card"
                                style={{ borderTopColor: team.color, transform: `rotate(${team.rotate})` }}
                            >
                                <div className="pt-card-body">
                                    <span
                                        className="material-symbols-outlined pt-card-icon"
                                        style={{ color: team.color, fontVariationSettings: "'FILL' 1" }}
                                    >
                                        {team.icon}
                                    </span>
                                    <h2 className="pt-card-name">{team.name}</h2>
                                    <hr className="pt-card-divider" />
                                    <p className="pt-card-desc">{team.desc}</p>
                                </div>

                                <button
                                    className="pt-join-btn"
                                    style={{ backgroundColor: team.color, borderColor: team.color }}
                                    disabled={!isSupabaseConfigured}
                                    onClick={() => openJoinForm(team)}
                                >
                                    THAM GIA
                                </button>
                            </article>
                        ))}
                    </div>
                </main>

                <footer className="pt-footer">
                    <div className="pt-footer-copy">© 1986 BAN TUYÊN GIÁO TRUNG ƯƠNG - LƯU TRỮ QUỐC GIA</div>
                </footer>

                {selectedTeam && (
                    <div className="pt-modal-backdrop" onClick={() => !joining && setSelectedTeam(null)}>
                        <div className="pt-modal" onClick={(e) => e.stopPropagation()}>
                            <h3 style={{ color: selectedTeam.color }}>Tham gia {selectedTeam.name}</h3>
                            <form onSubmit={handleJoin}>
                                <label htmlFor="pt-code">Mã đội (do Host cung cấp)</label>
                                <input
                                    id="pt-code"
                                    autoFocus
                                    value={teamCode}
                                    onChange={(e) => setTeamCode(e.target.value)}
                                    placeholder={selectedTeam.id}
                                />
                                {error && <div className="pt-modal-error">{error}</div>}
                                <div className="pt-modal-actions">
                                    <button type="button" onClick={() => setSelectedTeam(null)} disabled={joining}>
                                        Hủy
                                    </button>
                                    <button type="submit" className="primary" disabled={joining || !teamCode.trim()}>
                                        {joining ? 'Đang vào...' : 'Xác nhận'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}
