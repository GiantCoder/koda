export interface ClubStats {
  seniors: number;
  juniors: number;
  playersCoached: number;
  averageRating: number;
  sessionsThisMonth: number;
}

export interface ClubRecord {
  id: string;
  name: string;
  website: string;
  playCricketUrl: string;
  playCricketId: string;
  address: string;
  postcode: string;
  badgeFileName?: string;
  bannerFileName?: string;
  badgeImageUrl?: string;
  bannerImageUrl?: string;
  stats: ClubStats;
}

export interface PlayCricketTeamRecord {
  id: string;
  name: string;
  clubName: string;
  squadHint?: string;
}

export const MOCK_PLAY_CRICKET_TEAMS: PlayCricketTeamRecord[] = [
  {
    id: "pct-oakfield-1xi",
    name: "Oakfield 1st XI",
    clubName: "Oakfield Cricket Club",
    squadHint: "Senior Performance",
  },
  {
    id: "pct-oakfield-u16",
    name: "Oakfield U16 Tigers",
    clubName: "Oakfield Cricket Club",
    squadHint: "Under-16",
  },
  {
    id: "pct-riverside-u14",
    name: "Riverside U14 Rockets",
    clubName: "Riverside Juniors",
    squadHint: "Under-14",
  },
  {
    id: "pct-riverside-u12",
    name: "Riverside U12 Sparks",
    clubName: "Riverside Juniors",
    squadHint: "Under-12",
  },
];
