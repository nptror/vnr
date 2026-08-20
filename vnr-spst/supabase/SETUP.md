# Setup Supabase Realtime — Hành Trình Đổi Mới

**Architecture:**
- **Questions + Cards** → Host tạo một bộ bài cho mỗi ván mới, lưu trong `game_state`
- **Game State** → sync qua Supabase (teams, scores, câu hỏi đang mở, xúc xắc, hiệu ứng)
- **Meme drop** → kênh Supabase Realtime Broadcast riêng, ephemeral (không lưu DB)
- **PIN** → set cứng `1986` trong code

All classroom devices must use the same deployment environment so they receive the
same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` values.

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

## 4. Configure the frontend environment

Create a `.env` file in the project root (or set these values in the deployment
environment), then restart/rebuild Vite:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

`src/lib/supabase.js` exports `supabase` and `isSupabaseConfigured`. The client is
`null` until both environment variables are present.

## 5. Repository layer (`src/game/gameRepository.js`)

All reads/writes go through this module — pages never call `supabase.from(...)` or
build `postgres_changes` filters directly.

- `createGame(pin, cardDeck, effectDeck)` — Host calls this once on first load (or
  resumes an existing `gameId` saved in `localStorage`). Creates the `games` row,
  the seven `teams` rows (via the `create_game` SQL function) and the single
  `game_state` row seeded with the shuffled decks.
- `findGameByPin(pin)` / `joinGame(gameId, teamKey, teamCode)` — used by `/pick-team`
  to validate a room PIN and a team's classroom code before a device joins.
- `loadGame(gameId)` — fetches `games`, `teams`, `game_state`, `game_events` for a
  game in one call; every page calls this on mount and again on every realtime change.
- `subscribeToGame(gameId, onChange)` — opens one Supabase Realtime channel listening
  to `postgres_changes` on all four tables and calls `onChange` (which just re-runs
  `loadGame`) on any insert/update.
- `saveGameState(gameId, expectedRevision, nextState)` — the only way `game_state` is
  written. It matches on `game_id AND revision = expectedRevision`; if another writer
  already advanced the revision, the update matches zero rows and this throws, so the
  caller reloads instead of silently overwriting a newer state.
- `saveTeams(gameId, teams)` — upserts team rows (`name`, `color`, `score`,
  `display_order`) by `(game_id, team_key)`.
- `appendGameEvent` / `submitAnswerEvent` — Players only ever call
  `submitAnswerEvent({ gameId, teamKey, cardNum, revision, optionIdx })`, which inserts
  one `game_events` row of type `PLAYER_ANSWER`. Host is the only reader of these events.
- `subscribeToMemeDrops(gameId, onDrop)` / `sendMemeDrop(gameId, payload)` — meme
  reactions use a plain Supabase Realtime **Broadcast** channel (`meme:{gameId}`), not
  a table. Nothing is persisted; a dropped meme just fades out client-side.

## 6. How Host and Play stay in sync

There are no Broadcast Channels or client-generated dice results. Everything flows
through Postgres rows and `postgres_changes`, except the purely cosmetic meme drops:

```
┌──────────┐   game_events insert: PLAYER_ANSWER    ┌──────────┐
│  Play    │ ───────────────────────────────────────►│  Host    │
│ (Player) │                                          │          │
│          │◄───────────────────────────────────────  │          │
└──────────┘   postgres_changes: games/teams/         └──────────┘
               game_state/game_events (both directions
               reload via loadGame on every change)
```

- **Host** is the only writer of `game_state` and `teams`. Every accepted transition
  increments `game_state.revision`; a stale write (mismatched revision) is rejected
  by `saveGameState`.
- **Player** never mutates `game_state`/`teams` directly. It appends a `PLAYER_ANSWER`
  event; Host validates the event's `cardNum`/`revision`/`teamKey` against the current
  `game_state` before applying it, so a late or duplicate submission is ignored.
- Wrong answers rotate through the attempt order; once 3 options have been marked
  wrong (or the attempt order is exhausted), Host abandons the card immediately — no
  correct answer is revealed and no effect is drawn — and the next team gets to pick a
  new card.
- A dice result is generated once, by Host, and written to `game_state.dice_value`
  before it is revealed — Player only renders the animation from that shared value.
- Reload on either device re-reads the latest rows via `loadGame`, so mid-question,
  mid-effect and finished-ranking states all survive a refresh.
- Meme drops are the one exception to "Supabase table = source of truth": they use
  Realtime Broadcast because they are ephemeral and never affect game state.
