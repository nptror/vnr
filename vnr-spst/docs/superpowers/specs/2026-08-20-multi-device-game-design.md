# Multi-device game flow design

## Purpose and scope

This design turns **Hành Trình Đổi Mới** into a small, classroom-oriented game that supports one Host and seven teams on separate devices. It fixes the essential game flows identified in the review: displaying questions, team identity, answering and turn progression, effect cards, state synchronization, recovery after reload, and automatic ranking.

Out of scope:

- Production-grade authentication, authorization, and Row Level Security.
- A complete automated test suite or a requirement that lint has no unrelated legacy errors.
- Historical-content expansion beyond the current question and effect-card sets.

## Product decisions

- One game has one Host and up to seven team representatives.
- Each representative uses one device and joins one team.
- Supabase is the single source of truth for shared game data.
- The Host is the only actor that advances game state, opens cards, resolves answers, applies effects, resets, or finishes a game.
- A PIN and team code are classroom participation controls only, not security controls.
- Browser BroadcastChannel and localStorage are not used for shared business state. localStorage may retain a device's `gameId` and `teamKey` to make rejoining convenient.

## Core data model

### `games`

Represents one match. It owns `id`, `pin`, `status` (`waiting`, `playing`, or `finished`), `current_team_idx`, and timestamps.

### `teams`

Stores the seven teams belonging to a game: stable `team_key`, classroom `team_code`, display name, color, score, and display order. `team_code` is unique within a game and identifies a team representative during join; it is not a production credential. Scores are changed only through Host-owned game actions.

### `game_state`

There is exactly one row per game. It is the renderable state for all clients and contains:

- Deck state: `card_deck` (the shuffled card identifiers), `used_card_numbers`, `effect_deck` (the shuffled effect identifiers), and the currently active card number.
- Answering state: attempt order, attempt index, current answering team, option states, answer phase, and remaining deadline metadata.
- Effect state: selected effect, target team, required action, and completion state.
- Finish state: winner visibility and ranking snapshot.
- `revision` and `updated_at`, incremented for every accepted transition.

The schema adds the deck-state fields above and a non-null integer `revision` defaulting to zero. A client must not reconstruct a deck independently after joining or reloading.

### `game_events`

An append-only lightweight audit trail. Every Host transition records its event type, game id, payload, actor, revision, and time. It supports presentation troubleshooting only; it is not the client source of truth.

## Client responsibilities

### Host (`/host`)

The Host creates or resumes a game, subscribes to `games`, `teams`, and `game_state`, and renders the authoritative board. Its allowed actions are:

1. Open an unused card when the phase is `selecting_card`.
2. Accept or reject the active team's submitted answer.
3. Advance to the next team after a wrong answer or timeout.
4. Draw and resolve the effect after a correct answer.
5. Reset or finish the game.

Host writes one intentional state transition at a time and then relies on realtime updates for rendering rather than maintaining a divergent local copy.

### Team join (`/pick-team`)

A representative supplies a game PIN, selects the assigned team, and supplies the classroom team code. The page persists only `gameId` and `teamKey` locally, then routes to `/play`.

### Player (`/play`)

Player subscribes to the same game rows and is read-only except for `submitAnswer`. The answer control is enabled only when all conditions hold:

- Game status is `playing`.
- There is an active card in the answering phase.
- The player's `teamKey` maps to `answering_team_idx`.
- The team has not submitted an answer for the current attempt.

The player renders the question from the canonical `q` field (not `text`). An answer submission contains `gameId`, active-card number, current revision, team key, and option index. The UI never opens dice or changes scores by itself; it waits for the Host's effect state.

## Game state machine

```text
SELECTING_CARD
  -> ANSWERING            Host opens one unused card
ANSWERING
  -> EXPLAINING           active team answers correctly
  -> ANSWERING            active team answers wrongly; next team becomes active
  -> EXPLAINING           all teams are wrong or timeout sequence ends
EXPLAINING
  -> RESOLVING_EFFECT     a correct answer requires an effect
  -> CLOSING_CARD         no team answered correctly
RESOLVING_EFFECT
  -> CLOSING_CARD         dice/steal/swap/reset/lose-all is completed
CLOSING_CARD
  -> FINISHED             no unused cards remain
  -> SELECTING_CARD       next eligible team starts a turn
FINISHED
  -> SELECTING_CARD       Host explicitly starts a new game
```

Rules:

- Card-selection right always rotates to the next team in fixed circular order after a card closes — regardless of who answered correctly. (Superseded 2026-08-24: earlier revisions of this spec had the winning team keep the next card selection; the game's actual intended design always rotates turns.)
- A correct answer always triggers a guaranteed dice roll for points (100/200/300/400/500/600 by face), then a 50/50 chance of an additional "Cơ Hội May Mắn" — if it appears, the team (or Host on their behalf) chooses between a flat +200 bonus or drawing one of the 6 weighted effect cards (dice/steal/swap/lose-all/reset). This bonus is offered at most once per correct answer.
- A fully failed card (3 wrong attempts, or the attempt order exhausted, including timeout) reveals the correct option and explanation via `closing_card` before the card closes — it does not draw an effect.
- Each card can close once only.
- Score cannot fall below zero.
- A dice result is generated once by Host and stored before it is shown. Player dice interaction is presentation-only if retained.
- `closeCard` calculates whether all cards are used from the newly produced deck, not stale React state.

## Realtime and recovery

Clients load `games`, `teams`, and `game_state` by `gameId`, then open Supabase Realtime subscriptions for those records. Every received revision replaces the corresponding display model.

On reload or late join, a client reads the latest rows before subscribing and restores the exact active question, current answering team, option state, score, effect, or ranking. A stale answer is rejected when its active-card number or revision no longer matches the current state.

## Failure handling

- If a team loses connection, its representative may reload and rejoin using the same PIN and team code.
- If a player submits late, duplicated, or non-active-team answers, Host ignores the request and the player reloads the authoritative state.
- If a Host refreshes, it resumes the game selected by its saved `gameId` and continues from `game_state`.
- If Realtime is temporarily unavailable, show a visible reconnecting status and disable mutations until the latest state is loaded.

## Acceptance checks

Manual checks are sufficient for this course project:

1. Host opens a card and every joined device sees its non-empty question and four options.
2. Only the assigned, active team can submit one answer.
3. Wrong answer and timeout advance the same turn on every device.
4. Correct answer enters explanation, always rolls the guaranteed dice, sometimes offers the bonus choice, updates scores accordingly, and hands the next card selection to the next team in fixed order (not the winner).
5. Validate all six weighted effect types when drawn via the bonus choice: add points, subtract points, lose all, reset, steal, and swap.
6. Reload Player or Host during an active question, effect, and finished ranking; each restores the current shared state.
7. Close the final card and confirm ranking appears automatically.
8. Reset creates a fresh deck, shuffled team order, zero scores, and a synchronized selecting-card phase.

## Implementation boundaries

- Extract question/effect data and game transition helpers from `Host.jsx`; components should render state and invoke named actions only.
- Introduce a Supabase client module plus a game repository/action layer. Pages should not construct realtime channels or SQL-shaped payloads directly.
- Keep `Host.jsx`, `Play.jsx`, and `PickTeam.jsx` as page-level orchestration views, with a shared game-state hook for subscriptions and loading status.
- Remove the current BroadcastChannel business-event handlers once the Supabase flow is wired.
