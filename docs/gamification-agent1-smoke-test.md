# Koda Gamification — Agent 1 Smoke Test

After merging the schema + seeds branch, run these steps to verify.

## 1. Run migration

From project root (use Docker if your local Node has Prisma WASM issues):

```bash
npx prisma migrate dev --name add_gamification_system
# or apply the migration manually: prisma/migrations/20260311120000_add_gamification_system/migration.sql
npx prisma generate
```

If `prisma validate` or `migrate` fails with a WebAssembly `externref` error locally, run with:

```bash
node --experimental-wasm-reftypes ./node_modules/prisma/build/index.js migrate dev --name add_gamification_system
```

Or run the migration inside your Docker PHP/Node container where the flag may already be set.

## 2. Seed the database

```bash
npm run db:seed
```

This seeds users and the 15 badge definitions.

## 3. Verify in Prisma Studio

```bash
npx prisma studio
```

- Confirm new tables: `UserPoints`, `PointTransaction`, `BadgeDefinition`, `UserBadge`, `League`, `LeagueSeason`, `LeagueMember`, `LeagueEntry`, `Challenge`, `ChallengeSubmission`.
- Open `BadgeDefinition` and confirm 15 rows with unique `key` values.

## 4. Club + League auto-creation

- Create a club via the API (e.g. POST to your clubs endpoint with a coach auth token).
- In Prisma Studio, confirm:
  - One `League` with `scope = CLUB`, `clubId` = the new club id, `name` = "{Club Name} League".
  - One `LeagueSeason` for that league (e.g. `seasonNumber` 1, `endsAt` ~30 days from now).
  - One `LeagueMember` for the creating coach.

## 5. Badge seed tests

```bash
npm test -- prisma/seeds/badges.test.ts --run
```

Validates that all 15 badge definitions are present with unique keys and correct shape. If the project’s Vitest config fails to load (e.g. ESM), run the same assertions in a one-off script or after fixing the test runner.

## 6. Existing tests

```bash
npm test
```

Ensure existing tests still pass.
