# Forus — Agent Guide

A Nuxt 3 private couple's website. Two-person passphrase-gated app with Supabase backend.

## Quick start

```bash
npm install
# cp .env.example .env and fill: SUPABASE_URL, SUPABASE_KEY, NUXT_PASSPHRASE, NUXT_AUTH_SECRET
npm run dev     # http://localhost:3000
```

## Verification commands

```bash
npm run build        # nuxt build — only compile check available (no lint/typecheck scripts)
```

There are no test, lint, or typecheck scripts in `package.json`. The only way to verify is `nuxt build`.

## Auth & Security

- **No Supabase Auth used.** Custom passphrase flow: `POST /api/unlock` validates `NUXT_PASSPHRASE` server-side, issues an HMAC-SHA256 signed HttpOnly cookie (`forus_token`, 180 days).
- Route guard: `middleware/unlocked.ts` — blocks non-`/` pages on both SSR and client by calling `GET /api/status`. The guard uses `useRequestFetch()` on server (to forward cookies) and `$fetch` on client.
- Frontend Supabase client uses anon key directly with RLS allowing anonymous read/write. This trade-off enables realtime sync. See README for risk assessment.
- Cookie signing key: `NUXT_AUTH_SECRET` (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

## Architecture

- `data/site.ts` — all couple-specific static config (names, start date, birthdays, greeting). Edit this for customization.
- `composables/*.ts` — data logic per feature (notes, media, goals, likes, diary, etc.). Each uses `useSupabaseClient()` from `@nuxtjs/supabase`. Real-time subscriptions use unique channel names (`${table}-changes-${Math.random()...}`) per composable to avoid duplicate subscription errors.
- `middleware/unlocked.ts` — single route guard.
- `server/api/` — Nitro endpoints: `unlock.post`, `status.get`, `lock.post`, `cat.post`.
- `server/utils/token.ts` — HMAC-SHA256 token sign/verify (Node crypto, never imported in client code).
- `server/utils/cat-brain.ts` — DeepSeek AI persona config ("尚锦" cat persona + keyword triggers).
- `composables/usePushbacks.ts` + `pages/push.vue` + `components/PushWall.vue` — "又推又推" feature: records partner avoidant/push-away statements (text + optional note + time) in `public.pushbacks` table.
- `utils/date.ts` — celebration detection (anniversary, birthday-npy via `lunar-javascript` 农历, hundred-day milestones).
- `utils/image.ts` — client-side image compression (canvas JPEG, max 1920px, quality 0.85, skips GIF).

## Nuxt config quirks

- `runtimeConfig` holds: `passphrase`, `authSecret`, `deepseekKey` — read from `NUXT_*` env vars.
- `experimental.appManifest: false` — suppresses dev `#app-manifest` prerender warning.
- `supabase.redirect: false` — disables Supabase Auth auto-redirect.
- `telemetry: false`.

## Identity system

After unlocking, each device picks who they are (`'you'` or `'npy'`), stored in `localStorage` key `forus_identity`. Not a security credential — just a UI preference for whose perspective to use.

## Theme

Two themes: `star` (流星) and `sakura` (樱花). Stored in `localStorage` key `forus_theme`. Applied via `data-theme` attribute on `<html>`. CSS in `assets/css/main.css`.

## Cat AI (DeepSeek)

`POST /api/cat` — requires valid `forus_token` cookie. Sends system prompt (cat persona + dynamic context from Supabase) to DeepSeek API. Trigger rules in `cat-brain.ts` inject relevant DB data (notes, goals, likes) when keywords match the user message.

## Key conventions

- **No lint/typecheck/test setup.** Use `nuxt build` as the only verification.
- **import.meta.client** / **import.meta.server** guards used throughout for SSR-safe code.
- All composables use module-level singletons (`ref` outside `export function`).
- Image upload: compressed client-side via `<canvas>`, stored in Supabase Storage `media` bucket.
- SQL migrations in `supabase/` — run in order via Supabase SQL Editor.
