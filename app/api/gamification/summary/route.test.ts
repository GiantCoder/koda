import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";

const getAuthUserMock = vi.fn();
const userPointsFindUniqueMock = vi.fn();
const userBadgeFindManyMock = vi.fn();
const leagueMemberFindFirstMock = vi.fn();
const leagueEntryFindUniqueMock = vi.fn();
const leagueEntryCountMock = vi.fn();
const gameSettingsUpsertMock = vi.fn();

vi.mock("@/lib/get-auth-user", () => ({
  getAuthUser: getAuthUserMock,
}));

vi.mock("@/prisma/client", () => ({
  prisma: {
    userPoints: { findUnique: (...args: unknown[]) => userPointsFindUniqueMock(...args) },
    userBadge: {
      findMany: (...args: unknown[]) => userBadgeFindManyMock(...args),
    },
    leagueMember: {
      findFirst: (...args: unknown[]) => leagueMemberFindFirstMock(...args),
    },
    leagueEntry: {
      findUnique: (...args: unknown[]) => leagueEntryFindUniqueMock(...args),
      count: (...args: unknown[]) => leagueEntryCountMock(...args),
    },
    gameSettings: { upsert: (...args: unknown[]) => gameSettingsUpsertMock(...args) },
  },
}));

let GET: (req: Request) => Promise<Response>;

describe("GET /api/gamification/summary", () => {
  beforeAll(async () => {
    const route = await import("./route");
    GET = route.GET;
  }, 30000);

  beforeEach(() => {
    vi.clearAllMocks();
    userPointsFindUniqueMock.mockResolvedValue(null);
    userBadgeFindManyMock.mockResolvedValue([]);
    leagueMemberFindFirstMock.mockResolvedValue(null);
    gameSettingsUpsertMock.mockResolvedValue({ id: "default", pointEarnSource: "BOTH" });
  });

  it("returns 401 when unauthenticated", async () => {
    getAuthUserMock.mockResolvedValueOnce(null);
    const res = await GET(new Request("http://localhost/api/gamification/summary") as never);
    expect(res.status).toBe(401);
  });

  it("returns summary with zeroed values when user has no points or badges", async () => {
    getAuthUserMock.mockResolvedValueOnce({
      id: "user-1",
      email: "u@test.com",
      role: "PLAYER",
    });
    const res = await GET(new Request("http://localhost/api/gamification/summary") as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      totalPoints: number;
      currentSeasonPts: number;
      goldStarCount: number;
      practiceStreakDays: number;
      recentBadges: unknown[];
      leagueSummary: unknown;
    };
    expect(json.totalPoints).toBe(0);
    expect(json.currentSeasonPts).toBe(0);
    expect(json.goldStarCount).toBe(0);
    expect(json.practiceStreakDays).toBe(0);
    expect(json.recentBadges).toEqual([]);
    expect(json.leagueSummary).toBeNull();
  });

  it("returns summary with user points and recent badges when present", async () => {
    getAuthUserMock.mockResolvedValueOnce({
      id: "user-1",
      email: "u@test.com",
      role: "PLAYER",
    });
    userPointsFindUniqueMock.mockResolvedValueOnce({
      totalPoints: 150,
      currentSeasonPts: 100,
      goldStarCount: 2,
      practiceStreakDays: 5,
    });
    userBadgeFindManyMock.mockResolvedValueOnce([
      {
        earnedAt: new Date(),
        badgeDefinition: { key: "FIRST_TOUCH", name: "First Touch", pointsValue: 10 },
      },
    ]);
    const res = await GET(new Request("http://localhost/api/gamification/summary") as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      totalPoints: number;
      currentSeasonPts: number;
      goldStarCount: number;
      practiceStreakDays: number;
      recentBadges: Array<{ definition: { key: string }; earnedAt: string }>;
    };
    expect(json.totalPoints).toBe(150);
    expect(json.currentSeasonPts).toBe(100);
    expect(json.goldStarCount).toBe(2);
    expect(json.practiceStreakDays).toBe(5);
    expect(json.recentBadges).toHaveLength(1);
    expect(json.recentBadges[0].definition.key).toBe("FIRST_TOUCH");
  });
});
