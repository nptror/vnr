import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { findGameByPin, joinGame, fetchTeams, subscribeToGame, createCoalescedReloader } from '../game/gameRepository'
import { TEAM_CATALOG as TEAMS } from '../game/catalog'
import { readSession, saveSession } from '../game/session'
import { isSupabaseConfigured } from '../lib/supabase'

export default function PickTeam() {
    const navigate = useNavigate()
    const [pin] = useState(() => localStorage.getItem('vnr_game_pin') || '1986')
    const [error, setError] = useState(null)
    const [joining, setJoining] = useState(false)
    const [gameId, setGameId] = useState(null)
    const [dbTeams, setDbTeams] = useState([])
    // Read once: an already-joined session for THIS browser/device, if any —
    // used to offer "continue" instead of showing the player's own team as a
    // dead-end greyed-out card if they land back on this page (e.g. hit the
    // browser back button right after joining).
    const [existingSession] = useState(readSession)

    // Find the active room for this PIN once, then keep polling/subscribing
    // for its team rows so "already taken" greys out live as others join —
    // the grid itself still renders from the local TEAMS metadata below, this
    // only tracks which team_key already has joined_at set.
    useEffect(() => {
        if (!isSupabaseConfigured) return undefined
        let cancelled = false
        findGameByPin(pin.trim())
            .then((g) => { if (!cancelled) setGameId(g ? g.id : null) })
            .catch(() => { if (!cancelled) setGameId(null) })
        return () => { cancelled = true }
    }, [pin])

    const reload = useMemo(() => {
        if (!gameId) return null
        return createCoalescedReloader(async () => {
            try {
                setDbTeams(await fetchTeams(gameId))
            } catch {
                // Transient error — the next scheduled/subscribed reload retries.
            }
        })
    }, [gameId])

    useEffect(() => {
        if (!reload || !isSupabaseConfigured) return undefined
        reload.schedule()
        const id = setInterval(() => reload.schedule(), 5000)
        return () => { clearInterval(id); reload.cancel() }
    }, [reload])

    useEffect(() => {
        if (!gameId || !isSupabaseConfigured || !reload) return undefined
        return subscribeToGame(gameId, () => reload.schedule())
    }, [gameId, reload])

    const takenKeys = useMemo(
        () => new Set(dbTeams.filter((t) => t.joined_at).map((t) => t.team_key)),
        [dbTeams]
    )

    // Phòng tạo với N đội (2–7) chỉ có đúng N hàng trong DB — grid phải lọc
    // theo roomKeys, nếu không phòng 3 đội vẫn hiện đủ 7 thẻ và bấm thẻ thừa
    // sẽ join một team_key không tồn tại. Guard dbTeams.length là bắt buộc:
    // fetchTeams chạy lần đầu qua poll 5s/realtime, không guard thì grid rỗng
    // rồi mới có data — nhấp nháy khó chịu ở mỗi lần tải trang.
    const roomKeys = useMemo(
        () => new Set(dbTeams.map((t) => t.team_key)),
        [dbTeams]
    )
    const visibleTeams = dbTeams.length ? TEAMS.filter((t) => roomKeys.has(t.id)) : []

    const handleDirectJoin = async (team) => {
        if (!isSupabaseConfigured) {
            setError('Supabase chưa được cấu hình.')
            return
        }
        if (takenKeys.has(team.id)) return
        // DB có thể đổi giữa lúc render (race: host vừa tạo lại phòng) — chặn
        // ở đây thay vì để joinGame throw TEAM_NOT_FOUND.
        if (!roomKeys.has(team.id)) return
        setJoining(true)
        setError(null)
        try {
            const game = await findGameByPin(pin.trim())
            if (!game) {
                throw new Error(`Không tìm thấy phòng với mã ${pin.trim()}. Người điều phối cần mở /host (một lần) để tạo phòng trước — sau đó bấm lại đội.`)
            }
            // By default, the team code is equal to the team id (e.g. 'red')
            const { gameId: joinedGameId, teamKey } = await joinGame(game.id, team.id, team.id)
            saveSession({ gameId: joinedGameId, teamKey })
            navigate('/play')
        } catch (err) {
            setError(err.message || 'Không thể tham gia. Kiểm tra lại cấu hình hoặc liên hệ Host.')
            // Someone else may have just taken this team (TEAM_TAKEN) — refresh
            // immediately instead of waiting for the next poll/realtime tick.
            reload?.schedule()
        } finally {
            setJoining(false)
        }
    }

    return (
        <>
            <style>{`
        .pt-page {
          min-height: 100svh;
          display: flex;
          flex-direction: column;
          font-family: 'Noto Sans', sans-serif;
          color: #1c1c18;
          background-color: #F7F3E9;
          width: 100%;
          box-sizing: border-box;
        }
        .pt-nav {
          background: #faf6ee;
          border-bottom: 3px double #caa048;
          width: 100%;
          position: sticky;
          top: 0;
          z-index: 50;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          box-shadow: 0 1px 0 rgba(255,255,255,0.5) inset, 0 2px 6px rgba(28,28,24,0.04);
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
          letter-spacing: 0.08em;
          color: #775a00;
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
          line-height: 1.15; letter-spacing: 0.04em; font-weight: 700;
          color: #775a00;
          margin: 0 0 1rem;
          display: inline-block;
          border-bottom: 2px solid #caa048;
          padding-bottom: 1rem;
          text-shadow: 0 1px 0 rgba(255,255,255,0.4);
        }
        .pt-header p {
          font-size: 18px; line-height: 28px;
          color: #775a00; font-style: italic;
        }
        .pt-pin-row {
          display: flex; gap: 0.75rem; align-items: center; justify-content: center;
          margin-bottom: 3rem; flex-wrap: wrap;
        }
        .pt-pin-row label {
          font-family: 'Noto Serif', serif; font-weight: 700;
          font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase;
          color: #775a00;
        }
        .pt-pin-row input {
          border: 1px solid #807664; padding: 0.6rem 1rem; font-size: 16px;
          background: #ffffff; min-width: 140px;
          color: #1c1c18; -webkit-text-fill-color: #1c1c18;
          letter-spacing: 0.08em;
          box-shadow: 0 1px 0 rgba(255,255,255,0.5) inset, 0 1px 3px rgba(28,28,24,0.06);
        }
        .pt-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 1rem;
          max-width: 1280px;
          width: 100%;
        }
        @media (min-width: 640px)  { .pt-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 900px)  { .pt-grid { grid-template-columns: repeat(4, 1fr); } }
        @media (min-width: 1280px) { .pt-grid { grid-template-columns: repeat(7, 1fr); } }
        .pt-card {
          background: #fcf9f2;
          border: 1px solid #d1c5b0;
          border-top-width: 8px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          min-height: auto;
          box-sizing: border-box;
          box-shadow: 0 1px 0 rgba(255,255,255,0.6) inset, 0 4px 12px rgba(28,25,23,0.05);
          transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
        }
        .pt-card-taken:hover {
          border-color: #d1c5b0;
          box-shadow: 0 1px 0 rgba(255,255,255,0.6) inset, 0 4px 12px rgba(28,25,23,0.05);
          transform: none !important;
          cursor: not-allowed;
        }
        .pt-card-taken {
          cursor: not-allowed;
        }
        .pt-card-body { text-align: center; width: 100%; }
        .pt-card-icon {
          font-size: 56px !important;
          margin-bottom: 1rem;
          display: block;
          font-variation-settings: 'FILL' 1;
          transition: transform 0.15s ease;
        }
        .pt-card:hover .pt-card-icon {
          transform: scale(1.03);
        }
        .pt-card-taken .pt-card-icon {
          opacity: 0.6;
        }
        .pt-card-name {
          font-family: 'Noto Serif', serif;
          font-size: 22px; line-height: 30px; font-weight: 600;
          color: #1c1c18;
          margin: 0 0 0.75rem;
          letter-spacing: 0.02em;
        }
        .pt-card-divider {
          height: 1px; background: #d1c5b0;
          margin: 0 0 1rem; border: none;
        }
        .pt-card-desc {
          font-size: 14px; line-height: 20px; color: #775a00;
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
          transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
          border-width: 2px;
        }
        .pt-join-btn:hover:not(:disabled) {
          background: #1f293d !important;
          border-color: #1f293d !important;
        }
        .pt-join-btn:active:not(:disabled) {
          transform: translateY(1px);
        }
        .pt-join-btn.border-width-2 {
          border-width: 2px;
        }
        .pt-modal-backdrop {
          position: fixed; inset: 0; background: rgba(20,16,10,0.45);
          display: flex; align-items: center; justify-content: center; z-index: 80;
          padding: 20px;
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
        }
        .pt-modal {
          background: #fdfbf7; border: 3px double #d1c5b0; padding: 2rem;
          max-width: 380px; width: 100%;
          box-shadow: 0 8px 28px rgba(28,25,23,0.12);
        }
        .pt-modal h3 {
          font-family: 'Noto Serif', serif; font-size: 18px; margin: 0 0 1rem;
          color: #1c1c18;
        }
        .pt-modal label {
          display: block; font-size: 12px; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; color: #775a00; margin-bottom: 4px; margin-top: 12px;
        }
        .pt-modal input {
          width: 100%; box-sizing: border-box; border: 1px solid #d1c5b0;
          padding: 0.6rem 0.75rem; font-size: 16px;
          color: #1c1c18; -webkit-text-fill-color: #1c1c18; background: #fff;
          box-shadow: 0 1px 0 rgba(255,255,255,0.5) inset;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .pt-modal input:focus {
          outline: 2px solid #807664;
          outline-offset: 2px;
          border-color: #807664;
          box-shadow: 0 0 0 3px rgba(212,175,55,0.18);
        }
        .pt-modal input::placeholder {
          color: #a39a85;
        }
        .pt-modal-actions { display: flex; gap: 0.5rem; margin-top: 1.5rem; }
        .pt-modal-actions button {
          flex: 1; padding: 0.6rem; font-family: 'Noto Serif', serif;
          font-weight: 700; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase;
          border: 1px solid #d1c5b0; cursor: pointer; background: #fff;
          color: #1c1c18;
          transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
        }
        .pt-modal-actions button:hover {
          border-color: #807664;
          background: #fcf9f2;
          box-shadow: 0 1px 0 rgba(255,255,255,0.5) inset;
        }
        .pt-modal-actions button.primary { background: #7a2430; color: #fff; border-color: #7a2430; }
        .pt-modal-actions button.primary:hover { background: #5a1a22 !important; border-color: #5a1a22 !important; }
        .pt-modal-error { color: #b4423a; font-size: 13px; margin-top: 0.75rem; }
        .pt-footer {
          background: #faf6ee;
          border-top: 0.5pt solid #d1c5b0;
          width: 100%;
          padding: 1.5rem 2rem;
          text-align: center;
          margin-top: auto;
          box-shadow: 0 -1px 0 rgba(255,255,255,0.5) inset;
        }
        .pt-footer-copy {
          font-family: 'Noto Serif', serif;
          font-size: 13px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: #775a00;
        }
      `}</style>

            <div className="pt-page">
                <nav className="pt-nav">
                    <div className="pt-nav-inner">
                        <span className="pt-nav-title">Thử Vận May</span>
                    </div>
                </nav>

                <main className="pt-main">
                    <header className="pt-header">
                        <h1>CHỌN ĐỘI MAY MẮN CỦA BẠN</h1>
                        <p>Chọn đội của bạn và nhập mã đội để tham gia.</p>
                    </header>



                    {existingSession && gameId && existingSession.gameId === gameId && (
                        <div
                            style={{
                                marginBottom: 24, textAlign: 'center', padding: '1rem 1.5rem',
                                border: '1px solid #d1c5b0', background: '#faf6ee', maxWidth: 480,
                            }}
                        >
                            <p style={{ margin: '0 0 0.75rem', fontSize: 15 }}>
                                Bạn đã tham gia đội{' '}
                                <strong>{TEAMS.find((t) => t.id === existingSession.teamKey)?.name ?? existingSession.teamKey}</strong>{' '}
                                trong ván này rồi.
                            </p>
                            <button
                                type="button"
                                className="pt-join-btn"
                                style={{ backgroundColor: '#111927', borderColor: '#111927', width: 'auto', padding: '0.6rem 1.5rem' }}
                                onClick={() => navigate('/play')}
                            >
                                TIẾP TỤC VÀO VÁN CHƠI
                            </button>
                        </div>
                    )}

                    {!isSupabaseConfigured && (
                        <div className="pt-modal-error" style={{ marginBottom: 24, textAlign: 'center' }}>
                            Supabase chưa được cấu hình — không thể tham gia phòng chơi.
                        </div>
                    )}
                    {error && (
                        <div className="pt-modal-error" style={{ marginBottom: 24, textAlign: 'center', fontSize: '16px' }}>
                            {error}
                        </div>
                    )}

                    <div className="pt-grid">
                        {visibleTeams.map((team) => {
                            const taken = takenKeys.has(team.id)
                            return (
                                <article
                                    key={team.id}
                                    className={"pt-card" + (taken ? " pt-card-taken" : "")}
                                    style={{
                                        borderTopColor: team.color,
                                        transform: `rotate(${team.rotate})`,
                                        opacity: taken ? 0.45 : 1,
                                        filter: taken ? 'grayscale(1)' : 'none',
                                        boxShadow: '0 4px 12px rgba(28,25,23,0.05)',
                                    }}
                                >
                                    <div className="pt-card-body">
                                        <span
                                            className="material-symbols-outlined pt-card-icon"
                                            style={{ color: team.color, fontVariationSettings: "'FILL' 1", fontSize: 'clamp(36px, 4vw, 56px)' }}
                                        >
                                            {team.icon}
                                        </span>
                                        <h2 className="pt-card-name" style={{ fontSize: 'clamp(13px, 1.2vw, 16px)', lineHeight: '1.2', marginBottom: '0.5rem' }}>{team.name}</h2>
                                        <div style={{ flex: 1, minHeight: 0 }} />
                                        <button
                                            className="pt-join-btn"
                                            style={{ backgroundColor: team.color, borderColor: team.color, cursor: taken ? 'not-allowed' : 'pointer' }}
                                            disabled={!isSupabaseConfigured || joining || taken}
                                            onClick={() => handleDirectJoin(team)}
                                        >
                                            {taken ? 'ĐÃ CÓ NGƯỜI CHỌN' : joining ? 'ĐANG VÀO...' : 'THAM GIA'}
                                        </button>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                </main>

                <footer className="pt-footer">
                    <div className="pt-footer-copy">© 2026 THỬ VẬN MAY - TRÒ CHƠI MAY MẮN CHO LỚP HỌC</div>
                </footer>

            </div>
        </>
    )
}
