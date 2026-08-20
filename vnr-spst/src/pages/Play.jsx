import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCardByNumber } from '../game/catalog'
import { rotationForDiceValue } from '../game/transitions'
import { loadGame, subscribeToGame, submitAnswerEvent, sendMemeDrop } from '../game/gameRepository'
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

  /* ── Observers ── */
  .obs-eyebrow {
    font-family: 'Noto Serif', serif;
    font-size: 13px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #554243;
    margin-bottom: 1rem;
    display: flex; align-items: center; gap: 0.5rem;
  }
  .obs-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
  @media (min-width: 640px) { .obs-grid { grid-template-columns: repeat(4, 1fr); } }
  .obs-item {
    display: flex; align-items: center; gap: 0.5rem;
    border: 1px solid #dbc0c1;
    padding: 0.5rem;
    background: #faf8ff;
    font-size: 12px; font-weight: 500;
  }
  .obs-dot {
    width: 8px; height: 8px;
    border-radius: 9999px; flex-shrink: 0;
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

const DICE_STYLE = `
  .play-dice-overlay {
    position: fixed; inset: 0; z-index: 70;
    display: flex; align-items: center; justify-content: center;
    background: rgba(20,16,10,0.65);
    padding: 20px;
  }
  .play-dice-overlay.hidden { display: none; }
  .play-dice-modal {
    background: #fdfbf7;
    border: 3px double #141b2c;
    border-radius: 4px;
    padding: 2.5rem;
    max-width: 420px; width: 100%;
    display: flex; flex-direction: column; align-items: center;
    position: relative;
    box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    transform: rotate(-0.4deg);
  }
  .play-dice-title {
    font-family: 'Noto Serif', serif;
    font-size: 13px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #554243;
    margin-bottom: 2rem;
    border-bottom: 0.5px solid #887272;
    padding-bottom: 0.5rem;
    width: 100%; text-align: center;
  }
  .play-dice-scene {
    perspective: 1000px;
    width: 96px; height: 96px;
    margin-bottom: 3rem;
    position: relative;
  }
  .play-dice-wrapper { width: 100%; height: 100%; position: absolute; }
  .play-dice-cube {
    width: 100%; height: 100%; position: absolute;
    transform-style: preserve-3d;
    transition: transform 1500ms ease-out;
  }
  .play-dice-face {
    position: absolute;
    width: 96px; height: 96px;
    background-color: #faf8ff;
    border: 2px solid #141b2c;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Courier New', monospace;
    font-size: 48px; font-weight: bold;
    color: #141b2c;
    text-shadow: 1px 1px 0 rgba(0,0,0,0.4);
    box-shadow: inset 0 0 15px rgba(0,0,0,0.05);
  }
  .play-dice-face.front  { transform: rotateY(  0deg) translateZ(48px); }
  .play-dice-face.back   { transform: rotateY(180deg) translateZ(48px); }
  .play-dice-face.right  { transform: rotateY( 90deg) translateZ(48px); }
  .play-dice-face.left   { transform: rotateY(-90deg) translateZ(48px); }
  .play-dice-face.top    { transform: rotateX( 90deg) translateZ(48px); }
  .play-dice-face.bottom { transform: rotateX(-90deg) translateZ(48px); }
  .play-dice-shadow {
    position: absolute; bottom: -1.5rem; left: 50%;
    transform: translateX(-50%);
    width: 80px; height: 16px;
    background: rgba(0,0,0,0.2);
    border-radius: 50%;
    filter: blur(4px);
  }
  @keyframes play-dice-bounce {
    0%   { transform: translate(-120px,-80px) scale(0.6); }
    20%  { transform: translate(100px,60px) scale(1.1); }
    45%  { transform: translate(-60px,-40px) scale(0.85); }
    70%  { transform: translate(40px,30px) scale(1.05); }
    85%  { transform: translate(-15px,-15px) scale(0.95); }
    100% { transform: translate(0,0) scale(1); }
  }
  @keyframes play-shadow-pulse {
    0%   { transform: translateX(-50%) scale(0.6); opacity: 0.1; }
    20%  { transform: translateX(-50%) scale(1.1); opacity: 0.05; }
    45%  { transform: translateX(-50%) scale(0.85); opacity: 0.15; }
    70%  { transform: translateX(-50%) scale(1.05); opacity: 0.08; }
    85%  { transform: translateX(-50%) scale(0.95); opacity: 0.12; }
    100% { transform: translateX(-50%) scale(1); opacity: 0.1; }
  }
  .play-dice-bouncing { animation: play-dice-bounce 1.5s cubic-bezier(0.25,1,0.5,1) forwards; }
  .play-shadow-rolling { animation: play-shadow-pulse 1.5s cubic-bezier(0.25,1,0.5,1) forwards; }
  .play-dice-result {
    margin-top: 1.5rem; height: 2rem;
    display: flex; align-items: center; justify-content: center;
    gap: 0.5rem;
    font-family: 'Noto Serif', serif;
    transition: opacity 0.3s;
  }
  .play-dice-result.hidden-result { opacity: 0; }
  .play-dice-result-num { font-size: 32px; font-weight: 700; color: #7a2430; line-height: 1; }
  .play-dice-result-text { font-size: 18px; font-weight: 600; color: #141b2c; }
`

function formatTime(sec) {
  const s = Math.max(0, sec)
  const m = String(Math.floor(s / 60)).padStart(2, '0')
  const r = String(s % 60).padStart(2, '0')
  return `${m}:${r}`
}

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.gameId || !parsed?.teamKey) return null
    return parsed
  } catch {
    return null
  }
}

export default function Play() {
  const navigate = useNavigate()
  const session = readSession()

  const [game, setGame] = useState(null)
  const [teams, setTeams] = useState([])
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(() => isSupabaseConfigured)
  const [error, setError] = useState(() => (isSupabaseConfigured ? null : 'Supabase chưa được cấu hình.'))
  const [submittedRevision, setSubmittedRevision] = useState(null)
  const [timeLeft, setTimeLeft] = useState(ANSWER_SECONDS)

  const cubeRef = useRef(null)
  const wrapperRef = useRef(null)
  const shadowRef = useRef(null)

  useEffect(() => {
    if (!session) navigate('/pick-team', { replace: true })
  }, [session, navigate])

  const reload = useCallback(async () => {
    if (!session) return
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
  }, [session])

  useEffect(() => {
    if (!session || !isSupabaseConfigured) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial async fetch on mount
    reload()
  }, [session, reload])

  useEffect(() => {
    if (!session) return undefined
    return subscribeToGame(session.gameId, reload)
  }, [session, reload])

  // Countdown display derived from the shared deadline; submittedRevision is
  // compared directly against state.revision at render time (see alreadySubmitted).
  useEffect(() => {
    if (!state?.deadline_at || state.phase !== 'answering') return undefined
    const deadline = new Date(state.deadline_at).getTime()
    const id = setInterval(() => {
      setTimeLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))
    }, 1000)
    return () => clearInterval(id)
  }, [state?.deadline_at, state?.phase])

  useEffect(() => {
    if (!state) return
    if (state.dice_rolling) {
      const [rx, ry] = rotationForDiceValue(state.dice_value)
      if (cubeRef.current) {
        cubeRef.current.style.transition = 'none'
        cubeRef.current.style.transform = 'rotateX(0deg) rotateY(0deg)'
        void cubeRef.current.offsetHeight
        cubeRef.current.style.transition = ''
      }
      if (wrapperRef.current) wrapperRef.current.classList.add('play-dice-bouncing')
      if (shadowRef.current) shadowRef.current.classList.add('play-shadow-rolling')
      requestAnimationFrame(() => {
        if (cubeRef.current) cubeRef.current.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`
      })
    } else {
      if (wrapperRef.current) wrapperRef.current.classList.remove('play-dice-bouncing')
      if (shadowRef.current) shadowRef.current.classList.remove('play-shadow-rolling')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.dice_rolling, state?.dice_value])

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
        <div style={{ padding: '3rem', fontFamily: "'Noto Serif', serif", color: '#ba1a1a' }}>
          {error || 'Đang chờ kết nối lại…'}
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

  const alreadySubmitted = submittedRevision !== null && submittedRevision === state.revision

  const handleSelect = async (idx) => {
    if (!isMyTurn || alreadySubmitted || !activeCard) return
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
      setError(err.message || String(err))
    }
  }

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

  const timerClass = timeLeft > 10 ? 'timer-normal' : timeLeft > 5 ? 'timer-warn' : 'timer-danger'

  let resultBanner = null
  if (state.phase === 'explaining' || state.phase === 'resolving_effect') {
    const winner = teams.find((t) => t.team_key === state.answer_submission_team_key)
    if (winner) {
      resultBanner = { type: 'correct', text: `✓ ${winner.name} trả lời đúng!` }
    }
  }

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,600;0,700;1,400&family=Noto+Sans:wght@400;500;700&display=swap"
        rel="stylesheet"
      />
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
                  <div className={`team-info-timer ${timerClass}`}>{formatTime(timeLeft)}</div>
                </div>
              </div>

              {!activeCard ? (
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

              <div className="obs-eyebrow">CÁC ĐƠN VỊ ĐANG THEO DÕI</div>
              <div className="obs-grid">
                {teams
                  .filter((t) => t.team_key !== answeringTeam?.team_key)
                  .slice(0, 4)
                  .map((team) => (
                    <div key={team.team_key} className="obs-item">
                      <span className="obs-dot" style={{ background: team.color }} />
                      <span>{team.name}</span>
                    </div>
                  ))}
              </div>

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

        <style>{DICE_STYLE}</style>
        <div className={`play-dice-overlay${state.show_dice ? '' : ' hidden'}`}>
          <div className="play-dice-modal">
            <div className="play-dice-title">Gieo Xúc Xắc — {teams[state.effect_team_idx]?.name ?? ''}</div>
            <div className="play-dice-scene">
              <div className="play-dice-wrapper" ref={wrapperRef}>
                <div className="play-dice-cube" ref={cubeRef}>
                  <div className="play-dice-face front">1</div>
                  <div className="play-dice-face back">6</div>
                  <div className="play-dice-face right">3</div>
                  <div className="play-dice-face left">4</div>
                  <div className="play-dice-face top">2</div>
                  <div className="play-dice-face bottom">5</div>
                </div>
              </div>
              <div className="play-dice-shadow" ref={shadowRef} />
            </div>
            <div className={`play-dice-result${state.dice_result_visible ? '' : ' hidden-result'}`}>
              <span className="play-dice-result-text">{state.effect_type === 'dice_subtract' ? 'Trừ' : 'Tiến lên'}</span>
              <span className="play-dice-result-num">{state.dice_value ?? ''}</span>
              <span className="play-dice-result-text">bước</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
