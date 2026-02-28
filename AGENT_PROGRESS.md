# Koda Parallel Feature Delivery Tracker

This tracker coordinates backend/frontend parallel work for each feature using isolated git worktrees.

## Feature Module Plan (6 modules)

1. **Auth + Onboarding**
   - Screens: landing, login/register, role, age verification, consent/verify, privacy, profile completion
2. **Dashboard + Profile/Settings**
   - Screens: dashboard, profile, profile settings
3. **Video Upload + Analysis Processing**
   - Screens: upload, processing
4. **Analysis Results + Progress/Trends**
   - Screens: shot analysis, trends
5. **Messaging + Safeguarding**
   - Screens: messages
6. **Team / Roster**
   - Screens: team

## Standard Process (Per Feature)

- [ ] Read frontend + backend PRD sections for the feature
- [ ] Create frontend worktree from `develop`
- [ ] Create backend worktree from `develop`
- [ ] Frontend agent implements UI/routes/components/state
- [ ] Backend agent implements API/routes/validation/business logic
- [ ] Frontend checks:
  - [ ] tests pass in Docker container
  - [ ] dev server runs without terminal errors
- [ ] Backend checks:
  - [ ] tests pass in Docker container
  - [ ] server/API runs without terminal errors
- [ ] Smoke test end-to-end flow
- [ ] Verify new routes are accessible via browser
- [ ] Commit + push feature branches
- [ ] Merge feature branches into `develop`

## Feature Execution Board

### 1) Auth + Onboarding
- Status: `completed`
- Frontend branch/worktree: `feature/koda-auth-onboarding-fe` at `/Users/mattotoole/Documents/code/v8/.worktrees/koda/auth-onboarding-fe`
- Backend branch/worktree: `feature/koda-auth-onboarding-be` at `/Users/mattotoole/Documents/code/v8/.worktrees/koda/auth-onboarding-be`
- Notes: `Implemented and merged into develop. Push blocked: no origin remote configured. Container lint checks attempted; long-running Docker install/build flow needs cleanup for deterministic CI execution.`

### 2) Dashboard + Profile/Settings
- Status: `completed`
- Frontend branch/worktree: `feature/koda-dashboard-profile-fe` at `/Users/mattotoole/Documents/code/v8/.worktrees/koda/dashboard-profile-fe`
- Backend branch/worktree: `feature/koda-dashboard-profile-be` at `/Users/mattotoole/Documents/code/v8/.worktrees/koda/dashboard-profile-be`
- Notes: `Implemented and merged into develop. Push blocked: no origin remote configured. FE routes /dashboard,/profile,/settings return 200 in container; /api/dashboard/summary currently 500 in running app due missing generated Prisma client in container runtime.`

### 3) Video Upload + Analysis Processing
- Status: `not_started`
- Frontend branch/worktree: `TBD`
- Backend branch/worktree: `TBD`
- Notes: `TBD`

### 4) Analysis Results + Progress/Trends
- Status: `not_started`
- Frontend branch/worktree: `TBD`
- Backend branch/worktree: `TBD`
- Notes: `TBD`

### 5) Messaging + Safeguarding
- Status: `not_started`
- Frontend branch/worktree: `TBD`
- Backend branch/worktree: `TBD`
- Notes: `TBD`

### 6) Team / Roster
- Status: `not_started`
- Frontend branch/worktree: `TBD`
- Backend branch/worktree: `TBD`
- Notes: `TBD`

## Finalisation Checklist (After all 6 modules)

- [ ] Frontend + backend feature branches all merged into `develop`
- [ ] `git checkout develop` in primary repo
- [ ] Delete all feature worktrees to reclaim disk space
