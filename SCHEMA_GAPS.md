# Schema Gaps & Limitations (MVP)

This document describes schema limitations and placeholder implementations for the Auth + Onboarding feature.

## Module 3: Video Upload & Analysis (4.3, 4.4)

- **Video/Analysis models**: Added to Prisma schema. Migration: `20250228160000_add_video_analysis`.
- **POST /api/videos/upload/init**: Creates Video record with `storagePath`; returns `uploadId`, `videoId`, `uploadUrl`. Tus PATCH/HEAD chunk endpoints not implemented (MVP scope).
- **POST /api/analysis**: Creates Analysis record with `status: QUEUED`. BullMQ job not enqueued; log placeholder.
- **GET /api/analysis/:id/stream**: SSE mock that emits progress stages (EXTRACTING_FRAMES → POSE_ANALYSIS → SHOT_CLASSIFICATION → GENERATING_FEEDBACK → complete). No real-time worker integration.
- **Prisma 7**: `prisma.config.ts` required; `DATABASE_URL` must be set for `prisma generate` and migrations.

## Module 4: Analysis Results & Progress (4.4, 4.8)

- **GET /api/analysis/:id**: Enhanced with `video` (id, filename, durationSeconds, resolutionWidth, resolutionHeight, cdnUrl) and `scores` object for charting. RBAC: owner, coach, admin.
- **GET /api/analysis/:id/report**: MVP placeholder. Returns JSON metadata; PDF generation via Puppeteer/BullMQ not implemented.
- **GET /api/progress/:userId**: Returns totalSessions, avgGrade, gradeLetter, bestShot, recentSessions. Derived from Analysis table.
- **GET /api/progress/:userId/trend**: Returns `{ trend: [{ date, grade, analysisId }] }` for line chart.
- **GET /api/progress/:userId/shots**: Returns `{ shots: [{ shotType, count, percentage }], totalAnalyses }` for doughnut chart.
- **GET /api/progress/:userId/achievements**: Returns empty array. UserAchievement and Achievement models not in schema.
- **RBAC**: Player self, coach, admin allowed. Parent linked child requires GuardianLink (not in schema); parent can only view own progress until GuardianLink added.

## Module 5: Messaging (4.7)

- **Conversation, Message, ConversationParticipant, GuardianLink, AuditLog models**: Added to Prisma schema. Migration: `20250228170000_add_messaging`.
- **GET /api/conversations**: List conversations for authenticated user. Includes `parentVisibility` metadata.
- **POST /api/conversations**: Create conversation with `participantIds` and optional `subject`. Safeguarding: if any participant is under 18, future messages use `PARENT_VISIBLE`; logs to AuditLog.
- **GET /api/conversations/:id/messages**: Paginated messages (limit/offset). Returns `parentVisibility` per message.
- **POST /api/conversations/:id/messages**: Send message. Safeguarding: if recipient is under 18, `visibility: PARENT_VISIBLE`.
- **PUT /api/conversations/:id/read**: Mark conversation as read.
- **GET /api/messages/search**: Placeholder; returns empty array. Full-text search not implemented.
- **Safeguarding MVP**: Messages/conversations with minor recipients include `parentVisible: true` and optional `reason` in response. GuardianLink exists for parent-child links; adding guardians as read-only participants not implemented (future).

## Current Implementation

- **Prisma schema**: Extended with `User`, `ConsentRecord`, `PrivacyPreferences`, `Video`, `Analysis`, `Conversation`, `Message`, `ConversationParticipant`, `GuardianLink`, `AuditLog` models.
- **JWT**: HS256 (MVP). PRD specifies RS256; upgrade when `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` env vars are available.
- **Refresh token**: Placeholder only. No Redis storage; returns 501 with message.
- **Email**: No email worker; consent/verification emails are logged (placeholder). Integrate BullMQ `email` queue when available.
- **Session**: No server-side session store. Logout is a no-op (client should discard token). Add Redis revocation when available.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | No (dev) | HS256 secret. Use `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` for RS256 in production |

## Migration

Run `npx prisma migrate dev` (or `prisma migrate deploy` in CI) after ensuring Node 20+ and `npm install` succeed. Migrations: `20250228150000_add_auth_onboarding`, `20250228160000_add_video_analysis`, `20250228170000_add_messaging`.
