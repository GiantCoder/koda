# League API smoke checks (no UI yet)

Use **Postman** (or **curl**) to hit the league endpoints. Auth is either **Bearer JWT** (from login) or **dev headers**.

---

## 1. Auth for Postman

**Option A – Login and use JWT**

1. `POST {{base}}/api/auth/login`  
   Body (JSON): `{ "email": "your@email.com", "password": "yourpassword" }`
2. From the response copy `accessToken`.
3. In Postman, set **Authorization** → Type: **Bearer Token** → Token: ` paste accessToken `.
4. Use this for all league requests below.

**Option B – Dev headers (no login)**

If you have a user id from the DB (e.g. from Prisma Studio or seed):

- **Headers:**
  - `x-auth-user-id`: `<user-uuid>`
  - `x-auth-role`: `PLAYER` or `COACH`

Use the same headers for every league request. Replace `<user-uuid>` with a real user id from your `User` table.

**Base URL:** `http://localhost:3005` (or your app port)

### If login POST hangs or returns ECONNRESET

- **Use Option B (dev headers)** so you don’t need login: set `x-auth-user-id` to a real user UUID and `x-auth-role` to `PLAYER`. Get the UUID from Prisma Studio (`npx prisma studio`) → `User` table, or from your seed. Then you can run all league requests below without calling login.
- **In Postman for login:** Method **POST**, URL `http://localhost:3005/api/auth/login`, **Body** → **raw** → **JSON**, and add header **Content-Type: application/json** (often auto-set when you pick JSON). Send `{ "email": "...", "password": "..." }`.
- **Check app logs** when you send the login request. If the app crashes or errors, the connection will drop (ECONNRESET).  
  - Docker: `docker compose logs app -f`  
  - Local: terminal where `npm run dev` is running  
  Look for Redis or database errors; login uses both DB and Redis (refresh token storage).
- **Docker:** Ensure the app container can reach Redis and MySQL (e.g. `REDIS_URL=redis://redis:6379`, `DATABASE_URL` with host `mysql`). If Redis is down or unreachable, login can hang or throw and the connection may reset.

---

## 2. Create a league (user 1)

**POST** `http://localhost:3005/api/leagues`

**Headers:** (if not using Bearer)  
`x-auth-user-id`: `<user-1-id>`  
`x-auth-role`: `PLAYER`

**Body (raw JSON):**

```json
{
  "name": "Test League",
  "seasonLengthDays": 30
}
```

Optional: `"ageGroup": "UNDER_14"`

**Expected:** `200` with `{ "league": { "id", "name", "joinCode", ... }, "season": { ... } }`.  
**Copy `league.joinCode`** (e.g. `ABC123`) and **`league.id`** for the next steps.

---

## 3. Join the league (user 2)

**POST** `http://localhost:3005/api/leagues/join`

**Headers:** Use auth for a **different** user (user 2).  
`x-auth-user-id`: `<user-2-id>`  
`x-auth-role`: `PLAYER`

**Body (raw JSON):**

```json
{
  "joinCode": "ABC123"
}
```

Use the `joinCode` from step 2. If your code is uppercase in the DB, send uppercase.

**Expected:** `200` with `{ "league": { ... }, "currentSeason": { ... } }`.

---

## 4. List my leagues (either user)

**GET** `http://localhost:3005/api/leagues`

**Headers:** Same as for the user you’re testing (user 1 or user 2).

**Expected:** `200` with `{ "leagues": [ { "id", "name", "scope", "currentSeason", "userRank", "memberCount" }, ... ] }`.

---

## 5. League table (leaderboard)

**GET** `http://localhost:3005/api/leagues/{{leagueId}}/table`

Replace `{{leagueId}}` with the league id from step 2. Use the same auth as any member of that league.

**Query (optional):** `?limit=20&cursor=<entry-id>` for pagination.

**Expected:** `200` with `{ "entries": [ ... ], "nextCursor": "...", "userEntry": { ... } }`.

---

## 6. Global leaderboard (no auth)

**GET** `http://localhost:3005/api/leagues/global?ageGroup=UNDER_14`

**Query:** `ageGroup` is required: one of `UNDER_10`, `UNDER_12`, `UNDER_14`, `UNDER_16`, `UNDER_18`, `SENIOR`.

**Expected:** `200` with `{ "entries": [ ... ], "nextCursor": null }`. May be empty until users are in the global league.

---

## 7. Recalculate league ranks (script, not API)

There is no HTTP endpoint for `recalculateLeagueRanks()`. Run the script once (e.g. after some analyses or manual DB edits):

```bash
cd koda && npx tsx scripts/recalculate-league-ranks.ts
```

Requires `DATABASE_URL` (e.g. from `.env` or `.env.local`). The script prints how many rank changes were applied.

---

## 8. After analysis completes (LeagueEntry updates)

1. Run an analysis to completion for **user 1** or **user 2** (upload a video and wait for completion, or use your existing flow).
2. **GET** `http://localhost:3005/api/leagues/{{leagueId}}/table`  
   The user who completed the analysis should have an entry with `points` and `analysisCount` increased.
3. Run the recalculate script (step 7), then call **GET** `/api/leagues/{{leagueId}}/table` again: `currentRank` and `previousRank` should be set.

---

## Quick curl examples (with dev headers)

```bash
# Create league (set USER1_ID to a real user uuid)
curl -s -X POST http://localhost:3005/api/leagues \
  -H "Content-Type: application/json" \
  -H "x-auth-user-id: $USER1_ID" \
  -H "x-auth-role: PLAYER" \
  -d '{"name":"My League","seasonLengthDays":30}'

# List leagues
curl -s http://localhost:3005/api/leagues \
  -H "x-auth-user-id: $USER1_ID" \
  -H "x-auth-role: PLAYER"

# Join (set USER2_ID and JOIN_CODE)
curl -s -X POST http://localhost:3005/api/leagues/join \
  -H "Content-Type: application/json" \
  -H "x-auth-user-id: $USER2_ID" \
  -H "x-auth-role: PLAYER" \
  -d '{"joinCode":"'$JOIN_CODE'"}'
```
