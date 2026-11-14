# Forus — Agent Guide

A Nuxt 3 private couple's website. Two-person passphrase-gated app with a self-hosted Postgres + PostgREST backend (supabase-js compatible).

## Quick start

```bash
npm install
# cp .env.example .env and fill:
#   SUPABASE_URL=https://forus.los-theseus.site/db
#   SUPABASE_KEY=<forus_app JWT>  NUXT_PASSPHRASE, NUXT_AUTH_SECRET
#   SUPABASE_SERVICE_ROLE_KEY=<forus_service JWT> (server-only; letters / cat)
#   NUXT_SUPABASE_INTERNAL_URL (optional; http://forus-rest:3000 in Docker)
#   NUXT_UPLOADS_DIR (local dev: .data/uploads; production /data/uploads)
#   NUXT_CAT_* (optional, enables the cat AI)
npm run dev     # http://localhost:3000
```

## Verification commands

```bash
npm run build       # nuxt build
npm run typecheck   # nuxt typecheck (vue-tsc)
npm run test        # vitest run
npm run lint        # eslint .
```

All four should pass before finishing a change.

## Auth & Security

- **No Supabase Auth used.** Custom passphrase flow: `POST /api/unlock` validates `NUXT_PASSPHRASE` server-side, applies per-IP failure rate limiting, and issues an HMAC-SHA256 signed HttpOnly cookie (`forus_token`, 180 days).
- Route guard: `middleware/unlocked.ts` — blocks non-`/` pages on both SSR and client. It calls `GET /api/status` once per client session and caches the result in `usePassphrase()` state.
- `NUXT_AUTH_SECRET` signs the cookie; changing it revokes all existing devices. Changing only `NUXT_PASSPHRASE` does not.
- Browser DB access uses a signed JWT (`role=forus_app`) against local PostgREST. RLS is disabled locally; access is controlled by table GRANTs. `forus_app` has CRUD on the 12 public tables only.
- Sensitive data is server-side only:
  - `letters` and `cat_messages`: only `forus_service` (`BYPASSRLS`) can read/write; Nitro uses `SUPABASE_SERVICE_ROLE_KEY` (a local service JWT).
  - Uploads and deletes are local files: `POST /api/upload`, `POST /api/media/delete`; no Supabase Storage.

## Architecture

- `data/site.ts` — couple-specific static config (names, start date, birthdays, greeting).
- `composables/*.ts` — feature data logic.
  - Module-level singletons: `usePassphrase`, `useIdentity`, `useTheme`, `useToday`, `useCover`.
  - Feature composables create state per call and register `onMounted`/`onUnmounted`; call them only inside component `setup()`.
  - All client-side DB access goes through `useDb()` (a typed-`any` wrapper around `useSupabaseClient()` because no generated DB types exist). Letters and cat messages go through server APIs instead.
  - Cross-device sync uses `usePolling(fetchAll, 30000)`; every write calls `fetchAll()` locally. There are no Realtime channels.
- `middleware/unlocked.ts` — single route guard.
- `server/api/` — Nitro endpoints:
  - `unlock.post`, `status.get`, `lock.post`, `health.get`
  - `cat.post`, `cat-messages.get`
  - `letters/index.get|post`, `letters/[id].get|patch|delete`
  - `upload.post`, `media/delete.post`
  - `server/routes/uploads/[...path].get.ts` serves local uploads in dev; nginx serves `/uploads/` in production.
- `server/utils/` — `token.ts` (HMAC), `safe-compare.ts`, `rate-limit.ts`, `require-unlock.ts`, `supabase-admin.ts` (service JWT PostgREST client), `uploads-dir.ts`, `letters.ts`, `date.ts`, `cat-brain.ts`.
- `composables/useMediaUpload.ts` + `utils/storage.ts` — upload/delete local `/uploads` files; `usePolling.ts` replaces Realtime.
- `pages/push.vue` + `composables/usePushbacks.ts` — "又推又推" feature in `public.pushbacks`.
- `utils/date.ts` — celebration detection (anniversary, lunar birthday via `lunar-javascript`, hundred-day milestones). Day counts include the start day.
- `utils/image.ts` — client-side image compression (canvas JPEG, max 1920px, quality 0.85, skips GIF).
- `utils/time.ts` / `utils/errors.ts` — shared formatting and error toast helpers.

## Routes

Visible in `NavBar`: `/`, `/memo`, `/goals`, `/likes`, `/adore`, `/dislikes`, `/letters`.
Hidden but guarded: `/calendar`, `/push`.

## Nuxt config quirks

- `runtimeConfig` holds: `passphrase`, `authSecret`, `supabaseServiceKey`, `supabaseInternalUrl`, `uploadsDir`, `catApiBase`, `catApiKey`, `catModel`.
- `experimental.appManifest: false` — suppresses dev `#app-manifest` prerender warning.
- `supabase.redirect: false` — disables Supabase Auth auto-redirect.
- `supabase.types: false` — no generated DB types; see `useDb()`.
- `telemetry: false`.
- `@nuxt/eslint` is enabled; run `npx nuxt prepare` after changing modules so `.nuxt/eslint.config.mjs` exists.

## Identity system

After unlocking, each device picks who they are (`'you'` or `'npy'`), stored in `localStorage` key `forus_identity`. Not a security credential — just a UI preference for whose perspective to use.

## Theme

Two themes: `star` (流星) and `sakura` (樱花). Stored in `localStorage` key `forus_theme`, applied via `data-theme` on `<html>`. Semantic colors (`accent`, `accent-soft`, `positive`, `negative`, `warning`) are CSS variables mapped in `tailwind.config.ts`; prefer them over raw `sky-*` / `rose-*` / `emerald-*` classes.

## Cat AI

`POST /api/cat` — requires `forus_token`, limits messages to 500 chars, reads the last 10 messages from `cat_messages` server-side, assembles context (persona + keyword-triggered notes/goals/likes), calls the OpenAI-compatible endpoint with a 20s timeout, and persists both messages. The client only displays messages; `GET /api/cat-messages` returns the latest 100.

## Key conventions

- **Verification**: `build` + `typecheck` + `test` + `lint`.
- **import.meta.client** / **import.meta.server** guards used throughout for SSR-safe code.
- Don't import `server/utils/token.ts` or anything using the service JWT into client code.
- Image upload: compressed client-side, uploaded to local `/uploads` via `/api/upload`; deletes go through `/api/media/delete`.
- SQL migrations in `supabase/` are Supabase-style (anon policies, storage schema). The self-hosted DB uses local roles/JWTs + GRANTs; see `docs/database.md` and `docs/archive/261114/16-Supabase迁移自建数据库-开工方案.md`.
- Server deployment: `bash update.sh` runs L1–L5 checks (code / deps / build / process / health). Deploy metadata is written to `.data/deploy-info.json` and served by `GET /api/health`; see `docs/deployment.md`.
- Full docs live in `docs/`: features, architecture, database, security, deployment, known issues.
