# Entry Route Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the leftover, pre-Supabase PIN/role gate at `/` with a
plain landing page that links to `/host` and `/pick-team`, so the root route
matches the setup flow `GAMEPLAY.md` already documents and stops exposing a
hardcoded, desynced PIN.

**Architecture:** No state, no Supabase calls, no new dependencies. `/`
becomes static navigation; `/host` and `/pick-team` keep owning their own
real validation exactly as today.

**Tech Stack:** React 19, React Router.

**Spec:** `docs/superpowers/specs/2026-08-21-entry-route-reconciliation.md`

## Global Constraints

- Do not add any PIN or role gating to `/`. All real validation stays in
  `/host` (implicit, game-scoped) and `/pick-team` (`findGameByPin` +
  `joinGame`), unchanged.
- Do not touch `/host`, `/pick-team`, `/play`, `src/game/*`, or
  `supabase/*` — none of it is in scope.
- Do not introduce an automated test suite. Manual check + `npm run build`
  only, matching this project's established convention.
- Preserve the existing visual identity (fonts, masthead/doc-card styling)
  where practical so the landing page doesn't look out of place next to the
  rest of the app, but the interactive PIN/role gate must be fully removed,
  not merely hidden behind a flag.

## File map

- `src/pages/Register.jsx`: rewritten into a static landing page (or
  renamed — see Task 1 — if a clearer name reduces confusion with "team
  registration").
- `src/App.jsx`: route wiring for `/`, unchanged in shape (still renders one
  component at `/`) but confirm the import name matches after any rename.

## Task 1: Decide rename vs. in-place rewrite

**Files:** Read `src/pages/Register.jsx`, `src/App.jsx`.

**Produces:** A settled decision on whether the file keeps the name
`Register.jsx` (rewritten in place) or is renamed to something like
`Landing.jsx` to avoid implying it registers anything.

- [ ] Default recommendation: rename to `src/pages/Landing.jsx` and update
      the import/route in `App.jsx` accordingly — "Register" invites
      confusion with the team join flow (`PickTeam.jsx` already owns actual
      joining). Only skip the rename if it would create merge friction with
      other in-flight work; if so, rewrite `Register.jsx` in place instead
      and note why in the commit message.

## Task 2: Rewrite the root route as static navigation

**Files:** Modify (or replace via rename) `src/pages/Register.jsx` /
create `src/pages/Landing.jsx`; modify `src/App.jsx` if renamed.

**Consumes:** Existing visual style constants/CSS block from the current
`Register.jsx` (masthead, doc-card, fonts) as a starting point.

**Produces:** A `/` page with zero interactive gating and two navigation
actions.

- [ ] Remove `HARDCODED_PIN`, the `pin`/`role`/`error`/`showPin` state, the
      PIN `<input>`, the "🔐 PIN TEST" banner, the role radio group, and
      `handleSubmit`/`handlePinChange`/`handleKeyDown` entirely.
- [ ] Render a short explanatory paragraph (mirroring `GAMEPLAY.md`'s setup
      steps in plain language: Host opens `/host` on the presentation
      screen, each team opens `/pick-team` on their own device) plus two
      `<Link>` elements (React Router) to `/host` and `/pick-team` styled as
      the existing `.role-card`-like buttons if that visual treatment is
      kept.
- [ ] Keep the masthead/title/fonts block if reused, but delete the
      `test-banner` CSS rule block along with the markup that used it.
- [ ] If renaming per Task 1, update `src/App.jsx`'s import and `<Route
      path="/" element={...} />` to the new component.
- [ ] Run `npm run build`.

## Task 3: Manual check and documentation

**Files:** No required changes; update `GAMEPLAY.md` only if the manual
check surfaces wording worth adding (e.g., mentioning `/` is an optional
landing page, not a required step).

- [ ] Load `/` and confirm: no PIN input is rendered, no element reveals a
      PIN value (search the rendered DOM/page source for `1986` and
      confirm it appears nowhere outside of documented, non-secret
      copy such as "© 1986" if present).
- [ ] Click through to `/host` and confirm it still creates/resumes a game
      exactly as before (unaffected by this change).
- [ ] Click through to `/pick-team` and confirm its own PIN/team-code flow
      is unaffected.
- [ ] Run `npm run build`; commit as
      `refactor: replace legacy PIN gate with a plain landing page at /`.

## Plan self-review

- Task 1 resolves the one open naming question before code changes, so
  Task 2 isn't blocked mid-way by a rename decision.
- Task 2 is the only functional change, and it is strictly subtractive plus
  navigation — no new state, no new Supabase calls, nothing that could
  desync with `/host`/`/pick-team`'s existing, correct validation.
- Task 3 is manual-only, consistent with this project's no-automated-test
  convention, and explicitly checks that the removed PIN reveal is actually
  gone rather than just visually hidden.
- No task touches game logic, effects, schema, or any of the already-correct
  `/host`/`/pick-team`/`/play` flows.
