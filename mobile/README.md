# Koda Mobile

Expo/React Native rebuild of Koda's frontend. Talks to the **same** Next.js
backend as the web app in the parent `koda/` repo — nothing here runs its own
server. See `../claude/koda-mobile-roadmap.md` in the project docs for the
full phase-by-phase plan. Phase 0 (foundations) and Phase 1 (auth +
onboarding) are both in.

## What's here

- Expo SDK 57, Expo Router (file-based nav, screens live in `src/app`),
  React 19 / React Native 0.86, TypeScript.
- NativeWind (Tailwind classes on native components) — `tailwind.config.js`,
  `src/global.css`.
- Redux Toolkit (`src/store/`) for app state (`authSlice`: session +
  onboarding status).
- A typed API client (`src/api/client.ts`) that attaches the access token to
  every request and silently refreshes it once on a 401.
- `expo-secure-store`-backed refresh token persistence (`src/api/tokenStore.ts`)
  — the native equivalent of the web app's httpOnly cookie.
- A hand-rolled UI kit (`src/components/ui/`: Button, Card, Input,
  ConfirmDialog, Checkbox, OptionPicker) mirroring `app/components/ui/*` on
  the web side (OptionPicker and Checkbox don't have web equivalents by that
  name — they stand in for a plain HTML `<select>`/checkbox, which have no
  native counterpart without a native picker dependency).
- `src/app/index.tsx` is a gatekeeper screen: redirects to `(auth)`,
  `(onboarding)`, or `(app)` based on Redux auth/onboarding state. Every
  other screen assumes it arrived through that redirect.

## Screens (Phase 1)

`(auth)/welcome` -> `role` -> `register` (real backend call, not a mock) ->
either `(onboarding)/consent` (if under 18) or straight to `(onboarding)/privacy`
-> `(onboarding)/profile` -> `(app)/dashboard` (still the Phase 0 placeholder;
Phase 2 replaces it). `(auth)/login` is the alternate entry for returning
users.

**Important divergence from the web app**: `app/onboarding/{role,verify,consent,
verify-consent,privacy,profile}/page.tsx` on web are UI-only mocks -- none of
them call the backend, and `register/page.tsx` hardcodes `role: "COACH"`
regardless of what's picked. Mobile's onboarding screens call the real
endpoints instead (`/api/auth/register` with the actual role + date of birth,
`/api/onboarding/consent/{request,status,resend}`, `PUT /api/onboarding/privacy`,
`PUT /api/onboarding/profile`) -- real guardian-consent gating, no faked
approval. Worth backporting this fix to the web app at some point rather than
leaving two different onboarding behaviors across clients.

Two known simplifications, both flagged in code comments where they matter:
- There's no server-side "onboarding complete" field (web doesn't have one
  either -- it fakes this with a `localStorage` flag). Mobile does the same
  via `src/lib/onboardingStore.ts` (SecureStore-backed), which only tracks
  done/not-done, not *which* step was last finished. A user who force-quits
  mid-onboarding resumes at the consent screen, which self-redirects onward
  to privacy if consent isn't (or is no longer) required.
- No avatar picker in the Profile screen yet (web's version reads from
  `/api/avatars`) -- small enough to pick up as its own follow-up.

## Backend changes that shipped alongside this

Mobile has no cookie jar, so `app/api/auth/{login,register,refresh,logout}/route.ts`
(one level up, in the main Next.js app) were extended to also accept/return
the refresh token via the request/response body when the client sends
`x-koda-client: mobile` -- the web flow (cookie-only) is unchanged. Everything
else mobile calls (`/api/users/me`, `/api/onboarding/**`) needed no changes:
`getAuthUser()` already accepted `Authorization: Bearer <token>`.

## Running it

From the repo root, get the backend running first (mobile is useless without
it): `make up` (docker compose — brings up the `app` service on :3050 plus
Redis, MariaDB, MinIO, etc. together; `make status` to check what's running).

Then, from `mobile/`:

```
npm install        # already run once for you — only needed again if package.json changes
npx expo start
```

That prints a QR code and a menu. Press `i` for the iOS Simulator, `a` for
the Android emulator, or scan the QR code with the **Expo Go** app on your
phone.

**Before that works, check `.env`** — `EXPO_PUBLIC_API_URL` needs to be
`http://localhost:3050` for a simulator (both proxy localhost back to your
Mac), but your Mac's LAN IP (e.g. `http://192.168.0.6:3050` — find it with
`ipconfig getifaddr en0`, or read it off the `exp://` address Metro prints
on startup) for a physical phone in Expo Go, since `localhost` there means
the phone itself. Whichever you're using, after changing `.env` you need a
full restart (`npx expo start -c` to clear the bundler cache) — `EXPO_PUBLIC_`
env vars are baked into the JS bundle at build time, not read live, so a
hot reload won't pick up the change.

No camera/video work yet (that's Phase 3), so the iOS Simulator's lack of a
real camera doesn't matter for what's here — Expo Go on your phone or either
simulator all work fine for this phase.
