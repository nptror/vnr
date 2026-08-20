# Multi-device Classroom Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the game from same-browser event sharing into a Supabase Realtime game for one Host and seven team representatives on separate devices.

**Architecture:** Supabase rows are the shared source of truth. `game_state` stores the current phase, decks, answer/effect state and revision; `teams` stores names, codes and scores. Players append answer events only; Host subscribes to those events and is the only UI allowed to transition state, alter scores, or end the game.

**Tech Stack:** React 19, Vite, React Router, `@supabase/supabase-js`, Supabase Postgres and Realtime.

**Spec:** `docs/superpowers/specs/2026-08-20-multi-device-game-design.md`

## Global Constraints

- Support one Host and up to seven team representatives on separate devices.
- Supabase is the single source of truth; remove BroadcastChannel/localStorage as shared business-state transports.
- localStorage may retain only the current device's `gameId` and `teamKey` for rejoining.
- Host is the only UI that opens cards, resolves answers, applies effects, resets, or finishes games.
- Player submits one answer only when its `teamKey` is the active answering team.
- Player reads `q`, never `text`, and never changes score/effect state locally.
- Every accepted state change increments `game_state.revision`; Host ignores answer events with a mismatched card or revision.
- PIN/team code are classroom participation controls, not production authentication or RLS.
- Do not add an automated test suite or broaden work into production authentication. Use manual acceptance checks and `npm run build`.

## File map

- `supabase/schema.sql`: persistent state, team code, and game creation lifecycle.
- `src/lib/supabase.js`: Vite environment-backed Supabase client.
- `src/game/catalog.js`: question/effect catalog and shuffled deck construction.
- `src/game/transitions.js`: pure deck, score and phase transitions.
- `src/game/gameRepository.js`: database reads, writes, subscriptions and answer events.
- `src/pages/Host.jsx`: authoritative Host orchestration.
- `src/pages/PickTeam.jsx`: PIN/team-code join flow.
- `src/pages/Play.jsx`: realtime Player display and answer submission.
- `README.md`, `GAMEPLAY.md`, `supabase/SETUP.md`: classroom setup documentation.

## Task 1: Persist multiplayer state and bootstrap Supabase

**Files:** Create `src/lib/supabase.js`; modify `supabase/schema.sql` and `supabase/SETUP.md`.

**Produces:** `supabase`, `isSupabaseConfigured`, and a schema capable of storing a complete game independently of browser state.

- [ ] Add these `game_state` fields, both in its `CREATE TABLE` declaration and idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements: `phase` (allowed values `selecting_card`, `answering`, `explaining`, `resolving_effect`, `closing_card`, `finished`), `card_deck JSONB`, `used_card_numbers JSONB`, `effect_deck JSONB`, `effect_cursor INT`, `deadline_at TIMESTAMPTZ`, `answering_team_key TEXT`, `answer_submission_team_key TEXT`, and `revision INT NOT NULL DEFAULT 0`.
- [ ] Add `team_code TEXT NOT NULL DEFAULT ''` to `teams`, enforce `UNIQUE(game_id, team_code)`, and set explicit default codes `red`, `blue`, `yellow`, `purple`, `orange`, `pink`, and `lam` in `create_game`.
- [ ] Change `create_game` to leave a new game in `waiting`; Host initializes it with its one stored card/effect deck. Keep one `game_state` row and the seven teams.
- [ ] Create `src/lib/supabase.js` with `const url = import.meta.env.VITE_SUPABASE_URL`, `const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY`, `export const isSupabaseConfigured = Boolean(url && anonKey)`, and `export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null`.
- [ ] Document `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` setup. State that all classroom devices use the same deployment environment.
- [ ] Run `npm run build`; commit only these files as `feat: add persistent multiplayer game schema`.

## Task 2: Extract shared domain and persistence interfaces

**Files:** Create `src/game/catalog.js`, `src/game/transitions.js`, and `src/game/gameRepository.js`; modify `src/pages/Host.jsx` to import catalog data.

**Consumes:** Task 1 schema/client and existing Host question/effect constants.

**Produces:** `createShuffledCardDeck`, `createShuffledEffectDeck`, `getCardByNumber`, `nextTeamIndex`, `closeCard`, score helpers, and repository functions for later tasks.

- [ ] Move questions, category metadata, total-card value, default teams and six effect definitions from `Host.jsx` to `catalog.js`. `createShuffledCardDeck` maps each question to a stable id, shuffles two copies, and stores exactly 35 numbered cards; `createShuffledEffectDeck` returns a shuffled list of the current effect definitions.
- [ ] In `transitions.js`, implement immutable helpers. `closeCard(state, teams, winnerIndex)` adds `active_card_num` to `used_card_numbers`, clears active-answer/effect fields, selects `finished` when all deck cards are used, otherwise selects `selecting_card`, picks the winner or next circular team, and increments revision. Score helpers clamp dice subtraction to zero and implement lose-all, reset, steal up to five and swap without mutation.
- [ ] In `gameRepository.js`, export `createGame(pin, cardDeck, effectDeck)`, `findGameByPin(pin)`, `joinGame(gameId, teamKey, teamCode)`, `loadGame(gameId)`, `subscribeToGame(gameId, onChange)`, `saveGameState(gameId, expectedRevision, nextState)`, `saveTeams(gameId, teams)`, `appendGameEvent(gameId, eventType, payload, createdBy)`, and `submitAnswerEvent({ gameId, teamKey, cardNum, revision, optionIdx })`.
- [ ] Make `saveGameState` update only when `game_id` and `revision` match, and throw when no row returns. Make `joinGame` validate `game_id`, `team_key`, and `team_code`, then return exactly `{ gameId, teamKey }`. Make answer events use `PLAYER_ANSWER` and payload `{ cardNum, revision, optionIdx }`.
- [ ] Make `subscribeToGame` listen to changes for `games`, `teams`, `game_state`, and `game_events`; it calls `onChange` and callers reload via `loadGame` instead of merging stale client state.
- [ ] Run `npm run build`; commit as `feat: add shared game state helpers`.

## Task 3: Rewrite Host as the state authority

**Files:** Modify `src/pages/Host.jsx`; modify `src/pages/Host.css` only if status/error UI needs it.

**Consumes:** Task 2 repository and transition helpers.

**Produces:** A Host that creates/resumes one game, reloads it after Realtime changes, and exclusively resolves answers, scores, effects, reset and finish.

- [ ] On mount, resume `vnr_host_game_id` or call `createGame('1986', createShuffledCardDeck(), createShuffledEffectDeck())`; then load and subscribe to the resulting game. Model screen data as `game`, `teams`, `state`, `loading`, and `error`; disable actions until loaded.
- [ ] Replace opening-card logic with a revision-checked write that sets `active_card_num`, circular `attempt_order`, `attempt_idx: 0`, active team index/key, blank option states, `phase: 'answering'`, a 15-second `deadline_at`, and `revision + 1`.
- [ ] Listen to new `PLAYER_ANSWER` events. Deduplicate ids in a ref, reload latest rows, and ignore an event unless phase, card number, revision, submitting team key and answer availability all match the current state. Valid answers either advance the attempt, enter `explaining` for correct, or reveal correct and enter `closing_card` after all teams fail.
- [ ] Resolve effect selection, dice generation, score updates, steal/swap targets, lose-all and reset only from Host actions. Store each result and update teams once; then call `closeCard` and persist the returned next state. Player event paths must not be reused for dice.
- [ ] Reset writes fresh card/effect decks, clears per-card/effect fields, zeroes scores, shuffles display order, enters `selecting_card`, and increments revision. Finish writes a ranking from latest teams and `games.status: 'finished'`.
- [ ] Delete all BroadcastChannel, localStorage game-event fallback, Player-dice synchronization and stale refs used only by that transport.
- [ ] Run `npm run build`; manually verify Host refresh resumes the same game; commit as `feat: make host authoritative over realtime game state`.

## Task 4: Implement realtime join and restricted Player behavior

**Files:** Modify `src/pages/PickTeam.jsx` and `src/pages/Play.jsx`.

**Consumes:** Task 2 repository and Task 3 Host-written state.

**Produces:** Device session `{ gameId, teamKey }`, canonical question display and active-team-only answer events.

- [ ] In `PickTeam`, add room-PIN and team-code inputs. On submit: find game by PIN, validate the selected team code, store only `vnr_game_session = JSON.stringify({ gameId, teamKey })`, and navigate to `/play`. Render errors for missing data, unknown PIN, invalid code, and unconfigured Supabase; never store PIN/code.
- [ ] In `Play`, redirect to `/pick-team` when `vnr_game_session` is absent. Otherwise load and subscribe to the game's rows; render connecting/reconnecting state until loaded and replace page model after each realtime reload.
- [ ] Render question/option data from `state.card_deck` entry matching `state.active_card_num`, using its `q` property. Render scores, current team, options, explanation, effect and rankings only from shared rows. Remove local question, timer mutation, local score, local dice, local turn and local result state.
- [ ] Enable a choice only when game is `playing`, state phase is `answering`, `teams[state.answering_team_idx].team_key === session.teamKey`, and `answer_submission_team_key` is empty. Submit exactly `{ gameId, teamKey, cardNum: state.active_card_num, revision: state.revision, optionIdx }`; disable after submit until a later revision appears.
- [ ] Delete `vnr_my_team`, `vnr_team_order`, BroadcastChannel/listeners, local next-team control, and Player dice behavior. Preserve the “bạn” marker by comparing team keys.
- [ ] Run `npm run build`; in two isolated browser sessions join different teams and verify only the active team can submit; commit as `feat: add realtime team join and player answers`.

## Task 5: Document and run manual acceptance

**Files:** Modify `README.md`, `GAMEPLAY.md`, and `supabase/SETUP.md`.

**Consumes:** Final routes and Task 1 environment configuration.

**Produces:** Classroom setup instructions consistent with the multi-device implementation.

- [ ] Remove claims that synchronization uses BroadcastChannel/localStorage or is limited to one browser. Document Supabase Realtime, room PIN, assigned team and team code.
- [ ] Add this start sequence: configure environment; Host opens `/host`; Host shares PIN/team codes; each representative joins through `/pick-team`; Host begins after devices show connected.
- [ ] Run the manual matrix: team join, non-empty question display, active-team-only answer, wrong answer, correct answer/effect, six effect types, reload during question/effect, final-card ranking, and reset. Fix any failure in its responsible source file before this commit.
- [ ] Run `npm run build`; commit documentation as `docs: describe multi-device classroom gameplay`.

## Plan self-review

- Task 1 implements persistence, Task 2 shared interfaces, Task 3 Host authority/effects/finish, Task 4 join/recovery/restricted Player, and Task 5 documentation plus all manual acceptance checks.
- No task expands historical content, adds production auth/RLS, or adds a new automated test suite.
- All state fields used in Tasks 3–4 are defined in Task 1; repository functions used there are defined in Task 2.
