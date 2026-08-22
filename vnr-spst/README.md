# Hành Trình Đổi Mới — multi-device classroom game

A one-Host, seven-team classroom quiz game. Every device (the Host's screen and each
team's device) syncs through Supabase — see `docs/superpowers/specs/2026-08-20-multi-device-game-design.md`
for the design and `GAMEPLAY.md` for how a round plays out.

## Run it

1. Configure `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` and apply `supabase/schema.sql`
   (see `supabase/SETUP.md`).
2. `npm install && npm run dev`, then deploy or share one running instance to every device.
3. Host opens `/host` — a game (PIN `1986`) is created or resumed automatically.
4. Host shares the PIN and each team's classroom code; each representative opens
   `/pick-team` on their own device to join, then is routed to `/play`.
5. Host begins once devices show as joined, opening cards from the `/host` board.

## Deploy (Vercel)

This is a client-only Vite SPA (react-router) backed by Supabase — no server code, so it's a
static-site deploy.

1. Import the GitHub repo into Vercel and set **Root Directory** to `vnr-spst` (this app lives in
   a subfolder of the repo).
2. Vercel auto-detects the Vite framework from `vnr-spst/vercel.json`; build command
   `npm run build`, output directory `dist`.
3. Add the two env vars from `.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) under
   Project Settings → Environment Variables, for Production and Preview alike.
4. `vercel.json` rewrites every path to `/index.html` so client-side routes (`/host`,
   `/pick-team`, `/play`) work on hard refresh / deep link, since routing is handled by
   react-router in the browser, not by the server.
5. Every push to `main` and every PR gets its own Vercel deployment automatically via the Git
   integration — no separate deploy workflow is needed. `.github/workflows/ci.yml` runs lint +
   build on PRs targeting `vnr-spst/**` as a merge gate, independent of Vercel's own build.

---

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
