import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCardByNumber } from '../game/catalog'
import { loadGame, subscribeToGame, createCoalescedReloader, submitAnswerEvent, submitDiceRollEvent, submitEffectTargetEvent, sendMemeDrop } from '../game/gameRepository'
import { readSession } from '../game/session'
import { playSound } from '../game/sounds'
import { isSupabaseConfigured } from '../lib/supabase'
import MemePanel from '../components/MemePanel.jsx'

const OPTION_LABELS = ['A', 'B', 'C', 'D']
const ANSWER_SECONDS = 15

// Cột game_state mà /play đọc. Loại 3 cột JSONB lớn (card_deck ~20 kB,
// effect_deck, used_card_numbers — chỉ Host đọc) để poll 5 s rơi từ ~27 kB
// xuống mức nhỏ. Lá đang mở đọc từ cột denormalized `active_card` (Host ghi
// trong cùng patch với active_card_num).
const PLAY_STATE_COLUMNS = [
  'phase',
  'active_card',
  'deadline_at',
  'answering_team_key',
  'answer_submission_team_key',
  'revision',
  'active_card_num',
  'attempt_idx',
  'answering_team_idx',
  'attempt_label',
  'option_states',
  'show_effect',
  'effect_type',
  'effect_icon',
  'effect_label',
  'effect_desc',
  'effect_team_idx',
  'effect_result',
  'show_eff_continue',
  'eff_body_buttons',
  'effect_revealed',
  'show_dice',
  'dice_rolling',
  'dice_value',
  'dice_result_visible',
  'show_winner',
  'winner_name',
  'rank_list',
]

const PLAY_STYLE = `
  .play-page {
    /* ── Art Deco Casino Tokens (Task 1) — scoped tới .play-page ── */
    --casino-bg: #e6ebf0;
    --paper: #fcf9f2;
    --paper-warm: #f6f3ec;
    --paper-line: #d1c5b0;
    --gold: #caa048;
    --gold-dark: #8c671a;
    --gold-pale: #f7e6a4;
    --gold-cream: #ede3d0;
    --navy-950: #091424;
    --navy-900: #0b192c;
    --navy-800: #0e1f38;
    --navy-700: #162b48;
    --maroon-700: #751a24;
    --maroon-800: #5c131c;
    --maroon-900: #480d14;
    --ink: #111927;
    --red: #ba1a1a;
    --forest: #3F5D45;

    /* Chiều cao .play-header (position: sticky; top: 0) — dùng làm offset cho cột
       LƯỢT THI ĐẤU dính bên dưới header khi trang cuộn. Đây chỉ là giá trị dự
       phòng trước khi đo: component ghi đè bằng chiều cao thật qua ResizeObserver. */
    --play-header-h: 72px;

    min-height: 100svh;
    display: flex;
    flex-direction: column;
    font-family: 'Lora', Georgia, serif;
    color: #141b2c;
    background-color: var(--casino-bg);
    background-image: radial-gradient(#b8c4cf 1.25px, transparent 1.25px);
    background-size: 10px 10px;
    width: 100%;
    box-sizing: border-box;
  }

  /* ── Shared deco helpers (Task 1) ── */
  .deco-title {
    font-family: 'Playfair Display', Georgia, serif;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }
  .deco-label {
    font-family: 'Cinzel', 'Playfair Display', serif;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.18em;
  }
  .gold-line {
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--gold), transparent);
  }

  /* ── Top header (Task 2 — Bàn Thi Đấu) ── */
  .play-header {
    background: #ffffff;
    border-bottom: 2px solid var(--gold);
    width: 100%;
    position: sticky; top: 0; z-index: 50;
    box-shadow: 0 1px 3px rgba(17, 25, 39, 0.06);
  }
  .play-header-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 0.85rem 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }
  .play-header-center {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    flex: 1;
    min-width: 0;
  }
  .play-title-flank {
    height: 1px;
    flex: 0 1 48px;
    min-width: 12px;
    background: linear-gradient(90deg, transparent, var(--gold));
  }
  .play-title-flank--r {
    background: linear-gradient(90deg, var(--gold), transparent);
  }
  .play-title {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(19px, 3.2vw, 32px);
    font-weight: 900;
    letter-spacing: 0.22em;
    color: var(--ink);
    white-space: nowrap;
  }
  .play-title .deco-diamond { color: var(--gold-dark); }
  .play-header-badge {
    font-family: 'Cinzel', 'Playfair Display', serif;
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.25em; text-transform: uppercase;
    color: var(--gold-dark);
    background: var(--gold-cream);
    border: 1px solid rgba(202, 160, 72, 0.4);
    padding: 0.35rem 0.75rem;
    border-radius: 2px;
    white-space: nowrap;
  }
  .play-header-live {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.35rem 0.75rem;
    background: var(--navy-900);
    color: var(--gold-pale);
    border: 1px solid var(--gold);
    border-radius: 2px;
    font-size: 12px; font-weight: 700;
    letter-spacing: 0.1em;
    white-space: nowrap;
  }
  .play-header-live .live-dot {
    width: 8px; height: 8px;
    border-radius: 9999px;
    background: #10b981;
    animation: pulse-dot 1.5s ease-in-out infinite;
  }
  @media (max-width: 640px) {
    .play-header-inner { padding: 0.65rem 1rem; gap: 0.5rem; }
    .play-title-flank { display: none; }
  }
  @media (max-width: 480px) {
    .play-header-badge { display: none; }
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
  /* ── Sidebar (Task 3 — Lượt Thi Đấu) ── */
  .play-sidebar {
    display: none;
    flex-direction: column;
    width: 280px;
    min-width: 280px;
    border-right: 1px solid var(--paper-line);
    background: rgba(252, 249, 242, 0.8);
    padding: 1.5rem;
    overflow-y: auto;
    /* Cột LƯỢT THI ĐẤU dính ngay dưới header trong khi MÀN HÌNH THÀNH VIÊN ĐỘI
       cuộn theo trang. align-self: flex-start là bắt buộc: mặc định flex item
       bị kéo cao bằng cả .play-body nên không còn khoảng trống để dính.
       max-height + overflow-y: auto để danh sách đội dài vẫn cuộn nội bộ.
       Hai lần 3rem bị trừ:
       • 3rem đầu = padding dọc (1.5rem × 2) vì .play-sidebar là content-box;
       • 3rem sau = đệm dưới. Cuộn tới đáy trang thì .play-footer chiếm đáy
         viewport (~40–45px) và sticky không được vượt khỏi đáy .play-body,
         nên nếu không chừa chỗ thì cả cột bị đẩy trượt lên ~45px và chui
         xuống dưới header. */
    position: sticky;
    top: var(--play-header-h);
    align-self: flex-start;
    max-height: calc(100svh - var(--play-header-h) - 6rem);
    z-index: 10;
  }
  @media (min-width: 1024px) { .play-sidebar { display: flex; } }
  .sidebar-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding-bottom: 0.75rem;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid rgba(202, 160, 72, 0.4);
  }
  .sidebar-title {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0;
    font-family: 'Cinzel', 'Playfair Display', serif;
    font-size: 12px; font-weight: 700;
    letter-spacing: 0.18em; text-transform: uppercase;
    color: var(--ink);
  }
  .sidebar-title .material-symbols-outlined {
    font-size: 16px;
    color: var(--gold-dark);
  }
  .sidebar-count {
    font-size: 10px; font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--gold-dark);
    background: rgba(247, 230, 164, 0.6);
    border: 1px solid rgba(202, 160, 72, 0.5);
    border-radius: 9999px;
    padding: 1px 8px;
    white-space: nowrap;
  }
  .sidebar-list {
    display: flex; flex-direction: column; gap: 1rem;
    position: relative;
  }
  .sidebar-timeline-line {
    position: absolute;
    left: 11px; top: 0.75rem; bottom: 0.75rem;
    width: 2px;
    border-radius: 2px;
    background: linear-gradient(180deg, #dc2626, #2563eb, rgba(202, 160, 72, 0.3));
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
    background: var(--team-color, #887272);
    z-index: 1;
  }
  .sidebar-item.active .dot-inner {
    border: 2px solid #ffffff;
    box-shadow: 0 0 0 2px var(--team-color, var(--gold));
  }
  .sidebar-card {
    border: 1px solid var(--paper-line);
    background: #ffffff;
    padding: 0.7rem 0.85rem;
    border-radius: 2px;
    transition: border-color 0.15s, background 0.15s;
    position: relative;
  }
  .sidebar-item:not(.active) .sidebar-card:hover {
    border-color: var(--gold);
  }
  .sidebar-item.active .sidebar-card {
    border: 2px solid var(--gold);
    background: var(--maroon-900);
    box-shadow: 2px 2px 0 0 rgba(72, 13, 20, 0.25);
  }
  .sidebar-team-name {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-family: 'Lora', Georgia, serif;
    font-size: 13px; font-weight: 700;
    letter-spacing: 0.04em; text-transform: uppercase;
    color: var(--ink);
  }
  .sidebar-item.active .sidebar-team-name { color: #ffffff; }
  .sidebar-you {
    font-size: 9px; font-weight: 800;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--red);
    border: 1px dashed var(--red);
    padding: 1px 4px;
    border-radius: 1px;
    transform: rotate(-3deg);
    display: inline-block;
  }
  .sidebar-item.active .sidebar-you {
    color: var(--gold-pale);
    border-color: var(--gold-pale);
  }
  .sidebar-status {
    font-size: 11px; font-weight: 600;
    margin-top: 0.3rem;
    display: flex; align-items: center; gap: 0.35rem;
    color: #7a6f63;
  }
  .sidebar-item.active .sidebar-status { color: var(--gold-pale); }
  .sidebar-status.live {
    width: fit-content;
    background: rgba(220, 38, 38, 0.85);
    color: var(--gold-pale);
    font-size: 10px; font-weight: 800;
    letter-spacing: 0.08em;
    padding: 2px 7px;
    border-radius: 2px;
  }
  .sidebar-status .dot-pulse {
    width: 6px; height: 6px;
    background: #ffffff;
    border-radius: 9999px;
    animation: pulse-dot 1.5s ease-in-out infinite;
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  /* ── Main content (Task 4) ── */
  .play-main {
    flex: 1;
    padding: 2rem;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    min-width: 0;
  }
  @media (min-width: 768px) { .play-main { padding: 3rem; } }

  /* ── Document card (Task 4) ── */
  .play-doc {
    --play-doc-pad: 2rem;
    width: 100%;
    max-width: 860px;
    background: #ffffff;
    border: 2px solid var(--gold);
    border-radius: 2px;
    padding: var(--play-doc-pad);
    padding-top: 0;
    position: relative;
    overflow: hidden;
    box-shadow:
      0 6px 20px -12px rgba(17, 25, 39, 0.35),
      2px 2px 0 0 rgba(202, 160, 72, 0.25);
  }
  @media (min-width: 768px) { .play-doc { --play-doc-pad: 3rem; } }
  .play-doc-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin: 0 calc(-1 * var(--play-doc-pad)) 2rem;
    padding: 0.6rem var(--play-doc-pad);
    background: linear-gradient(90deg, var(--navy-900), var(--navy-700), var(--navy-900));
    border-bottom: 2px solid var(--gold);
  }
  .play-doc-head-title {
    display: flex; align-items: center; gap: 0.4rem;
    color: var(--gold-pale);
    font-size: 11px; font-weight: 800;
    letter-spacing: 0.25em; text-transform: uppercase;
  }
  .play-doc-head-round {
    display: flex; align-items: center; gap: 0.4rem;
    color: #cbd5e1;
    font-size: 10px; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase;
  }
  .play-doc-head-round .dot-gold {
    width: 6px; height: 6px;
    border-radius: 9999px;
    background: var(--gold);
  }

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

  // Chiều cao thật của .play-header (sticky; top: 0) → offset dính của cột
  // LƯỢT THI ĐẤU. Đo bằng ResizeObserver thay vì hard-code vì chiều cao phụ
  // thuộc font (header cao 73.3px với Lora/Cinzel đã load) và khổ màn hình.
  // Deps phải có các state quyết định nhánh render: lần render đầu là màn
  // "Đang kết nối…" (chưa có <header>), nên nếu chỉ chạy 1 lần với [] thì
  // headerRef.current còn null và chiều cao mãi ở giá trị dự phòng.
  const headerRef = useRef(null)
  const [headerH, setHeaderH] = useState(72)
  useEffect(() => {
    const el = headerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const measure = () => {
      const h = Math.round(el.getBoundingClientRect().height * 10) / 10
      setHeaderH((prev) => (prev === h ? prev : h))
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [loading, error, teams.length])

  useEffect(() => {
    if (!session) navigate('/pick-team', { replace: true })
  }, [session, navigate])

  // So sánh mảng theo nội dung — poll 5 s tạo object/array mới mỗi chu kỳ dù
  // 0 đội đổi; stringify vài trăm byte rẻ hơn nhiều so với re-render cả trang.
  const sameList = (a, b) =>
    a === b || (a?.length === b?.length && JSON.stringify(a) === JSON.stringify(b))

  // Coalesced sync: realtime notification bursts collapse into at most one
  // in-flight fetch (+ one trailing rerun). Players never download the
  // growing game_events log.
  const reload = useMemo(() => {
    if (!session) return null
    return createCoalescedReloader(async () => {
      try {
        const data = await loadGame(session.gameId, { stateColumns: PLAY_STATE_COLUMNS.join(',') })
        // Guard setState vô nghĩa: `revision` là vân tay của game_state (mọi
        // writer đều bump trước khi ghi); `game.status` đổi rất hiếm. teams so
        // theo nội dung vì điểm đội đổi không qua game_state.revision.
        setGame((prev) => (prev?.status === data.game?.status ? prev : data.game))
        setState((prev) => (prev?.revision === data.state?.revision ? prev : data.state))
        setTeams((prev) => (sameList(prev, data.teams) ? prev : data.teams))
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
    if (!session || !isSupabaseConfigured) return undefined
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
  // Lá đang mở từ cột denormalized active_card; fallback về card_deck chỉ
  // có giá trị nếu payload chứa deck (DB cũ chưa migrate + retry legacy đã
  // rơi vào select "*"). Guard Object.isArray-ish chống deck undefined.
  const activeCard = state.active_card
    ?? (state.active_card_num && Array.isArray(state.card_deck)
      ? getCardByNumber(state.card_deck, state.active_card_num)
      : null)
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
    playSound('ui-click')
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
    playSound('ui-click')
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
    playSound('ui-click')
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

      <div className="play-page" style={{ '--play-header-h': `${headerH}px` }}>
        <header className="play-header" ref={headerRef}>
          <div className="play-header-inner">
            <div className="play-header-badge">Bàn Thi Đấu</div>
            <div className="play-header-center">
              <span className="play-title-flank" />
              <h1 className="play-title">
                <span className="deco-diamond">♦</span>
                THỬ VẬN MAY
                <span className="deco-diamond">♦</span>
              </h1>
              <span className="play-title-flank play-title-flank--r" />
            </div>
            <div className="play-header-live">
              <span className="live-dot" />
              TRỰC TIẾP
            </div>
          </div>
        </header>

        <div className="play-body">
          <aside className="play-sidebar">
            <div className="sidebar-head">
              <h2 className="sidebar-title">
                <span className="material-symbols-outlined">format_list_numbered</span>
                LƯỢT THI ĐẤU
              </h2>
              <span className="sidebar-count">{teams.length} ĐỘI</span>
            </div>
            <div className="sidebar-list">
              <div className="sidebar-timeline-line" />
              {teams.map((team, i) => (
                <div
                  key={team.team_key}
                  className={`sidebar-item${i === answeringIdx ? ' active' : ''}`}
                  style={{ '--team-color': team.color }}
                >
                  <div className="sidebar-dot">
                    <div className="dot-inner" />
                  </div>
                  <div className="sidebar-card">
                    <div className="sidebar-team-name">
                      {team.name}
                      {team.team_key === session.teamKey && (
                        <span className="sidebar-you">BẠN</span>
                      )}
                    </div>
                    <div className={`sidebar-status${i === answeringIdx ? ' live' : ' waiting'}`}>
                      {i === answeringIdx ? (
                        <>
                          <span className="dot-pulse" />
                          {state.phase === 'answering' ? 'ĐANG ĐẤU' : 'Vừa trả lời'}
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
              <div className="play-doc-head">
                <div className="play-doc-head-title">
                  <span>✦</span>
                  MÀN HÌNH THÀNH VIÊN ĐỘI
                </div>
                <div className="play-doc-head-round">
                  <span className="dot-gold" />
                  VÒNG 1: THỬ THÁCH
                </div>
              </div>
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
                  <div style={{ fontSize: 18, fontWeight: 600, marginBottom: '0.5rem' }}>Chờ câu hỏi từ Người Điều Phối</div>
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

              <hr className="play-divider" />

              {/* Meme Panel */}
              <MemePanel onDrop={handleMemeDrop} disabled={false} teamColor={myTeam?.color} />
            </div>
          </main>
        </div>

        <footer className="play-footer">
          <div className="play-footer-inner">
            <span className="play-footer-copy">© 2026 THỬ VẬN MAY</span>
          </div>
        </footer>
      </div>

      {/* Popup Roll Dice for Active Team — chỉ hiện sau khi Host lật xong lá bài */}
      {state?.phase === 'resolving_effect' && isMyEffectTurn && state.eff_body_buttons === 'dice' && state.effect_revealed !== false && (
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

      {/* Popup Steal/Swap for Active Team — chỉ hiện sau khi Host lật xong lá bài */}
      {state?.phase === 'resolving_effect' && isMyEffectTurn && (state.eff_body_buttons === 'steal' || state.eff_body_buttons === 'swap') && !state.show_eff_continue && state.effect_revealed !== false && (
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

      {/* Popup Cơ Hội May Mắn — chọn nhận chắc 200đ hoặc thử vận may bốc lá phép */}
      {state?.phase === 'resolving_effect' && isMyEffectTurn && state.eff_body_buttons === 'bonus_choice' && !state.show_eff_continue && state.effect_revealed !== false && (
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
              {state.effect_icon} {state.effect_label} — {myTeam?.name}
            </h2>
            <p style={{ margin: '0 0 2rem 0', color: '#554243', fontSize: '16px' }}>
              {state.effect_desc}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px", width: "100%" }}>
              <button
                style={{
                  background: '#3F5D45', border: 'none', color: 'white', padding: "14px",
                  fontSize: "18px", fontWeight: "bold", borderRadius: "8px", cursor: "pointer"
                }}
                onClick={() => handleEffectTarget(0)}
              >
                Nhận chắc +200đ
              </button>
              <button
                style={{
                  background: '#5c0c1c', border: 'none', color: 'white', padding: "14px",
                  fontSize: "18px", fontWeight: "bold", borderRadius: "8px", cursor: "pointer"
                }}
                onClick={() => handleEffectTarget(1)}
              >
                🍀 Thử vận may — bốc lá phép
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
