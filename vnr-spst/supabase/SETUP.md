# Setup Supabase Realtime — Hành Trình Đổi Mới

**Architecture:**
- **Questions + Cards** → giữ trong frontend code (`Host.jsx`)
- **Game State** → sync qua Supabase (teams, scores, câu hỏi đang mở, xúc xắc, hiệu ứng)
- **Meme** → giữ trong frontend code (`Host.jsx`)
- **PIN** → set cứng `1986` trong code

## 1. Tạo Project Supabase

1. Vào [https://supabase.com](https://supabase.com) → **New Project**
2. Chọn region Singapore hoặc Southeast Asia
3. Ghi lại **Project URL** + **Anon Key** (Settings → API)

## 2. Chạy SQL

Vào **Dashboard → SQL Editor** → Paste `supabase/schema.sql` → Run

## 3. Cài dependency

```bash
npm install @supabase/supabase-js
```

## 4. Tạo file config

```js
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://YOUR_PROJECT_ID.supabase.co',
  'YOUR_ANON_KEY'
)
```

## 5. Tạo game khi Host mở trang

```js
import { supabase } from '../lib/supabase'

// Gọi khi Host mount — tạo game mới trong DB
const { data } = await supabase.rpc('create_game', { p_pin: '1986' })
const gameId = data  // UUID của game vừa tạo
```

## 6. Sync Teams & Scores (Database Realtime)

```js
// Host.jsx — mỗi lần update score, ghi vào DB
async function updateTeamScore(gameId, teamKey, newScore) {
  await supabase
    .from('teams')
    .update({ score: newScore })
    .eq('game_id', gameId)
    .eq('team_key', teamKey)
}

// Play.jsx — lắng nghe realtime thay đổi teams
useEffect(() => {
  const channel = supabase
    .channel('teams-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'teams', filter: `game_id=eq.${gameId}` },
      (payload) => {
        // Cập nhật điểm trên UI Play
        setTeams(prev => prev.map(t =>
          t.team_key === payload.new.team_key ? { ...t, score: payload.new.score } : t
        ))
      }
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}, [gameId])
```

## 7. Sync Game State (Broadcast Channels)

Thay `BroadcastChannel` hiện tại bằng Supabase Broadcast:

```js
// ── Host.jsx: Thay broadcastDiceEvent ──
function broadcastDiceEvent(data) {
  supabase.channel('game-dice').send({
    type: 'broadcast',
    event: 'dice_roll',
    payload: data,
  })
}

function broadcastGameEvent(data) {
  supabase.channel('game-events').send({
    type: 'broadcast',
    event: 'game_event',
    payload: data,
  })
}

// ── Host.jsx: Lắng nghe đáp án từ Play ──
useEffect(() => {
  const channel = supabase.channel('game-events')
  channel
    .on('broadcast', { event: 'game_event' }, (p) => {
      if (p.payload.type === 'PLAY_ANSWER') {
        handleOptionClick(p.payload.optionIdx)
      }
    })
    .subscribe()
  return () => supabase.removeChannel(channel)
}, [])

// ── Host.jsx: Lắng nghe dice từ Play ──
useEffect(() => {
  const channel = supabase.channel('game-dice')
  channel
    .on('broadcast', { event: 'dice_roll' }, (p) => {
      handleSyncDice(p.payload)
    })
    .subscribe()
  return () => supabase.removeChannel(channel)
}, [])

// ── Play.jsx: Lắng nghe câu hỏi từ Host ──
useEffect(() => {
  const channel = supabase.channel('game-events')
  channel
    .on('broadcast', { event: 'game_event' }, (p) => {
      const d = p.payload
      if (d.type === 'QUESTION_OPEN') {
        setCurrentQuestion(d.card)
        setTeams(d.teams)
      } else if (d.type === 'ANSWER_RESULT') {
        // handle result
      } else if (d.type === 'GAME_RESET') {
        setTeams(d.teams)
      }
    })
    .subscribe()
  return () => supabase.removeChannel(channel)
}, [])

// ── Play.jsx: Gửi đáp án lên Host ──
function sendAnswer(optionIdx) {
  supabase.channel('game-events').send({
    type: 'broadcast',
    event: 'game_event',
    payload: { type: 'PLAY_ANSWER', optionIdx },
  })
}

// ── Play.jsx: Gửi dice roll lên Host ──
function broadcastDiceEvent(data) {
  supabase.channel('game-dice').send({
    type: 'broadcast',
    event: 'dice_roll',
    payload: data,
  })
}
```

## Tóm tắt flow

```
┌──────────┐                              ┌──────────┐
│  Host    │  Broadcast: QUESTION_OPEN    │  Play    │
│          │ ────────────────────────────► │          │
│          │                              │ (Player) │
│          │  Broadcast: PLAY_ANSWER      │          │
│          │ ◄──────────────────────────── │          │
└────┬─────┘                              └────┬─────┘
     │  DB: teams.score UPDATE                  │
     │ ────────────────────────► Supabase ──────│
     │  Realtime: postgres_changes              │
     │ ◄─────────────────────────  ◄────────────│
```

- **Broadcast Channels** → nhanh, cho câu hỏi, đáp án, dice (phemeral)
- **Database Realtime** → persistent, cho scores teams (reload vẫn giữ)
