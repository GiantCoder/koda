import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";

const getAuthUserMock = vi.fn();
const leagueMemberFindManyMock = vi.fn();
const leagueEntryFindUniqueMock = vi.fn();
const leagueEntryCountMock = vi.fn();
const leagueCreateMock = vi.fn();
const leagueSeasonCreateMock = vi.fn();
const leagueMemberCreateMock = vi.fn();
const leagueEntryCreateMock = vi.fn();

vi.mock("@/lib/get-auth-user", () => ({
  getAuthUser: getAuthUserMock,
}));

vi.mock("@/lib/gamification/leagues", () => ({
  generateJoinCode: vi.fn().mockResolvedValue("ABC123"),
}));

vi.mock("@/prisma/client", () => ({
  prisma: {
    leagueMember: {
      findMany: (...args: unknown[]) => leagueMemberFindManyMock(...args),
      create: (...args: unknown[]) => leagueMemberCreateMock(...args),
    },
    leagueEntry: {
      findUnique: (...args: unknown[]) => leagueEntryFindUniqueMock(...args),
      count: (...args: unknown[]) => leagueEntryCountMock(...args),
      create: (...args: unknown[]) => leagueEntryCreateMock(...args),
    },
    league: { create: (...args: unknown[]) => leagueCreateMock(...args) },
    leagueSeason: { create: (...args: unknown[]) => leagueSeasonCreateMock(...args) },
  },
}));

let GET: (req: Request) => Promise<Response>;
let POST: (req: Request) => Promise<Response>;

beforeAll(async () => {
  const route = await import("./route");
  GET = route.GET;
  POST = route.POST;
}, 30000);

describe("GET /api/leagues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leagueMemberFindManyMock.mockResolvedValue([]);
  });

  it("returns 401 when unauthenticated", async () => {
    getAuthUserMock.mockResolvedValueOnce(null);
    const res = await GET(new Request("http://localhost/api/leagues") as never);
    expect(res.status).toBe(401);
  });

  it("returns empty leagues when user has no memberships", async () => {
    getAuthUserMock.mockResolvedValueOnce({
      id: "user-1",
      email: "u@test.com",
      role: "PLAYER",
    });
    const res = await GET(new Request("http://localhost/api/leagues") as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { leagues: unknown[] };
    expect(json.leagues).toEqual([]);
  });
});

describe("POST /api/leagues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leagueCreateMock.mockResolvedValue({
      id: "league-1",
      name: "My League",
      scope: "CUSTOM",
      joinCode: "ABC123",
      ageGroup: null,
      isActive: true,
    });
    leagueSeasonCreateMock.mockResolvedValue({
      id: "season-1",
      leagueId: "league-1",
      seasonNumber: 1,
      startsAt: new Date(),
      endsAt: new Date(),
      isActive: true,
    });
    leagueMemberCreateMock.mockResolvedValue({});
    leagueEntryCreateMock.mockResolvedValue({});
  });

  it("returns 401 when unauthenticated", async () => {
    getAuthUserMock.mockResolvedValueOnce(null);
    const res = await POST(
      new Request("http://localhost/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test League" }),
      }) as never
    );
    expect(res.status).toBe(401);
  });

  it("creates league and returns joinCode", async () => {
    getAuthUserMock.mockResolvedValueOnce({
      id: "user-1",
      email: "u@test.com",
      role: "PLAYER",
    });
    const res = await POST(
      new Request("http://localhost/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test League", seasonLengthDays: 30 }),
      }) as never
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { league: { joinCode: string }; season: unknown };
    expect(json.league.joinCode).toBe("ABC123");
    expect(json.season).toBeDefined();
  });

  it("returns 400 for invalid body", async () => {
    getAuthUserMock.mockResolvedValueOnce({
      id: "user-1",
      email: "u@test.com",
      role: "PLAYER",
    });
    const res = await POST(
      new Request("http://localhost/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" }),
      }) as never
    );
    expect(res.status).toBe(400);
  });
});
