# Answer timeout enforcement design

## Purpose and scope

`GAMEPLAY.md` documents a hard 15-second answer window per question, and the
prior multi-device design (`2026-08-20-multi-device-game-design.md`) already
models a `timeout` transition out of `ANSWERING` in its state machine. The
implementation from `2026-08-20-multi-device-game.md` shipped the countdown
display (`deadline_at`, `Play.jsx` timer) but never wired the transition
itself: nothing currently advances the turn when the 15 seconds elapse. A
silent or disconnected team can stall a game indefinitely, which contradicts
the documented flow ("15 giây mỗi câu").

This spec covers only that gap: making the stored `deadline_at` actually
expire a turn the same way a wrong answer does.

Out of scope:

- Any change to effect cards, ranking, meme drop, or join flow — all already
  implemented and unaffected.
- Server-side (Postgres/cron) timeout enforcement. The existing architecture
  is Host-authoritative and client-driven; a Host-side timer is consistent
  with that and needs no new infrastructure.
- Partial-credit or configurable time limits. The 15-second constant stays as
  defined in `Host.jsx`.

## Product decision

Timeout is treated exactly like a wrong answer for the active team: the
active team's option state is *not* marked (no option is right or wrong to
show), attempt advances to the next team in `attempt_order`, and if the
attempt order is exhausted the card is abandoned via the existing
`closeCard` path — identical to what `computeAnswerPatch`'s `"abandon"`
branch already does for three wrong answers in a row. No new phase is
introduced; `MAX_WRONG_BEFORE_ABANDON` behavior is reused for the "ran out of
teams" case.

Only the Host writes this transition, keeping the existing invariant that
Host is the sole actor allowed to mutate `game_state`.

## Mechanism

The Host is already mounted and subscribed for the entire life of a game, so
a simple `setInterval`/`setTimeout` keyed off `state.deadline_at` is
sufficient — no polling from Player devices, no DB trigger.

- While `state.phase === 'answering'` and `state.deadline_at` is set, Host
  schedules a single timeout for `deadline_at - Date.now()` (clamped to 0).
- On firing, Host re-reads `stateRef.current`. If the phase is no longer
  `answering`, or `active_card_num`/`revision`/`deadline_at` has changed
  since the timeout was scheduled (i.e., an answer or another timeout already
  resolved it), the fire is a no-op.
- Otherwise Host applies the same "current team failed" transition that a
  wrong answer would produce, but without marking any `option_states` entry:
  advance `attempt_idx`, set the next team as `answering_team_idx`, and issue
  a fresh `deadline_at` for that team's 15 seconds. If the attempt order is
  exhausted, abandon the card via `closeCard` exactly like the existing
  three-strikes path.
- Every transition still increments `revision`, so Player devices pick it up
  through the existing realtime subscription with no changes needed on
  `Play.jsx` beyond what already renders `deadline_at`.

This mirrors `computeAnswerPatch`'s wrong-answer branch closely enough that
the cleanest implementation factors a shared helper (e.g.
`computeTimeoutPatch(state, teams)`) rather than duplicating the
attempt-advance/abandon logic.

## Edge cases

- A late `PLAYER_ANSWER` event that arrives after the Host has already
  applied a timeout: the existing revision/card-number check in the event
  handler (`Host.jsx`'s `events` effect) already rejects it, since the
  timeout's `saveGameState` bumped `revision`.
- Host reload/reconnect mid-countdown: `deadline_at` is read from
  `game_state` on `loadGame`, so the rescheduled timeout uses the same
  absolute deadline — no time is gained or lost by refreshing the Host tab.
- Effect resolution, explaining, and closing phases have no `deadline_at`
  countdown and must not schedule a timeout; the effect only arms while
  `phase === 'answering'`.
- If all teams already failed by wrong answers, `deadline_at` is cleared by
  the existing abandon path, so no stray timeout fires afterward.

## Acceptance checks

1. Open a card, let 15 seconds elapse without any device answering: the turn
   advances to the next team in `attempt_order`, with a fresh 15-second
   window, on every connected device.
2. Repeat until `attempt_order` is exhausted purely by timeouts: the card is
   abandoned (no correct answer shown, no effect drawn), matching the
   three-wrong-answers behavior in `GAMEPLAY.md`.
3. A team answers with 1 second left: the answer is accepted and no
   competing timeout transition fires afterward.
4. Reload the Host mid-countdown: the remaining time shown to Player devices
   is consistent with the original deadline, not restarted at 15 seconds.
5. Timeout during one card must not affect an unrelated later card — no
   stale timers fire after `closeCard`/`resetGame`.
