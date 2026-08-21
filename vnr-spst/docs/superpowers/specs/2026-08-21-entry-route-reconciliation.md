# Entry route reconciliation design

## Purpose and scope

`GAMEPLAY.md`'s "Các bước Setup (nhiều thiết bị)" section documents exactly
two entry points: the Host opens `/host` directly, and each team
representative opens `/pick-team` directly. Neither the multi-device design
(`2026-08-20-multi-device-game-design.md`) nor the classroom setup docs
mention any other route.

The app's actual root route `/` (`src/App.jsx`, `src/pages/Register.jsx`)
does not match this. It is a leftover pre-Supabase gate: a hardcoded
`HARDCODED_PIN = '1986'` constant (commented `// ─── CẤU HÌNH TEST ───`)
checked entirely client-side with no call into `gameRepository`, plus a
role radio (Người Điều Phối / Người Chơi) that routes to `/host` or
`/pick-team` on match. It also renders a "🔐 PIN TEST" banner with a
show/hide eye icon that reveals the hardcoded PIN in plaintext — explicitly
labeled as a test aid, not classroom-facing content.

This spec covers reconciling that mismatch. It does not touch `/host`,
`/pick-team`, `/play`, game logic, effects, or the Supabase schema — all of
which are already correct and already documented.

## Why this matters

- **It duplicates and desyncs PIN validation.** The real PIN lives in
  Supabase (`games.pin`, created fresh per game via `create_game('1986')` in
  `Host.jsx`). `Register.jsx` checks against its own hardcoded `'1986'`
  string instead. If a Host ever created a game with a different PIN (the
  `createGame` call accepts any string), `/` would silently reject the
  correct PIN or accept a stale one — a real correctness gap, not just
  cosmetic leftover code.
- **It exposes a "test" affordance in what would be the production
  classroom URL.** The eye-icon PIN reveal is explicitly commented as
  test-only, but nothing gates it out of a real deployment: whoever loads
  `/` sees a button that reveals the access PIN.
- **It adds an undocumented, unnecessary step.** `GAMEPLAY.md` and
  `supabase/SETUP.md`'s classroom instructions never mention visiting `/`
  first; a Host or player following the documented steps would type
  `/host` or `/pick-team` directly into the address bar and never see this
  gate at all, making it dead weight that only a stray visit to `/` would
  trigger.

## Product decision

Two-fold:

1. **`/` should not re-implement PIN/role gating that `/host` and
   `/pick-team` already do correctly and statefully (against Supabase, not
   a hardcoded string).** `/host` needs no PIN at all — it creates or
   resumes its own game. `/pick-team` already has its own PIN + team-code
   form backed by `findGameByPin`. Gating access to those pages a second
   time, with a different and unsynced mechanism, adds risk without adding
   security (the spec's existing product decision already states PIN/team
   code are classroom participation controls only, not security controls).
2. **`/` should become a simple, undocumented-step-free landing page** that
   explains the two roles in plain text and links to `/host` and
   `/pick-team` — no PIN input, no radio-button gate, no hidden test banner.
   This keeps a human-friendly root route (useful if someone bookmarks the
   site root) while removing the desynced validation and the test-only PIN
   reveal.

Out of scope: adding real authentication to `/host` or `/pick-team`. The
existing design's stance — PIN/team code are classroom controls, not
security controls — is unchanged; this spec only removes a redundant,
inconsistent gate in front of controls that already exist correctly one
level in.

## Target behavior

- `/` renders a static landing view: game title, one short paragraph
  explaining the flow (Host opens `/host` on the presentation screen; each
  team opens `/pick-team` on their own device), and two links/buttons —
  "Tôi là Người Điều Phối" → `/host`, "Tôi là Người Chơi" → `/pick-team`.
- No PIN input, no hardcoded PIN constant, no test banner anywhere in the
  shipped page.
- No new Supabase calls are introduced by this page — it is pure navigation,
  consistent with `/host` and `/pick-team` each owning their own real
  validation.
- Visual style (fonts, `doc-card` masthead treatment, colors) may be reused
  from the existing `Register.jsx` markup/CSS to avoid a jarring visual gap
  with the rest of the app, but the PIN/role-gate interaction is removed
  entirely, not just hidden.

## Acceptance checks

1. Visiting `/` shows no PIN input and no visible or revealable PIN value
   anywhere in the rendered page or its source.
2. Clicking the Host link navigates to `/host`; clicking the Player link
   navigates to `/pick-team`. Neither requires any prior input on `/`.
3. `grep`ing the shipped bundle for `HARDCODED_PIN` or the literal `1986`
   PIN check finds nothing outside of `Host.jsx`'s `createGame('1986', ...)`
   call (the one legitimate place a default PIN is defined) and
   `GAMEPLAY.md`'s documentation of that PIN.
4. `GAMEPLAY.md`'s setup steps remain accurate without needing a mention of
   `/` as a required step — it stays optional, informational navigation.
