# Koda Mobile

Expo/React Native rebuild of Koda's frontend. Talks to the **same** Next.js
backend as the web app in the parent `koda/` repo — nothing here runs its own
server. See `../claude/koda-mobile-roadmap.md` in the project docs for the
full phase-by-phase plan. Phase 0 (foundations), Phase 1 (auth + onboarding),
Phase 2 (dashboard + profile/settings), Phase 3 (video upload + processing),
Phase 4 (analysis results + progress/trends), and Phase 5 (messaging +
notifications) are all in.

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
- `(app)` is a tab bar (Dashboard / Upload / Messages / Progress / Profile /
  Settings as of Phase 5 — Messages is the newest tab) — the first bit of
  tab navigation in the app, previously just a bare Stack. Notifications
  deliberately did NOT get a tab (six felt like one too many) — it's a bell
  icon on the dashboard instead, badged with the real unread count.

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

**Testing Phase 3's upload flow**: the iOS Simulator and Android emulator
have no real camera, so "Record video" won't do anything useful there --
use "Choose existing" with a video already in the simulator's photo library
(drag one into the Simulator window to add it), or test recording on a
physical phone via Expo Go. Uploads go straight to the real backend and
kick off the real analysis pipeline (BullMQ + MediaPipe + the AI feedback
pipeline), so processing will actually take a couple of minutes end to end,
same as it does on web.

## Screens (Phase 3)

A fourth tab, Upload, plus a new stack screen at `analysis/[videoId]/processing`
(outside the tab bar -- reached by pushing onto it, not by tapping a tab,
same as web's equivalent URL shape).

- **Upload** records or picks a video (`expo-image-picker`), validates its
  extension/size client-side (mirrors `app/lib/video-validators.ts`'s
  limits), lets a coach or parent pick which player it's for
  (`GET /api/team/players` -- real, role-aware: squad members for a coach,
  linked children for a parent, just themselves for a player, so players
  skip this step entirely), uploads it for real to
  `POST /api/video/upload` with progress tracking, and shows a real recent-
  uploads list (`GET /api/videos`) below.
- **Processing** polls `GET /api/analysis/[videoId]/status` every 3 seconds
  (`src/lib/useAnalysisStatus.ts` -- polling-only; web also supports SSE via
  `EventSource`, which React Native doesn't have natively, and the roadmap
  already called for polling as the v1 approach here) and renders a stage
  timeline plus a simple video preview (`expo-video`, streaming the
  original upload back from `GET /api/videos/[id]/stream` with the
  access token as a header).

Deliberately narrower than web's equivalent pages, per the Phase 3 scoping
discussion:
- **Single video only** -- no bulk multi-select upload (web supports both).
  Backlog item once the single-video path is proven out.
- **No pre-upload shot-hint declaration** -- web has an optional modal where
  a batting upload can be tagged with which shots were played, to help the
  AI classifier. The backend already treats this as fully optional
  (`declaredShotCount`/`playerDeclaredShotHints` can be omitted entirely),
  so skipping it is a pure accuracy nice-to-have deferred, not a functional
  gap. Skipping it also meant mobile didn't need web's batting/bowling/other
  activity-type selector at all, since that selector's only two jobs on web
  were gating access to that modal and blocking "other" uploads -- neither
  applies here.
- **No skeleton/pose overlay on the processing preview** -- web draws a
  canvas overlay of MediaPipe pose data synced to video playback frames.
  That's meaningfully more work than a plain video player and belongs with
  Phase 4's fuller analysis-detail screen (frames, pose overlay, coaching
  tips, shot grade), not this phase's processing screen.
- **"Complete" shows a lightweight confirmation, not a results screen** --
  web routes to `/analysis/[videoId]` (the full detail page) once processing
  finishes. That page doesn't exist on mobile yet -- it's explicitly Phase 4
  scope -- so mobile's processing screen just confirms completion and links
  back to the dashboard instead. Revisit this once Phase 4 ships.

One thing to know about `POST /api/video/upload`: it needs multipart
`FormData` with upload-progress events, which `src/api/client.ts`'s
`apiFetch`/`authFetch` can't do (they always JSON-encode the body, and
`fetch()` has no upload-progress API at all). `src/api/videoUpload.ts` uses
`XMLHttpRequest` directly instead, mirroring how web's own upload page does
it -- same reason, not a mobile-specific workaround.

## Screens (Phase 4)

The analysis results screen (`analysis/[videoId]` -- a stack screen, reached
from the processing screen on completion or by tapping a completed video in
Upload -> Recent Uploads) and a fifth tab, Progress.

- **Analysis results** shows the same real, DB-backed data web's equivalent
  page does: overall grade/score and per-metric scores
  (`GET /api/analysis/video/[videoId]`), AI coaching tips, auto-generated
  tags, a "technique" breakdown (progress bars -- web's component is called
  `TechniqueRadarChart` but doesn't actually render a radar chart, so mobile's
  version is honestly named `TechniqueBars`), per-dimension detailed
  feedback with diagnosis/evidence/drill text when present, a frame-by-frame
  gallery (`GET /api/analysis/[id]/frames`, authenticated `<Image>` requests
  the same way video streaming already works), and coach comments
  (`GET`/`POST /api/analysis/[id]/annotations`, add-a-comment restricted to
  coaches same as the backend enforces). The video player draws a live,
  time-synced pose skeleton overlay (`react-native-svg`, driven by
  `expo-video`'s `timeUpdate` event) over real MediaPipe pose data from
  `GET /api/analysis/[id]/pose` -- ported from web's canvas-based
  `VideoSkeletonOverlay.tsx` (joint dots, bone lines, wrist velocity arrows).
- **Progress** shows a real grade trend line and shot-type breakdown pie
  chart (`react-native-gifted-charts`, the first charting library in the
  app) from `GET /api/progress/[userId]`, `/trend`, and `/shots`.
  Deliberately does **not** port web's `app/(dashboard)/progress/page.tsx`,
  which is almost entirely a `setTimeout()`-mocked static object (fake
  sessions, fake achievements, fake coach comments) that never calls a
  progress endpoint at all -- the real endpoints above already exist on the
  backend and just weren't wired up to web's UI. No achievements section:
  `GET /api/progress/[userId]/achievements` is an explicit stub with no
  `Achievement`/`UserAchievement` model anywhere in the Prisma schema.

Deliberately narrower than web's equivalent pages, per the Phase 4 scoping
discussion:
- **No tracked-subject bounding box or on/off layer toggles** on the pose
  overlay -- web draws an extra dashed "tracked subject" box and has
  checkboxes to hide video/skeleton/bbox independently. Mobile always shows
  the skeleton when pose data is available and skips the box; both are easy
  follow-ups, not core to the overlay itself.
- **No jump-to-timestamp from a coaching-feedback item or annotation to the
  video player** -- web can seek the `<video>` element from a clicked
  timestamp; mobile shows the same timestamps as plain text for now, since
  wiring a seek callback into `expo-video`'s player is straightforward but
  extra plumbing for a first pass.
- **No "reprocess as batting/bowling" buttons** -- real backend feature
  (`POST /api/analysis/[id]/reprocess`), but an edge-case misclassification
  fix that adds in-flight queue-state complexity; deferred, per the user's
  scoping decision.
- **`/api/analysis/[id]/report`** (PDF export) isn't wrapped at all -- it's
  an explicit backend MVP placeholder (`status: "placeholder"`, no PDF) with
  zero UI entry points anywhere on web either.
- **Progress is self-view only** -- web also has a real, separate coach
  view (a player-profile screen with a genuine multi-category grade trend,
  `GET /api/team/players/[id]/analysed-videos/trend`) that's a better model
  to extend Phase 3's role-aware assignee pattern into. Deferred to Phase 6
  (Team/Squads), per the user's scoping decision, rather than folded into
  this phase.

New dependencies this phase: `react-native-svg` (pose overlay drawing),
`react-native-gifted-charts` + its `expo-linear-gradient` peer (trend/shot
charts) -- versions pinned from `node_modules/expo/bundledNativeModules.json`
the same way Phase 3's camera/video packages were. `tailwind.config.js`
gained `success`/`warning` color tokens (mirroring web's
`var(--success)`/`var(--warning)`), which the analysis screens lean on
heavily for score coloring and didn't exist yet.

**A note on this phase's verification**: `npx tsc --noEmit` is clean, but
the usual `npx expo export -p web` bundle smoke test could not be completed
during this phase's build -- the sandboxed dev environment used to build
this repeatedly hit its own execution time limit and, separately, had an
intermittent connection hiccup to this machine partway through. Since
`react-native-svg` and `expo-linear-gradient` are both native modules being
added for the first time, please run `npx expo start` (or your usual
`expo run:ios`/`expo run:android` if you're on a custom dev client rather
than Expo Go) yourself before relying on this -- if you're on a custom dev
client you'll likely need a fresh native build to pick up the two new native
modules, not just a JS reload.

## Screens (Phase 5)

A new Messages tab (conversation list + a `messages/[conversationId]` stack
screen for the thread itself), and a Notifications screen (`notifications`,
also a root-level stack screen, reached via a bell icon on the dashboard).

- **Messages** lists real conversations (`GET /api/conversations`), sorted
  by most recent activity, with an unread indicator computed from the
  conversation's `lastReadAt` vs its last message. Tapping one opens the
  thread (`GET`/`POST /api/conversations/[id]/messages`, polled every 4s --
  the backend does `redis.publish` on every send, but nothing in the
  codebase subscribes to that channel anywhere, so there's no real SSE/
  WebSocket path to use; same "RN has no EventSource, poll instead"
  decision as Phase 3/4). Opening a thread marks it read
  (`PUT /api/conversations/[id]/read`).
- **Notifications** lists real notifications (`GET /api/notifications`),
  with mark-read (tap), mark-all-read, and delete, all hitting real,
  ownership-checked endpoints. Badged on the dashboard's bell icon with the
  real unread count.

**The single biggest finding this phase**: web's own Messages page
(`app/(dashboard)/messages/[[...conversationId]]/page.tsx`) is 100% mocked
— `setTimeout()` + hardcoded conversations, "New Message" has no click
handler, nothing is ever persisted — even though a full, real, working
backend already exists and was simply never wired up (same pattern as
Phase 4's Progress page). Mobile wires up the real thing directly.

**A safeguarding gap worth knowing about, not just a mobile quirk**: the
backend computes a `visibility`/`parentVisibility` flag on messages to
minors, and web's UI displays banners claiming *"All messages with junior
players are visible to their parents"* and *"Direct player messaging
requires parental consent."* Neither is true today -- the flag is metadata
only. `GuardianLink` (the real, active parent-child link model used
elsewhere in the app) is never consulted by the messaging code: a guardian
is never added as a participant, gets no access to anything, and there is
no consent gate stopping a coach from 1:1-messaging a minor player
directly. Per the user's explicit decision, mobile does **not** repeat
web's false claim -- the thread screen shows a neutral, accurate line
instead ("Only people in this conversation can see these messages," which
*is* true given the participant-only RBAC on `GET /api/conversations`).
The backend itself is intentionally unchanged this phase (beyond the small
addition below) -- this is a real gap worth the team's attention
independent of mobile, since it currently affects web too, just with no
real traffic yet since web's page is mocked. Full writeup in the roadmap
doc.

One small additive backend change: sending a message
(`POST /api/conversations/[id]/messages`) now also creates a real
`Notification` (type `NEW_MESSAGE`) for the other participant(s) --
previously this was a dead code path (the enum value existed, nothing ever
created one), so the real, working notifications list would have stayed
permanently silent for messaging. Purely additive, same spirit as earlier
phases' small backend additions.

Deliberately narrower than a "complete" messaging feature, per the user's
scoping decisions and a real backend gap found along the way:
- **"Start new conversation" is coach/admin-only.** The only real "who can
  I message" list the backend exposes is `GET /api/team/players` (a
  coach's squad, already wrapped as `getAssignablePlayers()` in Phase 3).
  There's no reciprocal endpoint for a player or parent to discover a
  contact (their coach), so they can view and reply to conversations a
  coach starts, but can't start one themselves yet. A real backend gap, not
  a design preference -- worth a small new endpoint later.
- **No message search UI**, though `GET /api/messages/search` is real and
  working -- deferred to keep this phase's scope focused on the core
  conversation + notifications flow.
- **No push notifications** -- in-app notifications list only, per the
  user's scoping decision. `expo-notifications` device registration and
  real backend triggers (most notably wiring `ANALYSIS_COMPLETE`, which
  also never fires today) are a separate, bigger effort for later.
- **No message attachments** -- `attachmentUrl`/`attachmentType` are real
  schema columns but nothing anywhere (web included) reads or writes them.

Also fixed this phase: the Phase 4 analysis results screen had no way back
to the previous screen at all (the root Stack runs with `headerShown: false`
app-wide, so there was no native back button, and the screen never added
its own). Added a shared `BackBar` component
(`src/components/ui/BackBar.tsx`) and used it on that screen plus the two
new Phase 5 stack screens (notifications, message thread).

## Screens (Phase 6)

A new Team tab (roster + a `team/squads` stack screen for full squad
management), and a `players/[playerId]` stack screen (per-player detail,
reached by tapping a roster row).

- **Team** shows the real roster (`GET /api/team/players`, already wrapped
  as `getAssignablePlayers()` since Phase 3 -- role-aware: coach/admin get
  their squads' players, parent gets linked children, player gets just
  themselves, which is why the tab is hidden entirely for PLAYER via
  `href: null` in `(app)/_layout.tsx`). Coach/admin get real management on
  top: **Add Player** (`POST /api/team/players`, optionally straight into a
  squad) and **Remove** per row (`DELETE /api/team/players/[id]` -- removes
  from the coach's squads or clears the parent's guardian link; never
  deletes the player's account). Tapping a row opens the new player detail
  screen.
- **Squads** (coach/admin only, pushed from Team's "Squads" button) is full
  CRUD against the real, working squad backend: create
  (`POST /api/squads`), edit name/age group/club/active state
  (`PUT /api/squads/[id]`), delete (`DELETE /api/squads/[id]`), and manage
  membership (`POST`/`DELETE /api/squads/[id]/members[/userId]`) from a
  squad's detail view, including an "Add Member" picker sourced from the
  same roster `getAssignablePlayers()` call, filtered to whoever isn't
  already in that squad.
- **Player detail** (`players/[playerId]`) shows the real player card for
  someone else's account (`GET /api/team/players/[id]/player-card` -- the
  same RBAC-checked endpoint/card component from Phase 2's Profile tab,
  reused as-is), a grade trend chart, and a paginated, category-filterable
  list of their analysed videos (`GET /api/team/players/[id]/analysed-videos`),
  each row linking straight into the existing Phase 4 analysis results
  screen. Coach/admin get a **Message** button that starts a real
  conversation (`POST /api/conversations`) and jumps into the thread.

One small additive backend change, the same shape as Phase 5's: a new
`GET /api/team/coach` endpoint, returning the caller's active coach(es)
(via `SquadMember` for a player, or `GuardianLink` → child → `SquadMember`
for a parent). This closes the gap Phase 5's README flagged --
"Start new conversation" was coach/admin-only because there was no
reciprocal "who is my coach" lookup for a player/parent. The Messages tab
now uses it: player/parent get a **New Message** button too, picking from
their coach(es) instead of a player roster.

**A second real backend gap found this phase, worth flagging rather than
quietly working around**: `GET /api/team/players` (the only "who is on my
team" list the backend exposes to a coach) is derived entirely from
`SquadMember` rows -- there is no `createdByCoachId` or equivalent on
`User`. That means a player created via `POST /api/team/players` **without**
a `squadId` disappears from the coach's view of their own team the moment
the create call returns: not in the Team tab roster, not in the Messages
"New Message" list, not in any squad's "Add Member" picker -- there is
currently no UI path back to them at all short of the coach happening to
remember the generated login email. Rather than silently shipping that
trap, the Add Player form now shows an explicit warning when no squad is
selected, so a coach who skips it knows the consequence at the moment they
make the choice. The real fix (tracking which coach created an unassigned
player, and/or a dedicated "unassigned players" list) is a backend change
outside this phase's scope -- noted in the roadmap doc for whoever owns
that area.

Deliberately narrower than "complete" team management, per the user's
Phase 6 scoping decisions:
- **No Clubs screen.** The `Club` model and its endpoints exist and are
  real, but nothing in this phase's roster/squad/player-detail flows
  actually needs it (squads carry a free-text `clubName`, not a `Club`
  relation) -- deferred to Phase 7 rather than bolted on here.
- **No "Avg Rating" stat.** `GET /api/squads` returns a `rating` per member
  that is a deterministic hash of the user's id -- not derived from any
  real grade, analysis, or performance data. Per the user's decision it's
  skipped entirely rather than ported as if real, and not replaced with a
  different metric either (there isn't a real per-squad aggregate worth
  showing yet).
- **Single aggregate grade-trend line**, not web's per-category breakdown
  chart -- reuses Phase 4's `TrendLineChart` component as-is rather than
  building a second charting component for one screen.

## Screens (Phase 7)

The stretch surface area from the roadmap: Leagues, Gamification
("Achievements"), Collections ("Saved"), Player Card customization, Shadow
Batting, Explore, and a minimal Clubs view. Unlike every prior phase, most
of this area turned out to be **genuinely real end-to-end already** --
Phase 7's research was less "find the mock" and more "find out what's
real, what's missing entirely, and what doesn't actually fit on a phone."
None of these are tabs: they're reached from a new "More" section of quick
links on the Dashboard (same root-level-stack-screen pattern as
Notifications and Squads) -- a 7th+ tab wasn't worth it.

- **Leagues** (`leagues`, `leagues/[leagueId]`, `leagues/global`) is fully
  real: points are genuinely awarded to every league you belong to on each
  completed analysis, ranks are recalculated on a cron, and any
  authenticated user (not just coaches) can create a custom league and get
  a join code to share. The "Koda Global" age-group leaderboard is
  real but **browse-only** on mobile -- the system league does have a
  join code, but nothing in the backend ever surfaces it to a user, and
  completing an analysis only awards points to leagues you're *already* a
  member of, so there's no real, discoverable way to actually join Global.
- **Achievements** (`achievements`) surfaces `GET /api/gamification/
  {summary,badges,points/history}` -- a fully real, tested, Prisma-backed
  points-and-badges system where **no page anywhere in the web app calls
  any of these three endpoints**. Points and badges have been silently
  accumulating for every user with nothing to show them; mobile is the
  first client to actually display this. Badge art is rendered as a
  rarity-tier emoji rather than web's `iconKey` slugs (e.g.
  `badge-first-touch`) -- those slugs have no matching art asset in either
  codebase, just a naming convention, so a real icon set needs designing
  regardless of platform.
- **Saved** (`saved`, `saved/[id]`) is web's "Saved" nav item, confirmed to
  literally *be* the Collections backend (not a separate bookmarking
  layer) -- full CRUD, clip management, and sharing, all real. A "Save to
  Collection" button was added to the Phase 4 analysis results screen
  (the natural point where a `videoId` is already in hand) so clips can
  actually get into a collection from somewhere. Since the backend has no
  generic "search all users" endpoint, the share picker is scoped to
  whoever a role already has a real contact list for: coach/admin share
  with their roster, everyone else shares with their coach (reusing Phase
  6's `getMyCoaches()`).
- **Player Card editor** (`player-card/edit`, linked from Profile)
  resolves the customization Phase 2 explicitly deferred: real display
  name/tier/role/icon/stats editing and a real profile-photo upload, both
  against genuine, working endpoints (`PUT /api/player-card`,
  `POST /api/player-card/upload-image`). **Not wrapped**: AI-generated
  backgrounds (`POST /api/player-card/generate-background`). It's real on
  the backend (a genuine Claude call), but returns a raw CSS `background`
  shorthand string -- arbitrary layered gradients meant for a web `<div>`'s
  style -- and React Native has no CSS background-shorthand support at
  all. Reliably parsing arbitrary AI-generated gradient CSS into
  `expo-linear-gradient` props isn't a small additive change, so mobile
  offers DEFAULT and UPLOAD (photo) background modes only; AI backgrounds
  stay web-only until there's a real native rendering path.
- **Shadow Batting** (`shadow-batting`) is the one genuinely new native
  capability this phase needed. Web records via `getUserMedia` +
  `MediaRecorder` with a prep-countdown then duration-countdown overlay;
  mobile's equivalent adds `expo-camera` (a new dependency -- the app's
  first camera-preview/recording library, distinct from
  `expo-image-picker`'s pick-or-capture-then-hand-off flow) and reproduces
  the same two-stage countdown UX with a live front-camera preview.
  Uploads go through `POST /api/shadow-batting/upload`, which deliberately
  reuses the **exact same** `Video`/`Analysis`/BullMQ pipeline as a normal
  upload -- so once queued, the existing Phase 3/4 processing and results
  screens handle it with zero changes.
- **Explore** (`explore`, `explore/[id]`) was built per the user's explicit
  decision to match web's current behavior rather than withhold it -- see
  the safety flag below. No thumbnails are shown anywhere: `thumbnail`
  URLs point at `/api/videos/[id]/thumbnail`, which doesn't exist as a
  route anywhere in this codebase, web included (a pre-existing dead
  reference). Tapping into a clip only shows a real video player when
  you're the uploader; `/api/videos/[id]/stream` enforces owner-only
  access in production, so every other clip renders as coaching-detail
  metadata with a plain explanation instead of a broken video player.
- **Clubs** (`clubs`) is deliberately minimal, per the user's decision plus
  a real constraint found afterward: `GET /api/clubs` is coach/admin-only
  with no equivalent for players or parents at all (a player's club is
  only ever inferred by matching free-text names, never exposed to the
  player themselves) -- so this screen only does anything for coach/admin,
  and says so plainly for everyone else rather than showing an empty
  screen. It's also read-only aggregate counts, not a member list: the
  real endpoint only returns seniors/juniors/playersCoached/
  sessionsThisMonth per club, not an actual roster. `stats.averageRating`
  (the same fabricated per-player-id hash already skipped on Phase 6's
  Squads screen) is dropped here too.

**A real safeguarding-relevant gap, found and handled the same way as
Phase 5's messaging gap**: Explore's two backend routes have no auth check
at all -- neither calls `getAuthUser`. The `Video` model has no
visibility/consent field whatsoever, so the moment any user's uploaded
video finishes analysis, its metadata (filename, grade, shot type,
uploader's real name, and on the detail route, the full coaching-tips
text) becomes publicly readable by anyone, logged in or not. Given this
product's users include junior cricketers, that's a real, unconsented
data exposure, not just a UX gap. Presented this to the user explicitly
before building; their decision (this time **not** matching the
"Recommended, don't extend it" option): **build Explore on mobile matching
web's current behavior as-is**. Two things soften the actual blast radius
in practice -- `/api/videos/[id]/stream` genuinely enforces owner-only
access in production (so exposed metadata can't be turned into exposed
video playback for anyone but the uploader), and the referenced
thumbnails are dead links everywhere already -- but the metadata leak
itself is real and unchanged by mobile shipping this. **Flagged for the
team, independent of mobile**, same as the Phase 5 gap: this needs either
a real auth check plus a visibility/consent field, or an explicit product
decision that Explore is meant to be fully public.

**A second real backend gap found this phase**: `GET /api/team/players`
being `SquadMember`-derived (see Phase 6) means a coach's roster and the
Clubs `GET /api/clubs` endpoint's player counts can silently diverge from
reality in the same way -- not a new issue, just the same shape recurring.
No action taken here; noted for whoever picks up that earlier flag.

Also added this phase: `expo-camera` as a new dependency (Shadow
Batting's live preview + recording), with matching
`NSCameraUsageDescription`/`NSMicrophoneUsageDescription` reuse on iOS and
a new Android permission plugin entry in `app.json`.

Verification note: unlike every prior phase, `npx expo export -p web`
**completed successfully** this time (no sandbox timeout), bundling all
15 new Phase 7 routes cleanly alongside the existing app --
`npx tsc --noEmit` is also clean.
