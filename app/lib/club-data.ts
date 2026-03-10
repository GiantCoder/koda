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
  stats: ClubStats;
}

export interface PlayCricketTeamRecord {
  id: string;
  name: string;
  clubName: string;
  squadHint?: string;
}

export const MOCK_CLUBS: ClubRecord[] = [
  {
    id: "club-oakfield",
    name: "Oakfield Cricket Club",
    website: "https://oakfieldcc.example.com",
    playCricketUrl: "https://example.play-cricket.com/OakfieldCC",
    playCricketId: "oakfield-cc",
    address: "12 Meadow Lane, Bristol",
    postcode: "BS1 4AB",
    badgeFileName: "oakfield-badge.svg",
    bannerFileName: "oakfield-banner.png",
    stats: {
      seniors: 42,
      juniors: 58,
      playersCoached: 76,
      averageRating: 4.5,
      sessionsThisMonth: 24,
    },
  },
  {
    id: "club-riverside",
    name: "Riverside Juniors",
    website: "https://riversidejuniors.example.com",
    playCricketUrl: "https://example.play-cricket.com/RiversideJuniors",
    playCricketId: "riverside-juniors",
    address: "1 Pavilion Drive, Reading",
    postcode: "RG1 6XX",
    badgeFileName: "riverside-badge.png",
    bannerFileName: "riverside-banner.svg",
    stats: {
      seniors: 14,
      juniors: 73,
      playersCoached: 61,
      averageRating: 4.3,
      sessionsThisMonth: 19,
    },
  },
];

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
