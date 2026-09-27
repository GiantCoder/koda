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

/** Clubs are coach-owned, so the same Play-Cricket club can exist twice.
 * Admins listing every club should see one card per real-world club. */
export function pickCanonicalClubs<T extends {
  coachId: string;
  name: string;
  playCricketId: string;
  createdAt: Date;
}>(clubs: T[], preferredCoachId: string): T[] {
  const groups = new Map<string, T[]>();
  for (const club of clubs) {
    const playCricketId = club.playCricketId.trim();
    const key = playCricketId
      ? `pc:${playCricketId}`
      : `name:${club.name.trim().toLowerCase()}`;
    const group = groups.get(key) ?? [];
    group.push(club);
    groups.set(key, group);
  }

  return Array.from(groups.values()).map((group) => {
    const owned = group.find((club) => club.coachId === preferredCoachId);
    if (owned) return owned;
    return group.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  });
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
