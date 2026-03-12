import type {
  PlayCricketClub,
  PlayCricketTeam,
  PlayCricketPlayerSummary,
  PlayCricketResult,
  PlayCricketMatchSummary,
  PlayCricketResultSummaryMatch,
  PlayCricketMatchDetail,
} from "./types";

const BASE_URL = "https://play-cricket.com/api/v2/";
const REQUEST_TIMEOUT_MS = 15_000;

async function fetchPlayCricket<T>(
  apiToken: string,
  path: string,
  params: Record<string, string> = {}
): Promise<PlayCricketResult<T>> {
  const url = new URL(path.replace(/^\//, ""), BASE_URL);
  url.searchParams.set("api_token", apiToken);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);

    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: { status: res.status, message: "invalid_key" } };
    }
    if (res.status === 404) {
      return { ok: false, error: { status: 404, message: "not_found" } };
    }
    if (!res.ok) {
      return { ok: false, error: { status: res.status, message: "api_error" } };
    }

    const json = (await res.json()) as unknown;
    return { ok: true, data: json as T };
  } catch (e) {
    clearTimeout(timeoutId);
    const isAbort = e instanceof Error && e.name === "AbortError";
    const isNetwork = e instanceof TypeError && e.message?.includes("fetch");
    if (isAbort || isNetwork) {
      return { ok: false, error: { status: 0, message: "unreachable" } };
    }
    return { ok: false, error: { status: 0, message: "unreachable" } };
  }
}

function extractArray<T>(json: unknown, key: string): T[] {
  const obj = json as Record<string, unknown>;
  const val = obj?.[key];
  if (Array.isArray(val)) return val as T[];
  return [];
}

function mapTeams(raw: Record<string, unknown>[], siteId: string): PlayCricketTeam[] {
  const siteNum = parseInt(siteId, 10) || 0;
  return raw.map((r) => ({
    id: (r.id as number) ?? 0,
    name: (r.team_name as string) ?? (r.name as string) ?? "",
    club_id: (r.site_id as number) ?? (r.club_id as number) ?? siteNum,
    club_name: (r.club_name as string) ?? (r.site_name as string) ?? "",
  }));
}

export const playCricketClient = {
  async getClubs(apiToken: string): Promise<PlayCricketResult<PlayCricketClub[]>> {
    const result = await fetchPlayCricket<Record<string, unknown>>(
      apiToken,
      "/clubs.json"
    );
    if (!result.ok) return result;
    const clubs = extractArray<PlayCricketClub>(result.data, "clubs");
    return { ok: true, data: clubs };
  },

  async getTeams(
    apiToken: string,
    siteId: string
  ): Promise<PlayCricketResult<PlayCricketTeam[]>> {
    const result = await fetchPlayCricket<Record<string, unknown>>(
      apiToken,
      `/sites/${encodeURIComponent(siteId)}/teams.json`
    );
    if (!result.ok) return result;
    const raw = extractArray<Record<string, unknown>>(result.data, "teams");
    if (raw.length === 0) {
      const alt = extractArray<Record<string, unknown>>(result.data, "team_list");
      return { ok: true, data: mapTeams(alt, siteId) };
    }
    return { ok: true, data: mapTeams(raw, siteId) };
  },

  async getPlayerStats(
    apiToken: string,
    siteId: string,
    season?: string
  ): Promise<PlayCricketResult<PlayCricketPlayerSummary[]>> {
    const params: Record<string, string> = {};
    if (season) params.season = season;
    const path = `/sites/${encodeURIComponent(siteId)}/players`;
    const result = await fetchPlayCricket<Record<string, unknown>>(
      apiToken,
      path,
      params
    );
    if (!result.ok) return result;
    const raw = extractArray<Record<string, unknown>>(result.data, "players");
    const stats: PlayCricketPlayerSummary[] = raw.map((r) => {
      const name = String(r.name ?? "").trim();
      const parts = name.split(/\s+/);
      const firstName = parts[0] ?? "";
      const lastName = parts.slice(1).join(" ") ?? "";
      return {
        id: (r.member_id as number) ?? 0,
        team_id: 0,
        first_name: firstName,
        last_name: lastName,
        batting_innings: 0,
        batting_not_outs: 0,
        batting_runs: 0,
        batting_highest: 0,
        batting_average: null,
        batting_strike_rate: null,
        batting_fifties: 0,
        batting_hundreds: 0,
        bowling_overs: 0,
        bowling_wickets: 0,
        bowling_runs: 0,
        bowling_average: null,
        bowling_economy: null,
        bowling_best_figures: null,
        bowling_five_wickets: 0,
        fielding_catches: 0,
        fielding_stumpings: 0,
        fielding_run_outs: 0,
        season: season ?? new Date().getFullYear().toString(),
        competition_type: "Limited Overs",
      };
    });
    return { ok: true, data: stats };
  },

  // --- Phase 3+ aggregation: match list + detail for building player stats ---

  /** Fixture list for a site/season (no scorecards). Use for match IDs. */
  async getMatches(
    apiToken: string,
    siteId: string,
    season: string,
    params?: { team_id?: string; competition_type?: string }
  ): Promise<PlayCricketResult<PlayCricketMatchSummary[]>> {
    const q: Record<string, string> = { site_id: siteId, season };
    if (params?.team_id) q.team_id = params.team_id;
    if (params?.competition_type) q.competition_type = params.competition_type;
    const result = await fetchPlayCricket<Record<string, unknown>>(
      apiToken,
      "/matches.json",
      q
    );
    if (!result.ok) return result;
    const matches = extractArray<PlayCricketMatchSummary>(result.data, "matches");
    return { ok: true, data: matches };
  },

  /** Matches with results attached (more detail). Preferred for aggregating stats. */
  async getResultSummary(
    apiToken: string,
    siteId: string,
    season: string,
    params?: { team_id?: string; competition_type?: string }
  ): Promise<PlayCricketResult<PlayCricketResultSummaryMatch[]>> {
    const q: Record<string, string> = { site_id: siteId, season };
    if (params?.team_id) q.team_id = params.team_id;
    if (params?.competition_type) q.competition_type = params.competition_type;
    const result = await fetchPlayCricket<Record<string, unknown>>(
      apiToken,
      "/result_summary.json",
      q
    );
    if (!result.ok) return result;
    const list = extractArray<PlayCricketResultSummaryMatch>(result.data, "result_summary");
    return { ok: true, data: list };
  },

  /** Full scorecard for one match (batting/bowling per player per innings). */
  async getMatchDetail(
    apiToken: string,
    matchId: number | string
  ): Promise<PlayCricketResult<PlayCricketMatchDetail | null>> {
    const result = await fetchPlayCricket<Record<string, unknown>>(
      apiToken,
      "/match_detail.json",
      { match_id: String(matchId) }
    );
    if (!result.ok) return result;
    const details = (result.data as Record<string, unknown>).match_details;
    const first = Array.isArray(details) ? (details[0] as PlayCricketMatchDetail) ?? null : null;
    return { ok: true, data: first };
  },
};
