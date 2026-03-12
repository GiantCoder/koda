export type SyncClubStatsEvent = {
  name: "play-cricket/sync.requested";
  data: {
    coachId: string;
    clubId: string;
    season: string;
    requestedAt: string;
  };
};

export type SyncMatchDetailEvent = {
  name: "play-cricket/match.sync-requested";
  data: {
    coachId: string;
    clubId: string;
    matchId: number;
    siteId: string;
    season: string;
    teamId: string;
  };
};

export type KodaEvents = SyncClubStatsEvent | SyncMatchDetailEvent;
