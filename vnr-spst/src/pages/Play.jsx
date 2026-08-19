import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── Dữ liệu mẫu (sau sẽ truyền qua Context/props) ───────────
const SAMPLE_TEAMS = [
  { id: 'red',    name: 'Đội Đỏ',   color: '#7A2430' },
  { id: 'blue',   name: 'Đội Xanh', color: '#1F4E66' },
  { id: 'yellow', name: 'Đội Vàng', color: '#B8860B' },
  { id: 'purple', name: 'Đội Tím',  color: '#4A3A6B' },
  { id: 'orange', name: 'Đội Cam',  color: '#D97706' },
  { id: 'pink',   name: 'Đội Hồng', color: '#DB2777' },
  { id: 'lam',    name: 'Đội Lam',  color: '#2563EB' },
]

const SAMPLE_QUESTION = {
  text: 'Căn cứ vào tinh thần Nghị quyết Đại hội VI, đồng chí hãy nêu rõ những biện pháp trọng tâm nhằm xóa bỏ cơ chế tập trung quan liêu bao cấp, chuyển sang hạch toán kinh doanh xã hội chủ nghĩa trong giai đoạn đầu của thời kỳ quá độ?',
  options: [
    'Duy trì cơ chế quản lý cũ nhưng tăng cường kiểm tra, giám sát chặt chẽ hơn.',
    'Thực hiện khoán sản phẩm đến nhóm và người lao động trong nông nghiệp.',
    'Đổi mới cơ chế quản lý kinh tế, thực hiện hạch toán kinh doanh xã hội chủ nghĩa.',
    'Tập trung phát triển công nghiệp nặng làm nền tảng cho nền kinh tế quốc dân.',
  ],
  correct: 2,
}

const OPTION_LABELS = ['A', 'B', 'C', 'D']
const ANSWER_TIME = 60 // giây

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
  .play-nav-actions { display: flex; gap: 0.5rem; }
  .play-nav-btn {
    background: none; border: none; cursor: pointer;
    color: #5c0c1c; padding: 0.5rem; border-radius: 9999px;
    display: flex; align-items: center;
    transition: background 0.15s;
  }
  .play-nav-btn:hover { background: #ffdadb; }
  .play-nav-btn .material-symbols-outlined { font-size: 24px; }

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
  .sidebar-mini-stamp {
    position: absolute; top: 6px; right: 6px;
    border: 1px dashed #5c0c1c;
    color: #5c0c1c;
    font-size: 9px; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase;
    padding: 1px 4px;
    transform: rotate(15deg);
    opacity: 0.6;
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

  /* Doc shadow layer */
  .play-doc::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 1px solid #887272;
    transform: translate(4px, 4px);
    z-index: -1;
    background: #d3d9f0;
    opacity: 0.2;
    pointer-events: none;
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
  .obs-item.offline { opacity: 0.5; }
  .obs-item.offline span { text-decoration: line-through; }
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
  .result-banner.timeout { border-color: #D97706; color: #D97706; background: #fff8e1; }

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
  .play-footer-links { display: flex; gap: 1.5rem; }
  .play-footer-links a {
    font-size: 12px; color: #554243; text-decoration: none;
    transition: color 0.15s;
  }
  .play-footer-links a:hover { color: #5c0c1c; }
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
  .play-dice-close {
    position: absolute; top: 1rem; right: 1rem;
    background: none; border: none; cursor: pointer;
    color: #887272; font-size: 20px; line-height: 1;
    transition: color 0.15s;
  }
  .play-dice-close:hover { color: #5c0c1c; }
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
  .play-dice-btn {
    background: #7a2430; color: #fff;
    font-family: 'Noto Serif', serif;
    font-size: 13px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    padding: 0.75rem 2.5rem;
    border: none; border-radius: 0; cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .play-dice-btn:hover:not(:disabled) { transform: translateY(2px); box-shadow: 0 0 0 2px #141b2c; }
  .play-dice-btn:disabled { opacity: 0.5; cursor: not-allowed; }
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
  .play-dice-confirm {
    margin-top: 1rem;
    background: transparent; color: #141b2c;
    font-family: 'Noto Serif', serif;
    font-size: 13px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    padding: 0.5rem 2rem;
    border: 1px solid #887272; border-radius: 0; cursor: pointer;
    transition: background 0.15s;
  }
  .play-dice-confirm:hover { background: #f1e7cf; }
`

function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0')
  const s = String(sec % 60).padStart(2, '0')
  return `${m}:${s}`
}

export default function Play() {
  const navigate = useNavigate()

  // ── Game state ──
  const [currentTeamIdx, setCurrentTeamIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(ANSWER_TIME)
  const [selected, setSelected] = useState(null)   // null | 0-3
  const [revealed, setRevealed] = useState(false)  // show correct/wrong
  const [result, setResult] = useState(null)        // 'correct' | 'wrong' | 'timeout'
  const timerRef = useRef(null)

  // ── Dice state ──
  const [showDice, setShowDice] = useState(false)
  const [diceRolling, setDiceRolling] = useState(false)
  const [diceValue, setDiceValue] = useState(null)
  const [diceVisible, setDiceVisible] = useState(false)
  const cubeRef = useRef(null)
  const wrapperRef = useRef(null)
  const shadowRef = useRef(null)

  const currentTeam = SAMPLE_TEAMS[currentTeamIdx]

  // ── Timer ──
  useEffect(() => {
    if (revealed) return
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          setResult('timeout')
          setRevealed(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [revealed])

  // ── Timer color ──
  const timerClass =
    timeLeft > 20 ? 'timer-normal' :
    timeLeft > 10 ? 'timer-warn' :
    'timer-danger'

  // ── Select option ──
  const handleSelect = (idx) => {
    if (revealed || selected !== null) return
    setSelected(idx)
    clearInterval(timerRef.current)
    const isCorrect = idx === SAMPLE_QUESTION.correct
    setResult(isCorrect ? 'correct' : 'wrong')
    setRevealed(true)
    if (isCorrect) {
      // Mở dice modal sau 400ms để animation đáp án hiện trước
      setTimeout(() => openDice(), 400)
    }
  }

  // ── Dice handlers ──
  const openDice = () => {
    setDiceValue(null)
    setDiceVisible(false)
    setDiceRolling(false)
    if (cubeRef.current) cubeRef.current.style.transform = 'rotateX(0deg) rotateY(0deg)'
    setShowDice(true)
  }

  const handleRollDice = () => {
    if (diceRolling || diceValue !== null) return
    setDiceRolling(true)
    setDiceVisible(false)

    const face = Math.floor(Math.random() * 6) + 1
    const score = Math.min(face, 5)
    let rx = 1440, ry = 1440
    switch (face) {
      case 1: break
      case 6: ry += 180; break
      case 3: ry -= 90;  break
      case 4: ry += 90;  break
      case 2: rx -= 90;  break
      case 5: rx += 90;  break
    }
    if (wrapperRef.current) wrapperRef.current.classList.add('play-dice-bouncing')
    if (shadowRef.current)  shadowRef.current.classList.add('play-shadow-rolling')
    if (cubeRef.current)    cubeRef.current.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`

    setTimeout(() => {
      setDiceValue(score)
      setDiceVisible(true)
      setDiceRolling(false)
      if (wrapperRef.current) wrapperRef.current.classList.remove('play-dice-bouncing')
      if (shadowRef.current)  shadowRef.current.classList.remove('play-shadow-rolling')
    }, 1500)
  }

  const handleDiceConfirm = () => {
    setShowDice(false)
  }

  // ── Option style ──
  const optClass = (idx) => {
    if (!revealed) return selected === idx ? 'selected' : ''
    if (idx === SAMPLE_QUESTION.correct) return 'correct'
    if (idx === selected && idx !== SAMPLE_QUESTION.correct) return 'wrong'
    return ''
  }

  // ── Next team ──
  const handleNext = () => {
    const nextIdx = (currentTeamIdx + 1) % SAMPLE_TEAMS.length
    setCurrentTeamIdx(nextIdx)
    setTimeLeft(ANSWER_TIME)
    setSelected(null)
    setRevealed(false)
    setResult(null)
  }

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,600;0,700;1,400&family=Noto+Sans:wght@400;500;700&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />
      <style>{PLAY_STYLE}</style>

      <div className="play-page">

        {/* ── Top Header ── */}
        <header className="play-header">
          <div className="play-header-inner">
            <div className="play-title">HÀNH TRÌNH ĐỔI MỚI</div>
            <div className="play-nav-actions">
              <button className="play-nav-btn" title="Lịch sử">
                <span className="material-symbols-outlined">history_edu</span>
              </button>
              <button className="play-nav-btn" title="Cơ quan">
                <span className="material-symbols-outlined">account_balance</span>
              </button>
            </div>
          </div>
        </header>

        <div className="play-body">

          {/* ── Sidebar ── */}
          <aside className="play-sidebar">
            <div className="sidebar-title">Lượt Thi Đấu</div>
            <div className="sidebar-list">
              <div className="sidebar-timeline-line" />
              {SAMPLE_TEAMS.map((team, i) => (
                <div
                  key={team.id}
                  className={`sidebar-item${i === currentTeamIdx ? ' active' : ''}`}
                >
                  <div className="sidebar-dot">
                    <div className="dot-inner" style={i === currentTeamIdx ? {} : { background: '#887272' }} />
                  </div>
                  <div className="sidebar-card">
                    <div className="sidebar-team-name" style={i === currentTeamIdx ? { color: team.color } : {}}>
                      {team.name}
                    </div>
                    <div className={`sidebar-status${i === currentTeamIdx ? ' live' : ' waiting'}`}>
                      {i === currentTeamIdx ? (
                        <>
                          <span className="dot-pulse" />
                          {revealed ? 'Đã trả lời' : 'Đang trả lời...'}
                        </>
                      ) : i < currentTeamIdx ? (
                        '✓ Đã hoàn thành'
                      ) : (
                        'Chờ đến lượt'
                      )}
                    </div>
                    {i === currentTeamIdx && (
                      <div className="sidebar-mini-stamp">XÁC NHẬN</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* ── Main ── */}
          <main className="play-main">
            <div className="play-doc">

              {/* Team info bar */}
              <div className="team-info-bar">
                <div>
                  <div className="team-info-label">NHÓM ĐANG THI ĐẤU</div>
                  <div className="team-info-name" style={{ color: currentTeam.color }}>
                    {currentTeam.name}
                  </div>
                </div>
                <div>
                  <div className="team-info-time-label">THỜI GIAN CÒN LẠI</div>
                  <div className={`team-info-timer ${timerClass}`}>
                    {formatTime(timeLeft)}
                  </div>
                </div>
              </div>

              {/* Question */}
              <div className="q-eyebrow">CÂU HỎI TRUY VẤN</div>
              <div className="q-text">"{SAMPLE_QUESTION.text}"</div>

              {/* Options */}
              <div className="opt-eyebrow">CÁC PHƯƠNG ÁN TRẢ LỜI</div>
              <div className="options-grid">
                {SAMPLE_QUESTION.options.map((opt, i) => (
                  <button
                    key={i}
                    className={`opt-btn ${optClass(i)}`}
                    disabled={revealed}
                    onClick={() => handleSelect(i)}
                  >
                    <span className="opt-label">{OPTION_LABELS[i]}</span>
                    <span>{opt}</span>
                  </button>
                ))}
              </div>

              {/* Result banner */}
              {result && (
                <div className={`result-banner ${result}`}>
                  {result === 'correct' && (
                    <span
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={openDice}
                    >
                      ✓ Trả lời đúng! Nhấn để tung xúc xắc 🎲
                    </span>
                  )}
                  {result === 'wrong'   && '✗ Trả lời sai. Chờ đội tiếp theo.'}
                  {result === 'timeout' && '⏰ Hết thời gian! Không tính điểm lượt này.'}
                </div>
              )}

              <hr className="play-divider" />

              {/* Observers */}
              <div className="obs-eyebrow">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
                CÁC ĐƠN VỊ ĐANG THEO DÕI
              </div>
              <div className="obs-grid">
                {SAMPLE_TEAMS.filter((_, i) => i !== currentTeamIdx).slice(0, 4).map(team => (
                  <div key={team.id} className="obs-item">
                    <span className="obs-dot" style={{ background: team.color }} />
                    <span>{team.name}</span>
                  </div>
                ))}
              </div>

              {/* Next button (visible after answered) */}
              {revealed && (
                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleNext}
                    style={{
                      background: '#7a2430', color: '#fff',
                      fontFamily: "'Noto Serif', serif",
                      fontSize: 13, fontWeight: 700,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      padding: '0.75rem 2rem',
                      border: 'none', cursor: 'pointer',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(2px)'; e.currentTarget.style.boxShadow = '0 0 0 2px #141b2c' }}
                    onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                  >
                    Đội tiếp theo →
                  </button>
                </div>
              )}
            </div>
          </main>
        </div>

        {/* ── Footer ── */}
        <footer className="play-footer">
          <div className="play-footer-inner">
            <span className="play-footer-copy">© 1986-2024 BAN TUYÊN GIÁO TRUNG ƯƠNG</span>
            <ul className="play-footer-links">
              <li><a href="#">Điều lệ</a></li>
              <li><a href="#">Hướng dẫn</a></li>
              <li><a href="#">Báo cáo lỗi</a></li>
            </ul>
          </div>
        </footer>

        {/* ── Dice Modal ── */}
        <style>{DICE_STYLE}</style>
        <div className={`play-dice-overlay${showDice ? '' : ' hidden'}`}>
          <div className="play-dice-modal">
            <button
              className="play-dice-close"
              onClick={() => !diceRolling && setShowDice(false)}
            >✕</button>

            <div className="play-dice-title">
              Gieo Xúc Xắc — {SAMPLE_TEAMS[currentTeamIdx]?.name}
            </div>

            {/* 3-D cube */}
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

            <button
              className="play-dice-btn"
              onClick={handleRollDice}
              disabled={diceRolling || diceValue !== null}
            >
              {diceRolling ? 'Đang gieo...' : diceValue !== null ? 'Đã gieo' : 'Gieo Điểm'}
            </button>

            <div className={`play-dice-result${diceVisible ? '' : ' hidden-result'}`}>
              <span className="play-dice-result-text">Tiến lên</span>
              <span className="play-dice-result-num">{diceValue ?? ''}</span>
              <span className="play-dice-result-text">bước</span>
            </div>

            {diceVisible && (
              <button className="play-dice-confirm" onClick={handleDiceConfirm}>
                Xác nhận +{diceValue} điểm
              </button>
            )}
          </div>
        </div>

      </div>
    </>
  )
}
