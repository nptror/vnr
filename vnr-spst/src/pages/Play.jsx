import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCardByNumber } from '../game/catalog'
import { loadGame, subscribeToGame, createCoalescedReloader, submitAnswerEvent, submitDiceRollEvent, submitEffectTargetEvent, sendMemeDrop } from '../game/gameRepository'
import { isSupabaseConfigured } from '../lib/supabase'
import MemePanel from '../components/MemePanel.jsx'

const SESSION_KEY = 'vnr_game_session'
const OPTION_LABELS = ['A', 'B', 'C', 'D']
const ANSWER_SECONDS = 15

const PLAY_STYLE = `
  .play-page {
    min-height: 100svh;
    display: flex;
    flex-direction: column;
    font-family: 'Noto Sans', sans-serif;
    color: #141b2c;
    background-color: #faf8ff;
    background-image:
      radial-gradient(#dbc0c1 1px, transparent 1px),
      radial-gradient(#dbc0c1 1px, transparent 1px);
    background-size: 20px 20px;
    background-position: 0 0, 10px 10px;
    width: 100%;
    box-sizing: border-box;
  }

  /* ── Top header ── */
  .play-header {
    background: #faf8ff;
    border-bottom: 3px double #141b2c;
    width: 100%;
    position: sticky; top: 0; z-index: 50;
  }
  .play-header-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }
  .play-title {
    font-family: 'Noto Serif', serif;
    font-size: clamp(22px, 4vw, 40px);
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #5c0c1c;
    border-bottom: 4px double #887272;
    padding-bottom: 2px;
  }

  /* ── Body layout ── */
  .play-body {
    flex: 1;
    display: flex;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
  }

  /* ── Sidebar ── */
  .play-sidebar {
    display: none;
    flex-direction: column;
    width: 280px;
    min-width: 280px;
    border-right: 3px double #887272;
    background: rgba(250,248,255,0.85);
    padding: 1.5rem;
    overflow-y: auto;
    position: relative;
    z-index: 10;
  }
  @media (min-width: 1024px) { .play-sidebar { display: flex; } }
  .sidebar-title {
    font-family: 'Noto Serif', serif;
    font-size: 16px; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: #5c0c1c;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid #887272;
    padding-bottom: 0.75rem;
  }
  .sidebar-list {
    display: flex; flex-direction: column; gap: 1.25rem;
    position: relative;
  }
  .sidebar-timeline-line {
    position: absolute;
    left: 11px; top: 1rem; bottom: 1rem;
    width: 1px;
    border-left: 2px dashed #dbc0c1;
  }
  .sidebar-item {
    position: relative;
    padding-left: 2.5rem;
  }
  .sidebar-dot {
    position: absolute;
    left: 0; top: 50%;
    transform: translateY(-50%);
    width: 24px;
    display: flex; align-items: center; justify-content: center;
  }
  .sidebar-dot .dot-inner {
    width: 12px; height: 12px;
    border-radius: 9999px;
    background: #887272;
    z-index: 1;
  }
  .sidebar-item.active .dot-inner {
    background: #5c0c1c;
    box-shadow: 0 0 0 4px #ffdadb;
  }
  .sidebar-card {
    border: 1px solid #887272;
    background: #faf8ff;
    padding: 0.75rem 1rem;
    transition: background 0.15s;
    position: relative;
  }
  .sidebar-item.active .sidebar-card {
    border: 2px solid #5c0c1c;
    background: #f1f3ff;
    transform: rotate(-1deg);
    box-shadow: 4px 4px 0 0 rgba(92,12,28,0.15);
  }
  .sidebar-team-name {
    font-family: 'Noto Serif', serif;
    font-size: 13px; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase;
  }
  .sidebar-item.active .sidebar-team-name { color: #5c0c1c; }
  .sidebar-item:not(.active) .sidebar-team-name { color: #141b2c; }
  .sidebar-status {
    font-size: 12px; font-weight: 500;
    margin-top: 0.35rem;
    display: flex; align-items: center; gap: 0.35rem;
  }
  .sidebar-status.live { color: #ba1a1a; font-weight: 700; }
  .sidebar-status.waiting { color: #554243; }
  .sidebar-status .dot-pulse {
    width: 8px; height: 8px;
    background: #ba1a1a;
    border-radius: 9999px;
    animation: pulse-dot 1.5s ease-in-out infinite;
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  /* ── Main content ── */
  .play-main {
    flex: 1;
    padding: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
  }
  @media (min-width: 768px) { .play-main { padding: 3rem; } }

  /* ── Document card ── */
  .play-doc {
    width: 100%;
    max-width: 900px;
    background: #ffffff;
    border: 1px solid #887272;
    border-top: 6px solid #5c0c1c;
    padding: 2rem;
    position: relative;
    box-shadow: 1px 1px 0 0 rgba(136,114,114,0.5);
    transform: rotate(-0.2deg);
  }
  @media (min-width: 768px) { .play-doc { padding: 3rem; } }

  /* ── Team info bar ── */
  .team-info-bar {
    background: #f1f3ff;
    border: 1px solid #887272;
    padding: 1rem 1.5rem;
    margin-bottom: 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
  }
  .team-info-label {
    font-size: 12px; font-weight: 500; color: #554243; margin-bottom: 4px;
  }
  .team-info-name {
    font-family: 'Noto Serif', serif;
    font-size: 24px; font-weight: 600; color: #5c0c1c;
  }
  .team-info-time-label {
    font-size: 12px; font-weight: 500; color: #554243;
    margin-bottom: 4px; text-align: right;
  }
  .team-info-timer {
    font-family: 'Courier New', monospace;
    font-size: 40px; font-weight: 700;
    letter-spacing: 0.1em;
    text-align: right;
    transition: color 0.3s;
  }
  .timer-normal { color: #141b2c; }
  .timer-warn { color: #D97706; }
  .timer-danger { color: #ba1a1a; animation: pulse-dot 0.8s ease-in-out infinite; }

  /* ── Question ── */
  .q-eyebrow {
    font-family: 'Noto Serif', serif;
    font-size: 13px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #554243; margin-bottom: 1rem;
  }
  .q-text {
    font-size: 18px; line-height: 28px;
    color: #141b2c;
    border-left: 4px solid #5c0c1c;
    padding-left: 1.5rem;
    margin-bottom: 2rem;
    font-style: italic;
  }

  /* ── Options ── */
  .opt-eyebrow {
    font-family: 'Noto Serif', serif;
    font-size: 13px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #554243; margin-bottom: 1rem;
  }
  .options-grid {
    display: flex; flex-direction: column; gap: 0.75rem;
    margin-bottom: 2rem;
  }
  .opt-btn {
    display: flex; align-items: center; gap: 1rem;
    border: 1px solid #887272;
    padding: 1rem;
    background: #faf8ff;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s, border-color 0.15s, transform 0.1s;
    font-family: 'Noto Sans', sans-serif;
    font-size: 16px; line-height: 24px;
    color: #141b2c;
    width: 100%;
  }
  .opt-btn:hover:not(:disabled) {
    background: #e1e8ff;
    border-color: #5c0c1c;
  }
  .opt-btn.selected { border-color: #5c0c1c; background: #f1f3ff; }
  .opt-btn.correct  { border-color: #3F5D45; background: #3F5D45; color: #fff; }
  .opt-btn.wrong    { border-color: #ba1a1a; background: #ffdad6; color: #93000a; }
  .opt-btn:disabled { cursor: not-allowed; }
  .opt-label {
    font-family: 'Noto Serif', serif;
    font-weight: 700; font-size: 15px;
    color: inherit;
    border-right: 1px solid #dbc0c1;
    padding-right: 1rem;
    min-width: 28px;
    flex-shrink: 0;
  }
  .opt-btn.correct .opt-label,
  .opt-btn.wrong   .opt-label { border-right-color: rgba(255,255,255,0.3); }

  /* ── Divider ── */
  .play-divider {
    border: none; border-top: 0.5pt solid #887272;
    margin: 1.5rem 0;
  }

  /* ── Result overlay ── */
  .result-banner {
    margin-top: 1.5rem;
    padding: 1rem 1.5rem;
    border: 2px solid;
    font-family: 'Noto Serif', serif;
    font-size: 18px; font-weight: 700;
    text-align: center;
    display: flex; align-items: center; justify-content: center; gap: 0.75rem;
  }
  .result-banner.correct { border-color: #3F5D45; color: #3F5D45; background: #e8f5e9; }
  .result-banner.wrong   { border-color: #ba1a1a; color: #ba1a1a; background: #ffdad6; }
  .result-banner.pending { border-color: #554243; color: #554243; background: #f1f3ff; }

  /* ── Footer ── */
  .play-footer {
    background: #d3d9f0;
    border-top: 0.5pt solid #554243;
    width: 100%;
    margin-top: auto;
    z-index: 50;
  }
  .play-footer-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 2rem;
    max-width: 1400px;
    margin: 0 auto;
    gap: 0.25rem;
  }
  @media (min-width: 640px) { .play-footer-inner { flex-direction: row; gap: 0; } }
  .play-footer-copy { font-size: 12px; color: #554243; }
`

function formatTime(sec) {
  const s = Math.max(0, sec)
  const m = String(Math.floor(s / 60)).padStart(2, '0')
  const r = String(s % 60).padStart(2, '0')
  return `${m}:${r}`
}

// Owns the 1s countdown tick so the per-second re-render stays isolated to
// this small subtree instead of the whole Play document. Parent must pass a
// `key` that changes with deadlineAt so remounts pick up the fresh deadline.
function TurnTimer({ deadlineAt, active }) {
  const [timeLeft, setTimeLeft] = useState(() =>
    active && deadlineAt
      ? Math.max(0, Math.ceil((new Date(deadlineAt).getTime() - Date.now()) / 1000))
      : ANSWER_SECONDS
  )

  useEffect(() => {
    if (!active || !deadlineAt) return undefined
    const deadline = new Date(deadlineAt).getTime()
    const id = setInterval(() => {
      setTimeLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))
    }, 1000)
    return () => clearInterval(id)
  }, [deadlineAt, active])

  const timerClass = timeLeft > 10 ? 'timer-normal' : timeLeft > 5 ? 'timer-warn' : 'timer-danger'
  return <div className={`team-info-timer ${timerClass}`}>{formatTime(timeLeft)}</div>
}

function readSession() {
  const parse = (raw) => {
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw)
      if (!parsed?.gameId || !parsed?.teamKey) return null
      return parsed
    } catch {
      return null
    }
  }
  const fresh = sessionStorage.getItem(SESSION_KEY)
  if (fresh) return parse(fresh)
  const session = parse(localStorage.getItem(SESSION_KEY))
  if (session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    localStorage.removeItem(SESSION_KEY)
  }
  return session
}

export default function Play() {
  const navigate = useNavigate()
  // Read ONCE: a fresh session object every render used to recreate `reload`,
  // re-run the fetch effect and tear down/re-subscribe the realtime channel
  // on every single render.
  const [session] = useState(readSession)

  const [game, setGame] = useState(null)
  const [teams, setTeams] = useState([])
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(() => isSupabaseConfigured)
  const [error, setError] = useState(() => (isSupabaseConfigured ? null : 'Supabase chưa được cấu hình.'))
  const [submittedRevision, setSubmittedRevision] = useState(null)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    if (!session) navigate('/pick-team', { replace: true })
  }, [session, navigate])

  // Coalesced sync: realtime notification bursts collapse into at most one
  // in-flight fetch (+ one trailing rerun). Players never download the
  // growing game_events log.
  const reload = useMemo(() => {
    if (!session) return null
    return createCoalescedReloader(async () => {
      try {
        const data = await loadGame(session.gameId)
        setGame(data.game)
        setTeams(data.teams)
        setState(data.state)
        setLoading(false)
      } catch (err) {
        setError(err.message || String(err))
        setLoading(false)
      }
    })
  }, [session])

  useEffect(() => {
    if (!reload || !isSupabaseConfigured) return undefined
    reload.schedule()
    // Safety net: if a realtime notification is ever missed (socket drop,
    // StrictMode channel race), this keeps the page within ~5s of the truth.
    const id = setInterval(() => reload.schedule(), 5000)
    return () => {
      clearInterval(id)
      reload.cancel()
    }
  }, [reload])

  useEffect(() => {
    if (!session || !isSupabaseConfigured || !reload) return undefined
    return subscribeToGame(session.gameId, () => reload.schedule())
  }, [session, reload])

  if (!session) return null

  if (loading) {
    return (
      <div className="play-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ padding: '3rem', fontFamily: "'Noto Serif', serif" }}>Đang kết nối…</div>
      </div>
    )
  }

  if (error || !state || !teams.length) {
    return (
      <div className="play-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <style>{PLAY_STYLE}</style>
        <div style={{ padding: '3rem', textAlign: 'center', fontFamily: "'Noto Serif', serif", color: '#ba1a1a' }}>
          <div>{error || 'Đang chờ kết nối lại…'}</div>
          {error && (
            <button
              type="button"
              onClick={() => {
                setError(null)
                setLoading(true)
                reload?.schedule()
              }}
              style={{ marginTop: 16 }}
            >
              Thử lại
            </button>
          )}
        </div>
      </div>
    )
  }

  const myTeam = teams.find((t) => t.team_key === session.teamKey)
  const activeCard = state.active_card_num ? getCardByNumber(state.card_deck, state.active_card_num) : null
  const answeringIdx = state.answering_team_idx ?? 0
  const answeringTeam = teams[answeringIdx]
  const isMyTurn =
    game?.status === 'playing' &&
    state.phase === 'answering' &&
    answeringTeam?.team_key === session.teamKey &&
    !state.answer_submission_team_key

  const isMyEffectTurn =
    game?.status === 'playing' &&
    state?.phase === 'resolving_effect' &&
    teams[state.effect_team_idx]?.team_key === session.teamKey

  const alreadySubmitted = submittedRevision !== null && submittedRevision === state.revision

  const handleSelect = async (idx) => {
    if (!isMyTurn || alreadySubmitted || !activeCard) return
    setSubmitError(null)
    setSubmittedRevision(state.revision)
    try {
      await submitAnswerEvent({
        gameId: session.gameId,
        teamKey: session.teamKey,
        cardNum: state.active_card_num,
        revision: state.revision,
        optionIdx: idx,
      })
    } catch (err) {
      setSubmittedRevision(null)
      setSubmitError({ atRevision: state.revision, message: err.message || String(err) })
    }
  }

  const handleRollDice = async () => {
    try {
      await submitDiceRollEvent({
        gameId: session.gameId,
        teamKey: session.teamKey,
        revision: state.revision,
      })
    } catch (err) {
      console.error(err)
    }
  }

  const handleEffectTarget = async (targetIdx) => {
    try {
      await submitEffectTargetEvent({
        gameId: session.gameId,
        teamKey: session.teamKey,
        revision: state.revision,
        targetIdx,
      })
    } catch (err) {
      console.error(err)
    }
  }

  const submitErrorMessage =
    submitError && submitError.atRevision === state.revision ? submitError.message : null

  const handleMemeDrop = (memeId) => {
    sendMemeDrop(session.gameId, {
      teamId: myTeam?.team_key,
      teamName: myTeam?.name,
      teamColor: myTeam?.color,
      memeId,
      x: 10 + Math.random() * 70,
      y: 25 + Math.random() * 40,
    })
  }

  const optClass = (idx) => {
    const st = state.option_states?.[idx]
    if (st === 'correct') return 'correct'
    if (st === 'wrong') return 'wrong'
    return ''
  }

  let resultBanner = null
  if (state.phase === 'explaining' || state.phase === 'resolving_effect') {
    const winner = teams.find((t) => t.team_key === state.answer_submission_team_key)
    if (winner) {
      resultBanner = { type: 'correct', text: `✓ ${winner.name} trả lời đúng!` }
    }
  }

  return (
    <>
      <style>{PLAY_STYLE}</style>

      <div className="play-page">
        <header className="play-header">
          <div className="play-header-inner">
            <div className="play-title">HÀNH TRÌNH ĐỔI MỚI</div>
          </div>
        </header>

        <div className="play-body">
          <aside className="play-sidebar">
            <div className="sidebar-title">Lượt Thi Đấu</div>
            <div className="sidebar-list">
              <div className="sidebar-timeline-line" />
              {teams.map((team, i) => (
                <div key={team.team_key} className={`sidebar-item${i === answeringIdx ? ' active' : ''}`}>
                  <div className="sidebar-dot">
                    <div className="dot-inner" style={i === answeringIdx ? {} : { background: '#887272' }} />
                  </div>
                  <div className="sidebar-card">
                    <div className="sidebar-team-name" style={i === answeringIdx ? { color: team.color } : {}}>
                      {team.name}
                      {team.team_key === session.teamKey && (
                        <span
                          style={{
                            marginLeft: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#ba1a1a',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            border: '1px dashed #ba1a1a',
                            padding: '1px 4px',
                            transform: 'rotate(-3deg)',
                            display: 'inline-block',
                          }}
                        >
                          bạn
                        </span>
                      )}
                    </div>
                    <div className={`sidebar-status${i === answeringIdx ? ' live' : ' waiting'}`}>
                      {i === answeringIdx ? (
                        <>
                          <span className="dot-pulse" />
                          {state.phase === 'answering' ? 'Đang trả lời...' : 'Vừa trả lời'}
                        </>
                      ) : (
                        'Chờ đến lượt'
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <main className="play-main">
            <div className="play-doc">
              <div className="team-info-bar">
                <div>
                  <div className="team-info-label">ĐỘI CỦA BẠN</div>
                  <div className="team-info-name" style={{ color: myTeam?.color }}>
                    {myTeam?.name} · {myTeam?.score ?? 0} điểm
                  </div>
                </div>
                <div>
                  <div className="team-info-time-label">THỜI GIAN CÒN LẠI</div>
                  <TurnTimer
                    key={state.deadline_at ?? 'idle'}
                    deadlineAt={state.deadline_at}
                    active={state.phase === 'answering'}
                  />
                </div>
              </div>

              {state?.phase === 'resolving_effect' ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#887272', fontFamily: "'Noto Serif', serif" }}>
                  <div style={{ fontSize: 48, marginBottom: '1rem' }}>🎉</div>
                  <div style={{ fontSize: 18, fontWeight: 600, marginBottom: '0.5rem' }}>Đang giải quyết Thẻ chức năng</div>
                  <div style={{ fontSize: 14 }}>Hãy hướng mắt lên màn hình Host!</div>
                </div>
              ) : !activeCard ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#887272', fontFamily: "'Noto Serif', serif" }}>
                  <div style={{ fontSize: 48, marginBottom: '1rem' }}>⏳</div>
                  <div style={{ fontSize: 18, fontWeight: 600, marginBottom: '0.5rem' }}>Chờ câu hỏi từ Ban Tổ chức</div>
                  <div style={{ fontSize: 14 }}>Host sẽ mở lá bài trên màn hình chính</div>
                </div>
              ) : (
                <>
                  <div className="q-eyebrow">CÂU HỎI TRUY VẤN · Lá số {activeCard.num}</div>
                  <div className="q-text">"{activeCard.q}"</div>

                  <div className="opt-eyebrow">
                    {isMyTurn ? 'ĐẾN LƯỢT ĐỘI BẠN — CHỌN 1 PHƯƠNG ÁN' : `LƯỢT TRẢ LỜI: ${state.attempt_label || answeringTeam?.name || ''}`}
                  </div>
                  {isMyTurn && !alreadySubmitted && (
                    <div style={{ fontSize: 12, color: '#887272', marginBottom: '0.5rem' }}>
                      Chỉ đáp án đầu tiên của đội được tính — nếu đồng đội đã bấm, màn hình bạn sẽ tự chuyển.
                    </div>
                  )}
                  {alreadySubmitted && (
                    <div style={{ fontSize: 13, color: '#7b5800', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Đã gửi câu trả lời (hoặc đồng đội đã gửi trước) — đang chờ Host xác nhận…
                    </div>
                  )}
                  {submitErrorMessage && (
                    <div style={{ fontSize: 13, color: '#ba1a1a', marginBottom: '0.5rem' }}>
                      Gửi câu trả lời thất bại ({submitErrorMessage}) — bấm lại đáp án để thử lại.
                    </div>
                  )}
                  <div className="options-grid">
                    {activeCard.options.map((opt, i) => (
                      <button
                        key={i}
                        className={`opt-btn ${optClass(i)}`}
                        disabled={!isMyTurn || alreadySubmitted}
                        onClick={() => handleSelect(i)}
                      >
                        <span className="opt-label">{OPTION_LABELS[i]}</span>
                        <span>{opt}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {resultBanner && <div className={`result-banner ${resultBanner.type}`}>{resultBanner.text}</div>}
              {activeCard && state.show_explain && (
                <div className="result-banner pending">{activeCard.explain}</div>
              )}

              <hr className="play-divider" />

              {/* Meme Panel */}
              <MemePanel onDrop={handleMemeDrop} disabled={false} teamColor={myTeam?.color} />
            </div>
          </main>
        </div>

        <footer className="play-footer">
          <div className="play-footer-inner">
            <span className="play-footer-copy">© 1986-2026 BAN TUYÊN GIÁO TRUNG ƯƠNG</span>
          </div>
        </footer>
      </div>

      {/* Popup Roll Dice for Active Team */}
      {state?.phase === 'resolving_effect' && isMyEffectTurn && state.eff_body_buttons === 'dice' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: '#faf8ff', padding: '2.5rem 1.5rem', borderRadius: '16px',
            textAlign: 'center', maxWidth: '400px', width: '90%',
            boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
            border: '2px solid #5c0c1c'
          }}>
            <h2 style={{ margin: '0 0 0.5rem 0', color: '#5c0c1c', fontSize: '28px', fontFamily: "'Noto Serif', serif" }}>
              Gieo Xúc Xắc — {myTeam?.name}
            </h2>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#5c0c1c', marginBottom: '8px' }}>
              <span style={{ fontSize: '28px', marginRight: '8px' }}>{state.effect_icon}</span>
              {state.effect_label}
            </div>
            <p style={{ margin: '0 0 2rem 0', color: '#554243', fontSize: '16px' }}>
              {state.effect_desc}
            </p>
            <button
              onClick={handleRollDice}
              disabled={state.dice_rolling || state.dice_result_visible}
              style={{
                fontSize: '22px', padding: '1rem 2rem', background: '#5c0c1c', color: 'white',
                border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, width: '100%',
                opacity: (state.dice_rolling || state.dice_result_visible) ? 0.5 : 1,
                transition: 'transform 0.1s'
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              🎲 TUNG XÚC XẮC
            </button>
            {(state.dice_rolling || state.dice_result_visible) && (
              <p style={{ marginTop: '1.5rem', color: '#ba1a1a', fontWeight: 'bold', fontSize: '16px' }}>
                Đang tung... Hãy nhìn lên màn hình Host để xem kết quả!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Popup Steal/Swap for Active Team */}
      {state?.phase === 'resolving_effect' && isMyEffectTurn && (state.eff_body_buttons === 'steal' || state.eff_body_buttons === 'swap') && !state.show_eff_continue && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: '#faf8ff', padding: '2.5rem 1.5rem', borderRadius: '16px',
            textAlign: 'center', maxWidth: '400px', width: '90%',
            boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
            border: '2px solid #5c0c1c'
          }}>
            <h2 style={{ margin: '0 0 0.5rem 0', color: '#5c0c1c', fontSize: '28px', fontFamily: "'Noto Serif', serif" }}>
              CHỌN MỤC TIÊU — {myTeam?.name}
            </h2>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#5c0c1c', marginBottom: '8px' }}>
              <span style={{ fontSize: '28px', marginRight: '8px' }}>{state.effect_icon}</span>
              {state.effect_label}
            </div>
            <p style={{ margin: '0 0 2rem 0', color: '#554243', fontSize: '16px' }}>
              {state.effect_desc}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px", width: "100%" }}>
              {teams.map(
                (t, i) =>
                  i !== state.effect_team_idx && (
                    <button
                      key={t.team_key}
                      style={{ 
                        background: t.color, border: 'none', color: 'white', padding: "12px", 
                        fontSize: "18px", fontWeight: "bold", borderRadius: "8px", cursor: "pointer" 
                      }}
                      onClick={() => handleEffectTarget(i)}
                    >
                      {state.eff_body_buttons === "steal" ? `Cướp từ ${t.name} (${t.score}đ)` : `Đổi với ${t.name} (${t.score}đ)`}
                    </button>
                  )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
