# Answer Timeout Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the documented 15-second answer window (`GAMEPLAY.md`) actually
expire a team's turn, instead of only being displayed as a cosmetic countdown
on `/play`.

**Architecture:** Host (`src/pages/Host.jsx`) already owns every state
transition and stays mounted for the life of a game. It gains a single
`setTimeout` keyed off `state.deadline_at` that, on firing, applies the same
attempt-advance/abandon transition a wrong answer produces today — reusing
`closeCard` from `src/game/transitions.js` for the exhausted-attempt-order
case. No schema change, no new phase, no Player-side change beyond what
already renders `deadline_at`.

**Tech Stack:** React 19, `@supabase/supabase-js`, existing
`saveGameState`/`closeCard` helpers.

**Spec:** `docs/superpowers/specs/2026-08-21-answer-timeout.md`

## Global Constraints

- Only Host writes `game_state`; the timeout transition must go through the
  existing `saveGameState(gameId, expectedRevision, nextState)` revision-check
  path, never a direct table write.
- Reuse `MAX_WRONG_BEFORE_ABANDON`/`closeCard` semantics for "attempt order
  exhausted" instead of introducing a new abandon code path.
- A timeout must not mark any `option_states` entry as `"wrong"` — the
  question's answer is not revealed by a timeout, matching the existing
  distinction between "answered wrong" and "ran out of time."
  <!-- clarify below in Task 1 which of these actually matches GAMEPLAY.md -->
- No new phase, table column, or automated test suite. Manual acceptance
  checks and `npm run build` only, matching the existing project convention.
- Do not touch effect resolution, meme drop, join flow, or ranking — all
  already correct.

## File map

- `src/pages/Host.jsx`: schedule/cancel the timeout effect, apply the
  transition.
- `src/game/transitions.js`: optional shared helper if the timeout and
  wrong-answer branches diverge enough to want one.

## Task 1: Confirm the exact timeout transition shape

**Files:** Read `src/pages/Host.jsx` (`computeAnswerPatch`), `GAMEPLAY.md`.

**Produces:** A decided, written-down answer to one ambiguity before writing
code: should a timeout mark the active team's *own* option row as `"wrong"`
(visually matching an incorrect answer) or leave `option_states` untouched
and only rotate `answering_team_idx`?

- [ ] Re-read `GAMEPLAY.md`'s turn-flow diagram and the `TRẢ LỜI SAI` branch
      text. Confirm whether "hết giờ" is meant to behave identically to a
      wrong answer (including visually marking the option row, since players
      only ever see options they explicitly picked — a timeout has no picked
      option to mark) or Host UI-only (no option marked, just an advance).
      Default assumption per the spec (`2026-08-21-answer-timeout.md`) is: no
      option marked, since no option was actually selected.
- [ ] Write the decision as a one-line comment above the new timeout handler
      in `Host.jsx` so it isn't re-litigated later.

## Task 2: Add Host-side timeout scheduling and transition

**Files:** Modify `src/pages/Host.jsx`.

**Consumes:** `closeCard` from `src/game/transitions.js`, `saveGameState`
from `src/game/gameRepository.js`, `state.deadline_at`, `state.attempt_order`,
`state.attempt_idx`.

**Produces:** A turn that reliably advances 15 seconds after
`state.deadline_at`, on the Host device only, without any new Player-side
code.

- [ ] Add a `useEffect` keyed on `[state?.deadline_at, state?.phase]` that,
      when `phase === 'answering'` and `deadline_at` is set, schedules
      `setTimeout(fire, Math.max(0, new Date(deadline_at) - Date.now()))` and
      clears the timeout on cleanup (phase change, unmount, or a new
      `deadline_at` superseding the old one).
- [ ] Implement `fire` to re-read `stateRef.current` at call time (not the
      closed-over `state`) and bail out silently if `phase !== 'answering'`,
      or `deadline_at` no longer matches what this timer was scheduled for —
      this covers the case where an answer or an earlier timeout already
      resolved the card.
- [ ] Extract or mirror the advance/abandon branch of `computeAnswerPatch`
      (lines computing `wrongCount`/`attemptIdx`/`nextSelectorIdx` today) into
      a form usable without an `optionIdx`, per the Task 1 decision. If the
      decision is "no option marked," this is simpler than
      `computeAnswerPatch`: just increment `attempt_idx` and check exhaustion.
- [ ] On exhaustion (attempt order run out purely via timeouts, or a mix of
      wrong answers and timeouts), call `closeCard(state, teams, nextSelectorIdx)`
      exactly as `applyAnswer`'s `"abandon"` branch does today, and persist via
      `saveGameState(gameId, s.revision, next)`.
- [ ] On non-exhaustion, persist a patch that sets the next team as
      `answering_team_idx`/`answering_team_key`/`attempt_label`, a fresh
      `deadline_at: computeDeadlineAt()`, and `revision: s.revision + 1` —
      matching the shape `openCard`/`computeAnswerPatch`'s `"next"` branch
      already produce.
- [ ] Run `npm run build`.

## Task 3: Manual acceptance and documentation

**Files:** None required to modify; verify only. Update `GAMEPLAY.md` only if
manual testing reveals the documented flow text needs a one-line
clarification (e.g., explicitly stating timeout behaves like a wrong answer
for turn-advance purposes).

- [ ] Open a card on Host with a second device on `/play` as the active
      team. Let 15 seconds elapse without answering. Confirm the turn passes
      to the next team in `attempt_order` on both devices, with a fresh
      15-second countdown on `/play`.
- [ ] Let timeouts exhaust the full attempt order (all teams miss their
      window). Confirm the card is abandoned: no explanation shown, no
      effect drawn, next team gets `selecting_card` rights — same as the
      existing three-wrong-answers path.
- [ ] Submit a real answer with ~1 second left and confirm no competing
      timeout transition fires afterward (no double-advance, no stale
      `deadline_at` triggering a second jump).
- [ ] Reload the Host tab mid-countdown and confirm the remaining time shown
      on `/play` is unaffected (deadline is absolute, not restarted).
- [ ] Run `npm run build`; commit as
      `feat: enforce 15-second answer timeout on host`.

## Plan self-review

- Task 1 removes the one real ambiguity (does timeout mark an option) before
  any code is written, per the spec's stated product decision.
- Task 2 is the only code change and stays entirely inside `Host.jsx`,
  consistent with "Host is the only actor that advances game state" from the
  original multi-device spec.
- Task 3 is manual-only, matching this project's established no-automated-
  test-suite convention (see `2026-08-20-multi-device-game.md`'s Global
  Constraints).
- No task touches effect cards, meme drop, join flow, schema, or ranking —
  all already implemented correctly per the code review that produced this
  plan.
