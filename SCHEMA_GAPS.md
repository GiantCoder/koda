# Schema Gaps & Limitations (MVP)

This document describes schema limitations and placeholder implementations for the Auth + Onboarding feature.

## Module 3: Video Upload & Analysis (4.3, 4.4)

- **Video/Analysis models**: Added to Prisma schema. Migration: `20250228160000_add_video_analysis`.
- **POST /api/videos/upload/init**: Creates Video record with `storagePath`; returns `uploadId`, `videoId`, `uploadUrl`. Tus PATCH/HEAD chunk endpoints not implemented (MVP scope).
- **POST /api/analysis**: Creates Analysis record with `status: QUEUED`. BullMQ job not enqueued; log placeholder.
- **GET /api/analysis/:id/stream**: SSE mock that emits progress stages (EXTRACTING_FRAMES → POSE_ANALYSIS → SHOT_CLASSIFICATION → GENERATING_FEEDBACK → complete). No real-time worker integration.
- **Prisma 7**: `prisma.config.ts` required; `DATABASE_URL` must be set for `prisma generate` and migrations.

## Current Implementation

- **Prisma schema**: Extended with `User`, `ConsentRecord`, `PrivacyPreferences`, `Video`, `Analysis` models.
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

Run `npx prisma migrate dev --name add_auth_onboarding` (or `prisma migrate deploy` in CI) after ensuring Node 20+ and `npm install` succeed.
