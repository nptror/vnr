import { useNavigate } from 'react-router-dom'

const TEAMS = [
    {
        id: 'red',
        name: 'Đội Đỏ',
        color: '#7A2430',
        shadow: '#5c0c1c',
        icon: 'star',
        desc: 'Lực lượng nòng cốt, tiên phong trong mọi thử thách.',
        rotate: '-0.2deg',
    },
    {
        id: 'blue',
        name: 'Đội Xanh',
        color: '#1F4E66',
        shadow: '#1F4E66',
        icon: 'menu_book',
        desc: 'Trí tuệ chiến lược, nền tảng của tri thức.',
        rotate: '0.4deg',
    },
    {
        id: 'yellow',
        name: 'Đội Vàng',
        color: '#B8860B',
        shadow: '#B8860B',
        icon: 'grass',
        desc: 'Gắn kết bền bỉ, mang lại sự phồn vinh.',
        rotate: '-0.5deg',
    },
    {
        id: 'purple',
        name: 'Đội Tím',
        color: '#4A3A6B',
        shadow: '#4A3A6B',
        icon: 'local_fire_department',
        desc: 'Ngọn đuốc sáng tạo, dẫn lối tương lai.',
        rotate: '0.1deg',
    },
    {
        id: 'orange',
        name: 'Đội Cam',
        color: '#D97706',
        shadow: '#D97706',
        icon: 'flag',
        desc: 'Xung kích, đi đầu trong mọi phong trào đổi mới.',
        rotate: '0.3deg',
    },
    {
        id: 'pink',
        name: 'Đội Hồng',
        color: '#DB2777',
        shadow: '#DB2777',
        icon: 'favorite',
        desc: 'Gắn kết cộng đồng, lan tỏa giá trị nhân văn.',
        rotate: '-0.3deg',
    },
    {
        id: 'lam',
        name: 'Đội Lam',
        color: '#2563EB',
        shadow: '#2563EB',
        icon: 'verified_user',
        desc: 'Bảo vệ thành quả, giữ vững kỷ cương hệ thống.',
        rotate: '0.2deg',
    },
]

export default function PickTeam() {
    const navigate = useNavigate()

    const handleJoin = (team) => {
        console.log('Joined team:', team.id)
        navigate('/play')
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
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
          width: 100%;
          box-sizing: border-box;
        }

        /* Nav */
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
        .pt-nav-actions { display: flex; gap: 0.5rem; }
        .pt-nav-btn {
          background: none; border: none; cursor: pointer;
          color: #5c0c1c; padding: 0.5rem; border-radius: 9999px;
          line-height: 1; transition: background 0.15s;
          display: flex; align-items: center;
        }
        .pt-nav-btn:hover { background: #ffdadb; }
        .pt-nav-btn .material-symbols-outlined { font-size: 24px; }

        /* Main */
        .pt-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
          position: relative;
          overflow: hidden;
        }

        /* Stamp */
        .pt-stamp {
          position: absolute;
          top: 3rem; right: 3rem;
          width: 8rem; height: 8rem;
          border-radius: 9999px;
          border: 2px solid #ba1a1a;
          color: #ba1a1a;
          transform: rotate(-15deg);
          opacity: 0.8;
          display: flex; align-items: center; justify-content: center;
          text-align: center;
          font-family: 'Noto Serif', serif;
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          line-height: 1.3;
          pointer-events: none; user-select: none;
        }

        /* Header */
        .pt-header {
          text-align: center;
          margin-bottom: 4rem;
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

        /* Grid */
        .pt-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 2rem;
          max-width: 1200px;
          width: 100%;
        }
        @media (min-width: 640px)  { .pt-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .pt-grid { grid-template-columns: repeat(4, 1fr); } }

        /* Team card */
        .pt-card {
          background: #ffffff;
          border: 1px solid #887272;
          border-top-width: 8px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          min-height: 300px;
          box-shadow: 0 1px 0 0 #d3d9f0;
          transition: transform 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .pt-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 0 0 #d3d9f0;
        }
        .pt-card-body { text-align: center; width: 100%; }
        .pt-card-icon {
          font-size: 64px !important;
          margin-bottom: 1rem;
          display: block;
          font-variation-settings: 'FILL' 1;
        }
        .pt-card-name {
          font-family: 'Noto Serif', serif;
          font-size: 24px; line-height: 32px; font-weight: 600;
          color: #141b2c;
          margin: 0 0 0.75rem;
        }
        .pt-card-divider {
          height: 1px; background: #dbc0c1;
          margin: 0 0 1rem; border: none;
        }
        .pt-card-desc {
          font-size: 15px; line-height: 22px; color: #554243;
          margin-bottom: 1.5rem;
        }

        /* Join button */
        .pt-join-btn {
          width: 100%;
          font-family: 'Noto Serif', serif;
          font-size: 13px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          padding: 0.75rem 0;
          border: 2px solid;
          cursor: pointer;
          color: #fff;
          transition: background 0.15s, color 0.15s, transform 0.1s, box-shadow 0.1s;
        }
        .pt-join-btn:hover {
          background: transparent !important;
          transform: translateY(-1px);
        }

        /* Footer */
        .pt-footer {
          background: #faf8ff;
          border-top: 0.5pt solid #887272;
          width: 100%;
          padding: 1.5rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          margin-top: auto;
        }
        .pt-footer-copy {
          font-family: 'Noto Serif', serif;
          font-size: 13px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: #7b5800;
        }
        .pt-footer-links { display: flex; gap: 1.5rem; }
        .pt-footer-links a {
          font-size: 12px; line-height: 16px; font-weight: 500;
          color: #554243; font-style: italic; text-decoration: none;
          transition: color 0.15s;
        }
        .pt-footer-links a:hover { color: #5c0c1c; }
      `}</style>

            <div className="pt-page">
                {/* Nav */}
                <nav className="pt-nav">
                    <div className="pt-nav-inner">
                        <span className="pt-nav-title">Hành Trình Đổi Mới</span>
                        <div className="pt-nav-actions">
                            <button className="pt-nav-btn" title="Lịch sử">
                                <span className="material-symbols-outlined">history_edu</span>
                            </button>
                            <button className="pt-nav-btn" title="Cơ quan">
                                <span className="material-symbols-outlined">account_balance</span>
                            </button>
                        </div>
                    </div>
                </nav>

                {/* Main */}
                <main className="pt-main">
                    {/* Stamp */}
                    <div className="pt-stamp">VĂN KIỆN<br />ĐẢNG</div>

                    {/* Header */}
                    <header className="pt-header">
                        <h1>XÁC ĐỊNH ĐƠN VỊ CHIẾN ĐẤU</h1>
                        <p>Vui lòng chọn đội ngũ của bạn để bắt đầu hành trình.</p>
                    </header>

                    {/* Team Grid */}
                    <div className="pt-grid">
                        {TEAMS.map((team) => (
                            <article
                                key={team.id}
                                className="pt-card"
                                style={{
                                    borderTopColor: team.color,
                                    transform: `rotate(${team.rotate})`,
                                }}
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
                                    style={{
                                        backgroundColor: team.color,
                                        borderColor: team.color,
                                        '--team-color': team.color,
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent'
                                        e.currentTarget.style.color = team.color
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.backgroundColor = team.color
                                        e.currentTarget.style.color = '#fff'
                                    }}
                                    onClick={() => handleJoin(team)}
                                >
                                    THAM GIA
                                </button>
                            </article>
                        ))}
                    </div>
                </main>

                {/* Footer */}
                <footer className="pt-footer">
                    <div className="pt-footer-copy">
                        © 1986 BAN TUYÊN GIÁO TRUNG ƯƠNG - LƯU TRỮ QUỐC GIA
                    </div>
                    <ul className="pt-footer-links">
                        <li><a href="#">Bảo mật</a></li>
                        <li><a href="#">Điều lệ</a></li>
                        <li><a href="#">Lưu trữ</a></li>
                    </ul>
                </footer>
            </div>
        </>
    )
}
