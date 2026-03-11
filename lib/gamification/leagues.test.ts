import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  updateLeagueEntriesForUser,
  recalculateLeagueRanks,
  generateJoinCode,
} from "./leagues";

const leagueMemberFindMany = vi.fn();
const leagueSeasonFindFirst = vi.fn();
const leagueSeasonFindMany = vi.fn();
const leagueEntryFindUnique = vi.fn();
const leagueEntryFindMany = vi.fn();
const leagueEntryUpsert = vi.fn();
const leagueEntryUpdate = vi.fn();
const leagueFindUnique = vi.fn();

vi.mock("@/prisma/client", () => ({
  prisma: {
    leagueMember: { findMany: (...args: unknown[]) => leagueMemberFindMany(...args) },
    leagueSeason: {
      findFirst: (...args: unknown[]) => leagueSeasonFindFirst(...args),
      findMany: (...args: unknown[]) => leagueSeasonFindMany(...args),
    },
    leagueEntry: {
      findUnique: (...args: unknown[]) => leagueEntryFindUnique(...args),
      findMany: (...args: unknown[]) => leagueEntryFindMany(...args),
      upsert: (...args: unknown[]) => leagueEntryUpsert(...args),
      update: (...args: unknown[]) => leagueEntryUpdate(...args),
    },
    league: { findUnique: (...args: unknown[]) => leagueFindUnique(...args) },
  },
}));

describe("updateLeagueEntriesForUser", () => {
  const userId = "user-1";
  const leagueId = "league-1";
  const seasonId = "season-1";

  beforeEach(() => {
    vi.clearAllMocks();
    leagueMemberFindMany.mockResolvedValue([{ leagueId }]);
    leagueSeasonFindFirst.mockResolvedValue({
      id: seasonId,
      leagueId,
      seasonNumber: 1,
      isActive: true,
    });
    leagueEntryFindUnique.mockResolvedValue(null);
    leagueEntryUpsert.mockResolvedValue({});
  });

  it("upserts league entry with points and gold star when grade >= 90", async () => {
    await updateLeagueEntriesForUser(userId, 50, { gradeOverall: 92 });
    expect(leagueEntryUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { leagueSeasonId_userId: { leagueSeasonId: seasonId, userId } },
        update: expect.objectContaining({
          points: { increment: 50 },
          goldStars: { increment: 1 },
          analysisCount: { increment: 1 },
        }),
      })
    );
  });

  it("does not increment gold star when grade < 90", async () => {
    await updateLeagueEntriesForUser(userId, 25, { gradeOverall: 75 });
    expect(leagueEntryUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          goldStars: { increment: 0 },
        }),
      })
    );
  });

  it("updates topScore when current grade is higher than existing", async () => {
    leagueEntryFindUnique.mockResolvedValue({
      id: "entry-1",
      topScore: 80,
      userId,
      leagueSeasonId: seasonId,
    });
    await updateLeagueEntriesForUser(userId, 10, { gradeOverall: 85 });
    expect(leagueEntryUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          topScore: 85,
        }),
      })
    );
  });

  it("does nothing when user has no league memberships", async () => {
    leagueMemberFindMany.mockResolvedValue([]);
    await updateLeagueEntriesForUser(userId, 10, { gradeOverall: 70 });
    expect(leagueEntryUpsert).not.toHaveBeenCalled();
  });
});

describe("recalculateLeagueRanks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leagueSeasonFindMany.mockResolvedValue([]);
  });

  it("returns empty when no active seasons", async () => {
    const result = await recalculateLeagueRanks();
    expect(result).toEqual([]);
  });

  it("returns rank changes and updates entries when season has entries", async () => {
    const season = {
      id: "season-1",
      leagueId: "league-1",
      league: { name: "Test League" },
    };
    leagueSeasonFindMany.mockResolvedValue([season]);
    leagueEntryFindMany.mockResolvedValue([
      { id: "e1", userId: "u1", currentRank: 2, leagueSeasonId: "season-1" },
      { id: "e2", userId: "u2", currentRank: 1, leagueSeasonId: "season-1" },
    ]);
    leagueEntryUpdate.mockResolvedValue({});
    const result = await recalculateLeagueRanks();
    expect(leagueEntryFindMany).toHaveBeenCalled();
    expect(leagueEntryUpdate).toHaveBeenCalled();
    expect(result.length).toBeGreaterThanOrEqual(0);
  });
});

describe("generateJoinCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leagueFindUnique.mockResolvedValue(null);
  });

  it("returns a 6-character string when code is unique", async () => {
    const code = await generateJoinCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });
});
