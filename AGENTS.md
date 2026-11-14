# Forus — Agent Guide

A Nuxt 3 private couple's website. Two-person passphrase-gated app with Supabase backend.

## Quick start

```bash
npm install
# cp .env.example .env and fill:
#   SUPABASE_URL, SUPABASE_KEY, NUXT_PASSPHRASE, NUXT_AUTH_SECRET
#   SUPABASE_SERVICE_ROLE_KEY (server-only; required by letters / cat / storage delete)
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
- Most tables still use the anon key directly with permissive RLS to preserve realtime sync. See `docs/security.md` for the accepted risk.
- Sensitive data is server-side only:
  - `letters` and `cat_messages` have no anon policies; Nitro uses `SUPABASE_SERVICE_ROLE_KEY`.
  - Storage deletions go through `POST /api/media/delete`; anon can upload and read the public `media` bucket, but cannot delete or overwrite.

## Architecture

- `data/site.ts` — couple-specific static config (names, start date, birthdays, greeting).
- `composables/*.ts` — feature data logic.
  - Module-level singletons: `usePassphrase`, `useIdentity`, `useTheme`, `useToday`, `useCover`.
  - Feature composables create state per call and register `onMounted`/`onUnmounted`; call them only inside component `setup()`.
  - All client-side DB access goes through `useDb()` (a typed-`any` wrapper around `useSupabaseClient()` because no generated DB types exist). Letters and cat messages go through server APIs instead.
  - Realtime subscriptions use unique channel names (`${table}-changes-${Math.random()...}`).
- `middleware/unlocked.ts` — single route guard.
- `server/api/` — Nitro endpoints:
  - `unlock.post`, `status.get`, `lock.post`, `health.get`
  - `cat.post`, `cat-messages.get`
  - `letters/index.get|post`, `letters/[id].get|patch|delete`
  - `media/delete.post`
- `server/utils/` — `token.ts` (HMAC), `safe-compare.ts`, `rate-limit.ts`, `require-unlock.ts`, `supabase-admin.ts` (service_role REST), `letters.ts`, `date.ts`, `cat-brain.ts`.
- `composables/useMediaUpload.ts` + `utils/storage.ts` — upload/delete Storage files without creating a `media` subscription.
- `pages/push.vue` + `composables/usePushbacks.ts` — "又推又推" feature in `public.pushbacks`.
- `utils/date.ts` — celebration detection (anniversary, lunar birthday via `lunar-javascript`, hundred-day milestones). Day counts include the start day.
- `utils/image.ts` — client-side image compression (canvas JPEG, max 1920px, quality 0.85, skips GIF).
- `utils/time.ts` / `utils/errors.ts` — shared formatting and error toast helpers.

## Routes

Visible in `NavBar`: `/`, `/memo`, `/goals`, `/likes`, `/adore`, `/dislikes`, `/letters`.
Hidden but guarded: `/calendar`, `/push`.

## Nuxt config quirks

- `runtimeConfig` holds: `passphrase`, `authSecret`, `supabaseServiceKey`, `catApiBase`, `catApiKey`, `catModel`.
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
- Don't import `server/utils/token.ts` or anything using service_role into client code.
- Image upload: compressed client-side, uploaded to Storage `media`; deletes go through the server endpoint.
- SQL migrations in `supabase/` — run in order via Supabase SQL Editor. Scripts are idempotent; one-time data migrations are tracked in `public.schema_migrations`.
- Server deployment: `bash update.sh` runs L1–L5 checks (code / deps / build / process / health). Deploy metadata is written to `.data/deploy-info.json` and served by `GET /api/health`; see `docs/deployment.md`.
- Full docs live in `docs/`: features, architecture, database, security, deployment, known issues.
