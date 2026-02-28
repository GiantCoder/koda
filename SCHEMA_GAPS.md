# Schema Gaps & Limitations (MVP)

This document describes schema limitations and placeholder implementations for the Auth + Onboarding feature.

## Current Implementation

- **Prisma schema**: Extended with `User`, `ConsentRecord`, `PrivacyPreferences` models.
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
