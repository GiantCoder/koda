# Koda Mobile

Expo/React Native rebuild of Koda's frontend. Talks to the **same** Next.js
backend as the web app in the parent `koda/` repo — nothing here runs its own
server. See `../claude/koda-mobile-roadmap.md` in the project docs for the
full phase-by-phase plan. Phase 0 (foundations), Phase 1 (auth + onboarding),
and Phase 2 (dashboard + profile/settings) are all in.

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
- `(app)` is a tab bar (Dashboard / Profile / Settings) as of Phase 2 — the
  first bit of tab navigation in the app, previously just a bare Stack.

## Screens (Phase 1)

`(auth)/welcome` -> `role` -> `register` (real backend call, not a mock) ->
either `(onboarding)/consent` (if under 18) or straight to `(onboarding)/privacy`
-> `(onboarding)/profile` -> `(app)` tab bar. `(auth)/login` is the alternate
entry for returning users.

**Important divergence from the web app**: `app/onboarding/{role,verify,consent,
verify-consent,privacy,profile}/page.tsx` on web are UI-only mocks -- none of
them call the backend, and `register/page.tsx` hardcodes `role: "COACH"`
regardless of what's picked. Mobile's onboarding screens call the real
endpoints instead (`/api/auth/register` with the actual role + date of birth,
`/api/onboarding/consent/{request,status,resend}`, `PUT /api/onboarding/privacy`,
`PUT /api/onboarding/profile`) -- real guardian-consent gating, no faked
approval. Worth backporting this fix to the web app at some point rather than
leaving two different onboarding behaviors across clients.

One known simplification, flagged in code comments where it matters: there's
no server-side "onboarding complete" field (web doesn't have one either --
it fakes this with a `localStorage` flag). Mobile does the same via
`src/lib/onboardingStore.ts` (SecureStore-backed), which only tracks
done/not-done, not *which* step was last finished. A user who force-quits
mid-onboarding resumes at the consent screen, which self-redirects onward
to privacy if consent isn't (or is no longer) required.

## Screens (Phase 2)

`(app)/dashboard`, `(app)/profile`, `(app)/settings` -- a real tab bar
replacing Phase 0's single placeholder screen.

The web app's equivalent screens turned out to be a much bigger mix of real
and mocked functionality than onboarding was, so each got its own call on
whether to build it for real, mirror the mock, or leave it for later
(see the Phase 2 scoping discussion for the full reasoning):

- **Dashboard** calls the real `GET /api/dashboard/summary` and shows honest
  empty-state copy for its all-zero stats, rather than the web dashboard's
  entirely hardcoded sessions/squads/activity feed (which never calls that
  endpoint at all). Will fill in on its own once Phase 3+ lands real
  video/analysis data -- no rework needed here.
- **Profile** has a real, editable personal-details form (`GET`/`PUT
  /api/users/me` -- the same endpoint the web Profile page uses, distinct
  from onboarding's `/api/onboarding/profile`), the real player card
  (`GET /api/player-card`, rendered with a simpler compact component since
  there's no native equivalent of web's custom card art), and a cosmetic
  avatar picker (`GET /api/avatars` for the real preset gallery; the choice
  itself is stored locally in `src/lib/avatarStore.ts`, matching the web
  app's fidelity, because `PUT /api/users/me/avatar` is an explicit backend
  placeholder that doesn't persist anything server-side yet).
- **Settings** deliberately covers less than the web app's combined Profile
  & Settings page, which mixes real features in with a lot of pure UI mock:
  a hardcoded "Head Coach at Riverside CC" team card, a hardcoded linked
  child, notification toggles with no backend at all, and a dev-only role
  switcher. None of that shipped here. What did: account info, Privacy &
  Consent (backed by a real `GET`, added specifically for this screen --
  see below), the coach-only Play-Cricket/ECB integration (already fully
  real on the backend), and sign out.
- Not built (tracked as backlog, not oversights): web's "Export My Data" /
  "Delete Account" buttons have no `onClick` at all, and the one real
  endpoint behind "export" (`POST /api/users/me/export`) is an explicit MVP
  placeholder that doesn't queue anything -- not worth UI yet.

## Backend changes that shipped alongside this

Mobile has no cookie jar, so `app/api/auth/{login,register,refresh,logout}/route.ts`
(one level up, in the main Next.js app) were extended to also accept/return
the refresh token via the request/response body when the client sends
`x-koda-client: mobile` -- the web flow (cookie-only) is unchanged.

`app/api/onboarding/privacy/route.ts` gained a `GET` handler (Phase 2). It
previously only had `PUT` because the web app's privacy toggles are local
state that's never read back -- fine for a screen you only see once during
onboarding, not fine for a Settings screen you might reopen without having
just set your preferences, where defaulting to Koda's baseline values every
time risks silently reverting a real choice. `GET` returns the saved
`PrivacyPreferences` row, or the same defaults the schema/PUT already use if
the user has never saved one. Purely additive; the existing `PUT` is
unchanged.

Everything else mobile calls (`/api/users/me`, `/api/player-card`,
`/api/avatars`, `/api/dashboard/summary`, `/api/coach/ecb-api-key*`) needed
no backend changes: `getAuthUser()` already accepted
`Authorization: Bearer <token>` on every protected route.

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
