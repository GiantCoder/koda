# Koda Cricket — Frontend PRD
**Version:** 1.0.0  
**Last Updated:** 2024  
**Stack:** Vite + React 18 + TypeScript + Redux Toolkit + Redux-Saga + Tailwind CSS + shadcn/ui  
**Target Platforms:** Desktop web (MVP), Mobile web (Capacitor, phase 2)

---

## 1. Overview

Koda Cricket is a SaaS platform for cricket coaches, parents, and young players aged 7–18. The frontend delivers AI-powered video analysis results, a player progress timeline, coach collaboration tools, and a secure onboarding flow compliant with GDPR and COPPA. The UI must support light and dark modes, responsive layouts, and accessible design (WCAG 2.1 AA).

---

## 2. Design System

### 2.1 Colour Palette

| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `primary` | `#E63946` (Koda Red) | `#E63946` | CTAs, active nav, badges |
| `primary-hover` | `#C1121F` | `#C1121F` | Hover states |
| `background` | `#FAF7F2` (warm off-white) | `#0F1117` | Page background |
| `surface` | `#FFFFFF` | `#1A1D27` | Cards, panels |
| `surface-secondary` | `#F5F0E8` | `#252836` | Nested cards |
| `text-primary` | `#1A1A2E` | `#F0F0F0` | Body text |
| `text-secondary` | `#6B7280` | `#9CA3AF` | Subtext, labels |
| `success` | `#10B981` | `#34D399` | Grade A, active status |
| `warning` | `#F59E0B` | `#FBBF24` | Grade B/C, review needed |
| `danger` | `#EF4444` | `#F87171` | Errors, deletions |
| `cricket-green` | `#2D6A4F` | `#52B788` | Accents, spider chart fill |

### 2.2 Typography

- **Font:** Inter (primary), JetBrains Mono (code/scores)
- **Scale:** 12/14/16/18/20/24/30/36/48px
- **Heading weights:** 700 (h1–h2), 600 (h3–h4)
- **Body weight:** 400, line-height 1.6

### 2.3 Spacing & Layout

- Base unit: 4px
- Container max-width: 1280px
- Grid: 12-column, 24px gutter
- Border radius: 8px (cards), 6px (inputs), 4px (badges), 999px (pills)
- Shadow: `0 1px 3px rgba(0,0,0,0.1)` (cards), `0 4px 16px rgba(0,0,0,0.12)` (modals)

### 2.4 Component Library

Built on **shadcn/ui** with Tailwind CSS. Theme tokens exposed via CSS custom properties to support light/dark switching. Key components:

- `Button` (primary/secondary/ghost/destructive variants)
- `Card`, `CardHeader`, `CardContent`
- `Input`, `Select`, `Checkbox`, `RadioGroup`, `Switch`
- `Badge`, `Avatar`, `Progress`
- `Dialog`, `Sheet`, `Tooltip`, `Popover`
- `Tabs`, `Accordion`
- `NavigationMenu`
- `Stepper` (custom, for onboarding flow)
- `VideoPlayer` (custom, wraps native video + pose overlay)
- `GradeCard` (custom)
- `ShotTagStrip` (custom)

---

## 3. Application Architecture

```
src/
├── app/                    # Next.js App Router pages (if collocated) OR Vite entrypoint
├── components/
│   ├── ui/                 # shadcn primitives
│   ├── layout/             # Header, Footer, Sidebar, PageWrapper
│   ├── onboarding/         # Role, Age, Consent, Profile steps
│   ├── video/              # VideoUpload, VideoPlayer, PoseOverlay
│   ├── analysis/           # ShotGradeCard, CoachingTipsPanel, TagStrip, RadarChart
│   ├── dashboard/          # StatCard, SessionCard, ActivityFeed
│   ├── timeline/           # SessionTimeline, MilestoneShelf, TrendChart
│   ├── coach/              # PlayerRoster, RosterRow, AnnotationPanel
│   ├── messaging/          # ConversationList, MessageThread, SafeguardingBanner
│   ├── training/           # TrainingPlanCard, PlanFilters, PlanLibrary
│   └── common/             # LoadingSpinner, EmptyState, ErrorBoundary, ConfirmDialog
├── store/
│   ├── index.ts
│   ├── slices/
│   │   ├── authSlice.ts
│   │   ├── videoSlice.ts
│   │   ├── analysisSlice.ts
│   │   ├── messagingSlice.ts
│   │   └── uiSlice.ts
│   └── sagas/
│       ├── rootSaga.ts
│       ├── authSaga.ts
│       ├── videoSaga.ts
│       ├── analysisSaga.ts
│       └── messagingSaga.ts
├── hooks/                  # useAuth, useAnalysis, useVideoUpload, useRealtime
├── lib/                    # apiClient, constants, validators
├── types/                  # TypeScript interfaces
└── styles/                 # globals.css, theme tokens
```

---

## 4. Screens & User Stories

### 4.1 Public / Landing Page

**Screen:** `homepage.png`

**Description:** Marketing landing page with dark hero section (cricket background), "Welcome to Koda Cricket" heading, two feature cards (For Coaches / For Parents), a safeguarding trust section with stats (100% Parental Control, GDPR Compliant, 7–18 Age Range), and a CTA section.

**User Stories:**
- As a visitor, I can see what Koda Cricket does and who it's for within 5 seconds.
- As a visitor, I can click "Get Started" to begin registration.
- As a visitor, I can click "Sign In" in the top-right to log in.
- As a visitor, I can see proof of safety/GDPR compliance without navigating away.

**Acceptance Criteria:**
- Hero section renders with cricket ground background image (lazy-loaded).
- "Get Started" routes to `/register`.
- "Sign In" routes to `/login`.
- Fully responsive: stacked single column on mobile.
- Lighthouse performance score ≥ 90 on mobile.

---

### 4.2 Authentication

**Screen:** `welcome.png`

**Description:** Tabbed card with "Create Account" / "Sign In" tabs. Social SSO buttons (Apple, Google). Email, optional phone, password with strength indicators, confirm password. Terms & Privacy checkbox. Multi-account guide link for coaches/parents.

**User Stories:**
- As a new user, I can register with email/password or Apple/Google SSO.
- As a returning user, I can sign in with email/password or SSO.
- As a parent, I can see guidance on setting up multiple child accounts.
- As any user, I receive an inline password strength indicator.

**Acceptance Criteria:**
- Password rules: minimum 8 characters, 1 uppercase, 1 number — validated client-side with real-time feedback.
- Google and Apple OAuth flows trigger correct backend redirect URIs.
- "Create Account" button disabled until all required fields are valid and ToS checkbox is checked.
- On successful registration, user is redirected to `/onboarding/role`.
- On failed login, friendly error message shown inline (no full page reload).
- CSRF token included in all form submissions.

---

### 4.3 Onboarding Flow (4-step stepper)

**Screens:** `choose_role.png`, `age_verification.png`, `parental_consent.png`, `verify_consent.png`, `privacy.png`, `profile_completion.png`

**Description:** A 4-step stepper (Role → Verify → Consent → Profile) with warm off-white background, red step indicators, "Back" and "Next" navigation. Each step is a self-contained card.

#### Step 1 — Choose Your Role (`choose_role.png`)

Three role cards: Player, Parent, Coach. Each with icon, title, description. Selected card gets border highlight.

**User Stories:**
- As a new user, I can select one of three roles to determine my experience.

**Acceptance Criteria:**
- Only one role selectable at a time.
- "Next" disabled until a role is selected.
- Role stored in Redux state and submitted with registration payload.

#### Step 2 — Age Verification (`age_verification.png`)

Three dropdowns: Day, Month, Year. Privacy Protection info banner below.

**User Stories:**
- As a new user, I enter my date of birth so the system applies correct privacy settings.

**Acceptance Criteria:**
- Year dropdown shows current year down to 100 years ago.
- Users born less than 13 years ago are routed to parental consent sub-flow.
- Users 13–17 see a lighter consent step (GDPR teen consent).
- Users 18+ skip consent and proceed directly to privacy preferences.
- DOB is never stored in plain text in localStorage; only submitted server-side.

#### Step 2b — Parental Consent Required (`parental_consent.png`)

Guardian information form: Full Name, Email, Relationship dropdown, consent checkbox. Two alternative flows: "Send Consent Email" (async, shows verify screen) or "I'm the Parent/Guardian on This Device" (inline verification).

**Acceptance Criteria:**
- Guardian email must differ from the child's registration email.
- Consent checkbox must be checked before submitting.
- On "Send Verification Email": backend sends tokenised email, UI transitions to verify screen.
- On "Continue with Verification": parent completes identity confirmation inline (knowledge check or ID reference, not biometric).

#### Step 2c — Verify Consent Request (`verify_consent.png`)

Holding screen showing parent email with obfuscated domain. Resend / Change Email options. "Refresh Status" polling button. "Already Approved?" section.

**Acceptance Criteria:**
- "Refresh Status" polls `/api/consent/status` every 5 seconds when clicked (stops after 10 polls or approval).
- Approved state transitions user to Step 3.
- Resend triggers a new email with a 10-minute cooldown.

#### Step 3 — Data & Privacy (`privacy.png`)

Plain English summary (What we collect / Why / Who can see it). Granular consent toggles: Essential Data (locked on), Performance & Analytics (optional, default on), Marketing Updates (optional, default off), Coach-Parent Communication (role-dependent, default on). Links to Full Privacy Policy, GDPR Rights, Data Protection.

**Acceptance Criteria:**
- Essential Data toggle is disabled (always required).
- Consent preferences submitted to backend and stored per-user.
- "Accept & Continue" disabled until page has been scrolled past all toggle sections (anti-dark-pattern measure).

#### Step 4 — Complete Your Profile (`profile_completion.png`)

Profile photo (Take Photo / Choose from Library). Display name. Player Details: Primary Position dropdown, Batting Style, Bowling Style, Club/School. Privacy settings: Public / Coaches & Parents Only (default) / Private.

**Acceptance Criteria:**
- "Coaches & Parents Only" pre-selected for players.
- Photo upload via cropped image picker (aspect ratio 1:1, max 5MB, JPEG/PNG/WEBP).
- "Finish Setup" submits all onboarding data in a single atomic request.
- On success, user lands on their role-specific dashboard.

---

### 4.4 Coach Dashboard (Home)

**Screen:** `profile.png` (coach home dashboard)

**Description:** "Good morning, [Name]!" greeting. Two-column layout: Left column — Upcoming Sessions card (session cards with date, time, player count, Start Session / View Details CTA) + Squad List card. Right column — Quick Actions (Add New Drill, Manage Squad, View Analytics, Send Message) + Recent Activity feed + This Week stats.

**User Stories:**
- As a coach, I can see my upcoming sessions at a glance.
- As a coach, I can access quick actions without navigating away.
- As a coach, I can see recent squad activity.
- As a coach, I can see my weekly stats (sessions, attendance, drills, messages).

**Acceptance Criteria:**
- Sessions sorted by date ascending.
- "Start Session" only visible for sessions occurring today.
- "This Week" stats fetched fresh on dashboard mount.
- Activity feed limited to 5 items; "View All" links to activity log page.
- SSE/WebSocket connection established on mount for real-time updates.

---

### 4.5 Player/Coach Profile & Settings

**Screen:** `profile_settings.png`

**Description:** Left sidebar: avatar, name, role, join date, Quick Actions (Export My Data, Delete Account, Sign Out). Right content area: Personal Details (editable), Role & Team Management, Linked Child Accounts (with Add Child), Privacy & Consent Management (toggles), Notification Preferences (toggles), Help & Support cards.

**User Stories:**
- As a coach, I can edit my personal details.
- As a coach, I can see and manage my team roles.
- As a parent, I can link and manage child accounts.
- As any user, I can export my data (GDPR Article 20).
- As any user, I can delete my account (GDPR Article 17).
- As any user, I can manage consent and notification preferences.

**Acceptance Criteria:**
- "Export My Data" triggers a background job; user receives email with download link within 24 hours.
- "Delete Account" opens a confirmation dialog with a 14-day grace period notice.
- "Add Child" opens a modal with child email invite flow.
- Consent toggles persist server-side; changes take effect immediately.
- Notification toggles persist server-side.

---

### 4.6 Messages

**Screen:** `messages.png`

**Description:** Two-panel layout. Left: Conversations list with user avatars, role badges (Parent/Player/Coach), preview text, timestamps, unread count badges, All/Unread filter tabs. Right: Active conversation with chat bubbles, quick reply chips, message input with attachment icon, safeguarding footer ("Parent visibility: This conversation is visible to [parent name]"). Top: "Safe Messaging Environment" banner.

**User Stories:**
- As a coach, I can message parents and players.
- As a coach, I am reminded that messages with juniors are visible to their parents.
- As a parent, I can message my child's coach.
- As a user, I can use quick reply chips to respond faster.
- As a user, I can send file attachments.
- As a user, I can search messages.

**Acceptance Criteria:**
- "Safe Messaging Environment" banner always visible and non-dismissible.
- Conversations with players under 18 show "Parent visibility" footer in the thread.
- Direct messaging a player under 16 requires confirmed parental consent flag on their account.
- Messages delivered via WebSocket (real-time); fallback to polling every 15s.
- Quick reply chips limited to 4 per message.
- Attachment uploads max 25MB; images/PDFs/videos only.
- Message search uses debounced input (300ms) against `/api/messages/search`.
- All messages stored encrypted at rest.

---

### 4.7 Training Plans Library

**Screen:** `training_library.png`

**Description:** Header with title, "+ Create New Plan" CTA. Filter bar: Age Group, Skill Focus, Equipment, Duration dropdowns. Grid of training plan cards (3 columns desktop, 1 mobile). Each card: icon, title, age group, duration, player count range, equipment, skills focus, status badge (Active/Draft), assigned squads count, Assign/Preview CTA.

**User Stories:**
- As a coach, I can browse and filter training plans.
- As a coach, I can create a new training plan.
- As a coach, I can assign a plan to one or more squads.
- As a coach, I can preview a draft plan before publishing.

**Acceptance Criteria:**
- Filter combinations apply client-side (no refetch unless more than 50 plans loaded).
- "Create New Plan" opens a multi-step plan builder modal.
- "Assign" opens a squad selection popover.
- "Preview" opens a read-only plan detail sheet.
- Plan cards show skeleton loaders during fetch.
- Plans marked "Draft" have a muted/greyed style distinct from "Active".

---

### 4.8 Video Upload

**Screen:** `upload.png`

**Description:** Dark-mode focused screen. Left: large dashed drag-and-drop zone with cloud upload icon, "Drop your video here or click to browse", format chips (MP4, MOV, AVI, Max 500MB), "Choose File" and "Record Now" buttons. Right sidebar: Pre-Upload Checklist (checkboxes), Best Camera Angle guidance card (behind bowler's end stumps), Recent Uploads list.

**User Stories:**
- As a player/parent, I can upload a cricket batting video for analysis.
- As a user, I can see guidance on optimal camera placement before uploading.
- As a user, I can tick off a pre-upload checklist to improve analysis quality.
- As a user, I can see my recent uploads and their analysis status.
- As a mobile user (phase 2), I can record a video directly in-app.

**Acceptance Criteria:**
- Drag-and-drop using HTML5 File API; drag-over state shows border highlight + background tint.
- Accepted formats: MP4, MOV, AVI, HEVC, MKV. Rejected formats show inline error.
- Max file size: 500MB. File size shown after selection.
- Chunked upload using tus protocol (resumable-uploads.com); chunk size 5MB.
- Upload progress shown as percentage and animated progress bar.
- On upload complete, transition to Analysis Processing screen automatically.
- "Record Now" hidden on desktop; visible on mobile (Capacitor phase).
- Pre-upload checklist is advisory only (no validation blocking).
- Recent Uploads limited to 5; "View All" links to video library.

---

### 4.9 Analysis Processing Screen

**Description:** (Inferred from design system; no direct screenshot but referenced in upload flow.) Full-width status card showing pipeline stages:

1. ✅ Upload Complete  
2. ⏳ Extracting Frames  
3. ⏳ Pose Analysis (MediaPipe)  
4. ⏳ Shot Classification  
5. ⏳ Generating Coaching Feedback  

Animated spinner on active stage. Estimated time remaining. Cancel option.

**Acceptance Criteria:**
- Stage updates delivered via SSE from `/api/analysis/[id]/status`.
- If user navigates away, analysis continues in background; notification sent on completion.
- Cancel triggers cleanup of partial data and temporary files.
- Page auto-navigates to results on completion.

---

### 4.10 Shot Analysis Results

**Screen:** `shot_analysis.png`

**Description:** Dark mode screen. Top: video player with skeleton overlay toggle, shot classification badge ("Cover Drive — 87% confidence"), duration and resolution metadata. Right panel: Shot Quality card with grade (A), star rating (4/5), metric scores (Backlift 92, Weight Transfer 88, Head Position 76, Follow-Through 90, Timing 85), Overall Score 86.2. Below: AI Coaching Tips grid (5 cards). Auto-Generated Tags strip (colour-coded, flagged tags highlighted in amber). Technique Analysis spider/radar chart. Bottom CTAs: Analyse Another Shot / View Progress / Start Training Drill.

**User Stories:**
- As a player, I can watch my video with a skeleton pose overlay to see body position analysis.
- As a player, I can see my shot classified and scored.
- As a player, I can read AI-generated coaching tips specific to my shot.
- As a player, I can see auto-generated tags for my shot.
- As a player, I can view a radar chart of my technique dimensions.
- As a player, I can navigate directly to a relevant training drill.
- As a coach, I can view any assigned player's analysis results.
- As a coach, I can add timestamped annotations to the video.

**Acceptance Criteria:**
- Video player custom-built (HTML5 `<video>` + canvas overlay), not a third-party embed.
- Skeleton overlay rendered on canvas element positioned absolutely over video.
- Overlay toggle animates on/off (300ms fade).
- Shot classification badge uses confidence percentage from API response.
- Grade card: A (≥85), B+ (75–84), B (65–74), C+ (55–64), C (<55).
- Metric scores animate from 0 to value on page enter (600ms ease-out).
- Radar chart rendered with Recharts `RadarChart`; cricket-green fill, 0–100 scale.
- Tags colour-coded: green (strength), amber (area to improve), grey (neutral).
- "Start Training Drill" links to Training Library filtered by flagged weaknesses.
- Export button generates PDF report (server-side); Share button creates shareable link with expiry.
- Coach annotation panel slides in from right (Sheet component) on coach view.

---

### 4.11 Player Progress / Trends Dashboard

**Screen:** `trends.png`

**Description:** Dark mode. 4 stat cards at top (Total Sessions, Avg Grade, Best Shot, Achievements). Shot Quality Trend line chart (Recharts). Shot Distribution doughnut chart. Recent Sessions list (session card with grade, shots count, duration, performance label). Recent Achievements shelf (circular badge icons). Coach Comments feed.

**User Stories:**
- As a player, I can see my improvement over time on a chart.
- As a player, I can see which shot types I practise most.
- As a player, I can see achievements/milestones I've earned.
- As a player, I can read coach comments on my sessions.
- As a parent, I can view my child's progress dashboard.

**Acceptance Criteria:**
- Trend chart x-axis: dates of sessions. Y-axis: 0–10 grade scale.
- Chart period selectable: 1 week / 1 month / 3 months / All Time.
- Doughnut chart interactive: hover shows shot type, percentage, session count.
- Recent Sessions limited to 5; "View All" expands full list.
- Achievements unlocked server-side; badge shelf shows most recent 6.
- Coach Comments feed shows last 3; "View All" opens messaging panel.
- Stat cards show delta vs previous period with colour-coded arrows.

---

### 4.12 Team / Player Roster (Coach View)

**Screen:** `team.png`

**Description:** Dark mode. ECB Safeguarding Reminder dismissible amber banner at top. Summary stat cards (Total Players 24, Active Sessions 8, Avg Grade B+, Pending Reviews 3). Player Roster table: Player (avatar + name + position), Latest Grade badge, Last Session timestamp, Activity indicator, Status badge (In Progress / Review Needed / Excellent), Actions icons (video, message, edit).

**User Stories:**
- As a coach, I can see all my assigned players at a glance.
- As a coach, I can see which players need review.
- As a coach, I can filter players by squad or status.
- As a coach, I can click through to any player's full profile and analysis history.
- As a coach, I am shown the ECB safeguarding reminder.

**Acceptance Criteria:**
- ECB Safeguarding banner shown on first visit each session; dismissible with X but re-shown after 24 hours.
- Table sortable by Grade, Last Session, Activity.
- Status badge colours: In Progress (blue), Review Needed (amber), Excellent (green).
- Video icon opens player's latest analysis result.
- Message icon opens messaging panel pre-populated with that player's conversation.
- Edit icon opens player profile edit sheet.
- "All Players" dropdown filters by squad group.
- Search filters player list in real-time (client-side).

---

## 5. State Management

### 5.1 Redux Store Shape

```typescript
interface RootState {
  auth: {
    user: User | null;
    token: string | null;
    role: 'player' | 'parent' | 'coach' | 'admin' | null;
    consentStatus: 'pending' | 'approved' | 'not_required';
    isLoading: boolean;
    error: string | null;
  };
  onboarding: {
    step: 1 | 2 | 3 | 4;
    role: string | null;
    dob: string | null;
    needsParentalConsent: boolean;
    guardianEmail: string | null;
    consentVerified: boolean;
    privacyPreferences: PrivacyPreferences;
    profileData: Partial<PlayerProfile>;
  };
  video: {
    uploads: VideoUpload[];
    activeUpload: { id: string; progress: number; stage: AnalysisStage } | null;
    recentUploads: VideoMeta[];
  };
  analysis: {
    results: Record<string, AnalysisResult>;
    currentAnalysisId: string | null;
    isLoading: boolean;
  };
  messaging: {
    conversations: Conversation[];
    activeConversationId: string | null;
    messages: Record<string, Message[]>;
    unreadCounts: Record<string, number>;
  };
  ui: {
    theme: 'light' | 'dark';
    sidebarOpen: boolean;
    notifications: Notification[];
  };
}
```

### 5.2 Key Sagas

- `watchVideoUpload` — manages chunked tus upload, dispatches progress actions
- `watchAnalysisStatus` — SSE listener for analysis pipeline updates
- `watchMessaging` — WebSocket connection lifecycle
- `watchConsentPolling` — polls consent status for minors during onboarding
- `watchAuth` — handles token refresh, session expiry, SSO callbacks

---

## 6. Routing

```
/                          → LandingPage
/login                     → AuthPage (Sign In tab)
/register                  → AuthPage (Create Account tab)
/onboarding/role           → RoleStep
/onboarding/verify         → AgeVerificationStep
/onboarding/consent        → ConsentStep (parental) OR PrivacyStep (adult)
/onboarding/verify-consent → VerifyConsentStep
/onboarding/privacy        → PrivacyStep
/onboarding/profile        → ProfileStep
/dashboard                 → RoleDashboard (renders coach/player/parent variant)
/upload                    → VideoUploadPage
/analysis/:videoId         → AnalysisResultsPage
/analysis/:videoId/processing → AnalysisProcessingPage
/progress                  → PlayerProgressPage
/team                      → CoachRosterPage (coach only)
/training                  → TrainingLibraryPage
/messages                  → MessagingPage
/messages/:conversationId  → MessagingPage (pre-selected conversation)
/settings                  → ProfileSettingsPage
/admin                     → AdminPage (admin only)
```

All protected routes use an `AuthGuard` component that checks Redux auth state and redirects to `/login` if unauthenticated. Role-specific routes use a `RoleGuard` component.

---

## 7. Real-time & Async

- **Analysis Pipeline Progress:** Server-Sent Events (`EventSource`) on `/api/analysis/[id]/stream`
- **Messaging:** WebSocket via `socket.io-client` connecting to `/ws/messaging`
- **Notifications:** WebSocket on same connection, separate namespace `/ws/notifications`
- **Consent Polling:** Manual polling (5s interval, max 10 polls) using Redux-Saga `delay` + `call`

---

## 8. Accessibility

- All interactive elements have `aria-label` or `aria-labelledby`.
- Focus management on modal open/close (focus trap).
- Keyboard navigation through all forms and tables.
- Colour contrast ratios meet WCAG 2.1 AA (minimum 4.5:1 for normal text, 3:1 for large text).
- Skip navigation link at top of each page.
- Video player keyboard controls (space = play/pause, arrow keys = seek, M = mute).
- Screen reader announcements for async state changes (analysis progress, new messages).

---

## 9. Safeguarding UI Requirements

These are non-negotiable and must be implemented exactly as specified:

- **Messaging with minors:** Every conversation with a player under 18 must display "Parent visibility: This conversation is visible to [parent/guardian name]" in the message input footer. This cannot be hidden.
- **Safe Messaging Banner:** Non-dismissible banner in the Messages section header.
- **ECB Safeguarding Banner:** Amber banner on Coach Roster and any coach view of a minor's analysis. Re-shown every 24 hours.
- **Parental consent gate:** Any page/feature that would expose a minor's video or analysis data must check `consentVerified` before rendering. Unconsented routes redirect to a consent-pending holding page.
- **Age-appropriate language:** Coaching tip text tagged `ageGroup: 'junior' | 'senior'` — junior tips use simpler vocabulary, senior tips can include technical terminology. The API returns the appropriate variant based on the player's DOB.
- **No direct download links for minors' videos** without a logged audit trail.

---

## 10. Testing Strategy

### 10.1 Unit Tests (Vitest)
- All Redux slices and reducers
- All Redux-Saga generators
- All utility functions (validators, formatters, grade calculators)
- All custom hooks
- Target coverage: **≥ 80%**

### 10.2 Component Tests (React Testing Library + Vitest)
- All form components (validation, error states, submission)
- Auth guard behaviour
- Role-based conditional rendering
- Safeguarding banner presence
- Tag: coverage reported to **CodeCov**

### 10.3 Visual Regression (Chromatic)
- Storybook stories for all shadcn-extended components
- Stories for each onboarding step
- Stories for analysis results cards
- Stories for dark/light mode variants
- Run on every PR via GitHub Actions

### 10.4 E2E Tests (Playwright)
- Full onboarding flow (adult, junior with parental consent, coach)
- Video upload and analysis processing
- Messaging flow coach → parent
- Settings export data flow

---

## 11. Performance Targets

- Largest Contentful Paint (LCP): < 2.5s
- Cumulative Layout Shift (CLS): < 0.1
- First Input Delay (FID): < 100ms
- Bundle size: initial JS < 200KB gzipped
- Code splitting: route-level lazy loading for all pages
- Video player canvas overlay: ≥ 30fps render (requestAnimationFrame)
- Image assets: WebP format, served via CDN, lazy-loaded below fold

---

## 12. Dark/Light Mode

- Mode toggled via `ui.theme` in Redux store; persisted to localStorage.
- CSS custom properties updated on `<html>` element via class: `class="dark"`.
- shadcn/ui components use Tailwind `dark:` variants.
- System preference respected on first load (`prefers-color-scheme`).
- Toggle button in global header (sun/moon icon).
- All charts (Recharts, ApexCharts) receive theme-aware colour props from Redux.

---

## 13. MVP Scope (Phase 1)

The following screens are in scope for the Docker MVP:

| Screen | Status |
|---|---|
| Landing Page | ✅ MVP |
| Registration / Login | ✅ MVP |
| Onboarding (all steps) | ✅ MVP |
| Coach Dashboard | ✅ MVP |
| Video Upload | ✅ MVP |
| Analysis Processing | ✅ MVP |
| Analysis Results | ✅ MVP |
| Player Progress / Trends | ✅ MVP |
| Messaging | ✅ MVP |
| Profile & Settings | ✅ MVP |
| Training Library | ⬜ Phase 2 |
| Coach Roster | ✅ MVP |
| Admin Panel | ⬜ Phase 2 |
| Mobile (Capacitor) | ⬜ Phase 2 |
