# ECB Play-Cricket API Reference (v1)

Reference for the Play-Cricket v2 REST API used for club, team, and match data. Base URL: `https://play-cricket.com/api/v2/` (or `https://www.play-cricket.com/api/v2/`). All endpoints require `api_token` as a query parameter.

---

## Endpoints in use

| Purpose | Method | Endpoint | Parameters |
|--------|--------|----------|------------|
| Clubs list | GET | `clubs.json` | `api_token` (required), `county_id`, `from_entry_date`, `end_entry_date` |
| Teams for site | GET | `sites/{site_id}/teams.json` | `api_token` (required), optional `site_type`, entry dates |
| Players for club | GET | `sites/{site_id}/players` | `api_token` (required), `include_everyone=yes`, `include_historic=yes` (optional) |

**Clubs response:** `{ "clubs": [ { "id", "name", "county_id", "status", "last_updated" } ] }`  
**Teams response:** `{ "teams": [ { "id", "team_name", "site_id", "status", "last_updated", ... } ] }`  
**Players response:** `{ "players": [ { "member_id", "name" } ] }` — no batting/bowling/fielding stats.

---

## Other documented endpoints (for future use)

### Match Summary API
Fixture list (no scorecards).  
`GET matches.json` — **Params:** `api_token`, `site_id` (required), `season` (recommended), `division_id`, `cup_id`, `team_id`, `competition_type`, `from_entry_date`, `end_entry_date`, `include_unpublished`.

**Response:** `{ "matches": [ { "id", "match_date", "home_team_id", "away_team_id", "competition_type", "match_type", ... } ] }`

### Result Summary API
Matches that have a result attached (more detail than Match Summary).  
`GET result_summary.json` — **Params:** `api_token`, `site_id` (required), `season` (required), `division_id`, `cup_id`, `team_id`, `competition_type`, `from_match_date`, `end_match_date`, entry dates.

**Response:** `{ "result_summary": [ { "id", "match_date", "home_team_id", "away_team_id", "innings": [ ... ], ... } ] }`

### Match Detail API
Full scorecard for one match (team sheets, innings, per-player batting/bowling).  
`GET match_detail.json` — **Params:** `api_token`, `match_id` (required).

**Response:** `{ "match_details": [ { "id", "match_date", "players": [ { "home_team": [ { "player_id", "player_name", ... } ], "away_team": [ ... ] } ], "innings": [ { "team_batting_id", "bat": [ { "batsman_id", "runs", "balls", ... } ], "bowl": [ { "bowler_id", "overs", "wickets", "runs", ... } ], ... } ] } ] }`

### League Table API
`GET league_table.json` — **Params:** `api_token`, `division_id` (required). Note: `division_id` changes each season.

### Teams in Division API
`GET competition_teams.json` — **Params:** `api_token`, `id` (required). Returns `competition_teams` with `club_id`, `club_name`, `team_id`, `team_name`.

### Competitions API
`GET competitions.json` — **Params:** `api_token`, `league_id` (required), `season` (required), `competition_type` (required: `divisions` or `cups`).

### Request League Sites API
`GET league_sites.json` — **Params:** `api_token`. Returns `leagues` with `league_id`, `name`, `subsite_url`.

### County Cricket Boards (CCBs)
`GET CCBs.json` — **Params:** `api_token`. Returns `CCBs` array.

---

## Strategy: aggregated player statistics

**Current state (Phase 2)**  
- There is **no** Play-Cricket endpoint that returns aggregated batting/bowling/fielding stats (e.g. season runs, wickets, averages) per player.  
- We use **Players API** (`sites/{site_id}/players`) to get a list of players (`member_id`, `name`) and map them into our `PlayCricketPlayerSummary` shape with **stats fields set to zero**. Sync and Squad Intelligence work, but stats are placeholders.

**Recommended approach for real stats (Phase 3+)**  
1. **Match list** — Call **Result Summary API** (`result_summary.json`) with `site_id` and `season` to get match IDs for completed matches.  
2. **Scorecards** — For each match ID, call **Match Detail API** (`match_detail.json?match_id=...`) to get full scorecards (batting/bowling per player per innings).  
3. **Aggregate** — In our code, aggregate runs, balls, wickets, overs, etc. by `player_id` (and optionally by competition_type / match_type) to compute season totals and derive averages, strike rates, economy, best figures, fifties/hundreds, catches/run-outs from innings data.  
4. **Throttling** — Use Inngest or similar to avoid hammering the API (e.g. limit concurrent match_detail calls, cache results, back off on errors).

Once aggregation is implemented, we can either replace the Players-only flow for stats or merge: keep Players API for the list and overlay aggregated stats from match detail.

---

## Version

- **Doc version:** 1  
- **Last updated:** 2026-03  
- **Source:** ECB Play-Cricket API documentation (Experienced Developers), in-repo notes.
