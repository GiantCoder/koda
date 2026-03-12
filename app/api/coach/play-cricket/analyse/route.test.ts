import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";

const getAuthUserMock = vi.fn();
const clubFindFirstMock = vi.fn();
const statsFindManyMock = vi.fn();
const anthropicCreateMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/get-auth-user", () => ({
  getAuthUser: (...args: unknown[]) => getAuthUserMock(...args),
}));

vi.mock("@/prisma/client", () => ({
  prisma: {
    club: { findFirst: (...args: unknown[]) => clubFindFirstMock(...args) },
    playCricketPlayerStats: {
      findMany: (...args: unknown[]) => statsFindManyMock(...args),
    },
  },
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: anthropicCreateMock,
    },
  })),
}));

let POST: (req: Request) => Promise<Response>;

const mockStatsRows = [
  {
    playCricketPersonId: "100",
    teamName: "1st XI",
    season: "2024",
    competitionType: "Limited Overs",
    battingInnings: 5,
    battingRuns: 120,
    battingAverage: 30,
    battingHighest: 45,
    battingFifties: 1,
    battingHundreds: 0,
    battingStrikeRate: 85,
    bowlingWickets: 0,
    bowlingAverage: null,
    bowlingEconomy: null,
    bowlingBestFigures: null,
    bowlingFiveWickets: 0,
    fieldingCatches: 2,
    fieldingStumpings: 0,
    fieldingRunOuts: 1,
    import: { firstName: "John", lastName: "Smith", linkedUserId: null },
  },
  {
    playCricketPersonId: "101",
    teamName: "1st XI",
    season: "2024",
    competitionType: "Limited Overs",
    battingInnings: 4,
    battingRuns: 80,
    battingAverage: 26.67,
    battingHighest: 35,
    battingFifties: 0,
    battingHundreds: 0,
    battingStrikeRate: 72,
    bowlingWickets: 3,
    bowlingAverage: 22,
    bowlingEconomy: 4.5,
    bowlingBestFigures: "3-25",
    bowlingFiveWickets: 0,
    fieldingCatches: 1,
    fieldingStumpings: 0,
    fieldingRunOuts: 0,
    import: { firstName: "Jane", lastName: "Doe", linkedUserId: null },
  },
];

describe("POST /api/coach/play-cricket/analyse", () => {
  const origKey = process.env.ANTHROPIC_API_KEY;

  beforeAll(async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const route = await import("./route");
    POST = route.POST;
  }, 30000);

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = origKey ?? "test-key";
  });

  it("returns 401 when unauthenticated", async () => {
    getAuthUserMock.mockResolvedValueOnce(null);
    const res = await POST(
      new Request("http://localhost/api/coach/play-cricket/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId: "11111111-1111-1111-1111-111111111111", season: "2024" }),
      }) as never
    );
    expect(res.status).toBe(401);
    expect(statsFindManyMock).not.toHaveBeenCalled();
    expect(anthropicCreateMock).not.toHaveBeenCalled();
  });

  it("returns 403 for non-COACH", async () => {
    getAuthUserMock.mockResolvedValueOnce({
      id: "user-1",
      email: "p@test.com",
      role: "PLAYER",
    });
    const res = await POST(
      new Request("http://localhost/api/coach/play-cricket/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId: "11111111-1111-1111-1111-111111111111", season: "2024" }),
      }) as never
    );
    expect(res.status).toBe(403);
    expect(anthropicCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 if fewer than 2 players found", async () => {
    const clubId = "11111111-1111-1111-1111-111111111111";
    getAuthUserMock.mockResolvedValueOnce({ id: "coach-1", email: "c@test.com", role: "COACH" });
    clubFindFirstMock.mockResolvedValueOnce({ id: clubId });
    statsFindManyMock.mockResolvedValueOnce(mockStatsRows.slice(0, 1));
    const res = await POST(
      new Request("http://localhost/api/coach/play-cricket/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId, season: "2024" }),
      }) as never
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toContain("Insufficient data");
    expect(anthropicCreateMock).not.toHaveBeenCalled();
  });

  it("calls Anthropic with correctly structured prompt and returns parsed JSON on success", async () => {
    const clubId = "11111111-1111-1111-1111-111111111111";
    getAuthUserMock.mockResolvedValueOnce({ id: "coach-1", email: "c@test.com", role: "COACH" });
    clubFindFirstMock.mockResolvedValueOnce({ id: clubId });
    statsFindManyMock.mockResolvedValueOnce(mockStatsRows);

    const mockResponse = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            summary: "Solid squad performance.",
            improving: [],
            declining: [],
            standouts: [],
            insights: [],
            dataNote: "Limited sample.",
          }),
        },
      ],
    };
    anthropicCreateMock.mockResolvedValueOnce(mockResponse);

    const res = await POST(
      new Request("http://localhost/api/coach/play-cricket/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId, season: "2024" }),
      }) as never
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { summary?: string; generatedAt?: string };
    expect(json.summary).toBe("Solid squad performance.");
    expect(json.generatedAt).toBeDefined();

    expect(anthropicCreateMock).toHaveBeenCalledTimes(1);
    const call = anthropicCreateMock.mock.calls[0]![0] as { system: string; messages: { content: string }[] };
    expect(call.system).toContain("expert cricket performance analyst");
    expect(call.messages[0]!.content).toContain("2024 season");
    expect(call.messages[0]!.content).toContain("John Smith");
    expect(call.messages[0]!.content).toContain("Jane Doe");
  });

  it("returns 502 if Anthropic call fails", async () => {
    const clubId = "11111111-1111-1111-1111-111111111111";
    getAuthUserMock.mockResolvedValueOnce({ id: "coach-1", email: "c@test.com", role: "COACH" });
    clubFindFirstMock.mockResolvedValueOnce({ id: clubId });
    statsFindManyMock.mockResolvedValueOnce(mockStatsRows);
    anthropicCreateMock.mockRejectedValueOnce(new Error("API unavailable"));

    const res = await POST(
      new Request("http://localhost/api/coach/play-cricket/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId, season: "2024" }),
      }) as never
    );
    expect(res.status).toBe(502);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("Analysis service unavailable");
  });

  it("does not write to the database (only findMany, no create/update)", async () => {
    const clubId = "11111111-1111-1111-1111-111111111111";
    getAuthUserMock.mockResolvedValueOnce({ id: "coach-1", email: "c@test.com", role: "COACH" });
    clubFindFirstMock.mockResolvedValueOnce({ id: clubId });
    statsFindManyMock.mockResolvedValueOnce(mockStatsRows);
    anthropicCreateMock.mockResolvedValueOnce({
      content: [{ type: "text", text: JSON.stringify({ summary: "Ok", improving: [], declining: [], standouts: [], insights: [], dataNote: "" }) }],
    });

    await POST(
      new Request("http://localhost/api/coach/play-cricket/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId, season: "2024" }),
      }) as never
    );

    expect(statsFindManyMock).toHaveBeenCalledTimes(1);
    expect(clubFindFirstMock).toHaveBeenCalledTimes(1);
    expect(anthropicCreateMock).toHaveBeenCalledTimes(1);
  });
});
