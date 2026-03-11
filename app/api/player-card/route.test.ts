import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";

const getAuthUserMock = vi.fn();
const findUniqueCardMock = vi.fn();
const findManyAnalysisMock = vi.fn();
const findUniqueUserMock = vi.fn();
const upsertCardMock = vi.fn();

vi.mock("@/lib/get-auth-user", () => ({
  getAuthUser: getAuthUserMock,
}));

vi.mock("@/src/lib/storage", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://example.com/signed"),
}));

vi.mock("@/prisma/client", () => ({
  prisma: {
    user: { findUnique: findUniqueUserMock },
    analysis: { findMany: findManyAnalysisMock },
    playerCard: {
      findUnique: findUniqueCardMock,
      upsert: upsertCardMock,
    },
  },
}));

let GET: (req: Request) => Promise<Response>;
let PUT: (req: Request) => Promise<Response>;

describe("player card API route", () => {
  beforeAll(async () => {
    const route = await import("./route");
    GET = route.GET;
    PUT = route.PUT;
  }, 30000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 401 when unauthenticated", { timeout: 15000 }, async () => {
    getAuthUserMock.mockResolvedValueOnce(null);
    const response = await GET(new Request("http://localhost/api/player-card") as never);
    expect(response.status).toBe(401);
  });

  it("GET returns derived card when no existing card", { timeout: 15000 }, async () => {
    getAuthUserMock.mockResolvedValueOnce({
      id: "2298d34b-321a-4200-af3e-0159dd1594ec",
      email: "player@test.com",
      role: "PLAYER",
    });
    findUniqueCardMock.mockResolvedValueOnce(null);
    findUniqueUserMock.mockResolvedValueOnce({
      displayName: "Alex",
      firstName: "Alex",
      lastName: "Johnson",
      email: "player@test.com",
    });
    findManyAnalysisMock.mockResolvedValueOnce([
      {
        scoreBacklift: 80,
        scoreHeadPosition: 78,
        scoreBalance: 82,
        scoreWeightTransfer: 71,
        scoreTiming: 74,
        scoreShotSelection: 69,
        scoreFootwork: 76,
        scoreFollowThrough: 67,
        gradeOverall: 73,
      },
    ]);

    const response = await GET(new Request("http://localhost/api/player-card") as never);
    const json = (await response.json()) as { id: string | null; overall: number; tier: string };

    expect(response.status).toBe(200);
    expect(json.id).toBeNull();
    expect(json.tier).toBe("SILVER");
    expect(json.overall).toBeGreaterThan(0);
  });

  it("PUT returns 200 and saved card for valid payload", { timeout: 15000 }, async () => {
    getAuthUserMock.mockResolvedValueOnce({
      id: "2298d34b-321a-4200-af3e-0159dd1594ec",
      email: "player@test.com",
      role: "PLAYER",
    });
    upsertCardMock.mockResolvedValueOnce({
      id: "card_1",
      userId: "2298d34b-321a-4200-af3e-0159dd1594ec",
      displayName: "ALEX",
      tier: "GOLD",
      role: "BAT",
      sportIcon: "BAT_ICON",
      statTec: 80,
      statPow: 81,
      statTim: 82,
      statCon: 83,
      statPac: 84,
      statFie: 85,
      profilePhotoUrl: null,
      backgroundUrl: null,
      backgroundMode: "DEFAULT",
    });

    const request = new Request("http://localhost/api/player-card", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: "ALEX",
        tier: "GOLD",
        role: "BAT",
        sportIcon: "BAT_ICON",
        statTec: 80,
        statPow: 81,
        statTim: 82,
        statCon: 83,
        statPac: 84,
        statFie: 85,
        profilePhotoUrl: null,
        backgroundUrl: null,
        backgroundMode: "DEFAULT",
      }),
    });

    const response = await PUT(request as never);
    const json = (await response.json()) as { userId: string; overall: number };
    expect(response.status).toBe(200);
    expect(json.userId).toBe("2298d34b-321a-4200-af3e-0159dd1594ec");
    expect(json.overall).toBe(83);
  });

  it("PUT returns 400 for invalid payload", { timeout: 15000 }, async () => {
    getAuthUserMock.mockResolvedValueOnce({
      id: "2298d34b-321a-4200-af3e-0159dd1594ec",
      email: "player@test.com",
      role: "PLAYER",
    });

    const request = new Request("http://localhost/api/player-card", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: "",
        tier: "WOOD",
      }),
    });

    const response = await PUT(request as never);
    const json = (await response.json()) as { details?: unknown };
    expect(response.status).toBe(400);
    expect(json.details).toBeDefined();
  });
});
