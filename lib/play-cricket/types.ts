export interface PlayCricketClub {
  id: number;
  name: string;
  short_name: string;
  website: string;
  address: string;
  ground: string;
  play_cricket_url: string;
}

export interface PlayCricketTeam {
  id: number;
  name: string;
  club_id: number;
  club_name: string;
}

export interface PlayCricketPlayerSummary {
  id: number; // person ID — stable across seasons
  team_id: number;
  first_name: string;
  last_name: string;
  // Batting
  batting_innings: number;
  batting_not_outs: number;
  batting_runs: number;
  batting_highest: number;
  batting_average: number | null;
  batting_strike_rate: number | null;
  batting_fifties: number;
  batting_hundreds: number;
  // Bowling
  bowling_overs: number;
  bowling_wickets: number;
  bowling_runs: number;
  bowling_average: number | null;
  bowling_economy: number | null;
  bowling_best_figures: string | null; // e.g. "4-23"
  bowling_five_wickets: number;
  // Fielding
  fielding_catches: number;
  fielding_stumpings: number;
  fielding_run_outs: number;
  // Meta
  season: string; // e.g. "2024"
  competition_type: string; // "Limited Overs" | "T20" | "Declaration"
}

export interface PlayCricketApiError {
  status: number;
  message: string;
}

export type PlayCricketResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: PlayCricketApiError };

// --- Endpoints for future aggregation (Phase 3+) ---

/** Match summary fixture list (no scorecard). */
export interface PlayCricketMatchSummary {
  id: number;
  match_date: string;
  home_team_id: string;
  away_team_id: string;
  competition_type?: string;
  match_type?: string;
  season?: string;
  [key: string]: unknown;
}

/** Result summary match (has result; more detail than match summary). */
export interface PlayCricketResultSummaryMatch {
  id: number;
  match_date: string;
  home_team_id: string;
  away_team_id: string;
  innings?: unknown[];
  [key: string]: unknown;
}

/** Match detail scorecard (full batting/bowling per innings). */
export interface PlayCricketMatchDetail {
  id: number;
  match_date?: string;
  players?: unknown;
  innings?: unknown[];
  [key: string]: unknown;
}
