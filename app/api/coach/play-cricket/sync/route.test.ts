import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";

const getAuthUserMock = vi.fn();
const decryptApiKeyMock = vi.fn();
const playCricketClientMock = {
  getTeams: vi.fn(),
  getPlayerStats: vi.fn(),
};
const clubFindFirstMock = vi.fn();
const userFindUniqueMock = vi.fn();
const importUpsertMock = vi.fn();
const statsUpsertMock = vi.fn();

vi.mock("@/lib/get-auth-user", () => ({
  getAuthUser: (...args: unknown[]) => getAuthUserMock(...args),
}));

vi.mock("@/lib/encrypt", () => ({
  decryptApiKey: (...args: unknown[]) => decryptApiKeyMock(...args),
}));

vi.mock("@/lib/play-cricket/client", () => ({
  playCricketClient: playCricketClientMock,
}));

vi.mock("@/prisma/client", () => ({
  prisma: {
    club: { findFirst: (...args: unknown[]) => clubFindFirstMock(...args) },
    user: { findUnique: (...args: unknown[]) => userFindUniqueMock(...args) },
    playCricketImport: { upsert: (...args: unknown[]) => importUpsertMock(...args) },
    playCricketPlayerStats: { upsert: (...args: unknown[]) => statsUpsertMock(...args) },
  },
}));

let POST: (req: Request) => Promise<Response>;

describe("POST /api/coach/play-cricket/sync", () => {
  beforeAll(async () => {
    const route = await import("./route");
    POST = route.POST;
  }, 30000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    getAuthUserMock.mockResolvedValueOnce(null);
    const res = await POST(
      new Request("http://localhost/api/coach/play-cricket/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId: "11111111-1111-1111-1111-111111111111" }),
      }) as never
    );
    expect(res.status).toBe(401);
    expect(clubFindFirstMock).not.toHaveBeenCalled();
  });

  it("returns 403 for non-COACH", async () => {
    getAuthUserMock.mockResolvedValueOnce({
      id: "user-1",
      email: "p@test.com",
      role: "PLAYER",
    });
    const res = await POST(
      new Request("http://localhost/api/coach/play-cricket/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId: "11111111-1111-1111-1111-111111111111" }),
      }) as never
    );
    expect(res.status).toBe(403);
    expect(clubFindFirstMock).not.toHaveBeenCalled();
  });

  it("returns 404 if clubId does not belong to coach", async () => {
    getAuthUserMock.mockResolvedValueOnce({
      id: "coach-1",
      email: "c@test.com",
      role: "COACH",
    });
    clubFindFirstMock.mockResolvedValueOnce(null);
    const res = await POST(
      new Request("http://localhost/api/coach/play-cricket/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId: "11111111-1111-1111-1111-111111111111" }),
      }) as never
    );
    expect(res.status).toBe(404);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("Club not found");
    expect(decryptApiKeyMock).not.toHaveBeenCalled();
  });

  it("returns 400 if no API key saved", async () => {
    const clubId = "11111111-1111-1111-1111-111111111111";
    getAuthUserMock.mockResolvedValueOnce({
      id: "coach-1",
      email: "c@test.com",
      role: "COACH",
    });
    clubFindFirstMock.mockResolvedValueOnce({ id: clubId, playCricketId: "site-123" });
    userFindUniqueMock.mockResolvedValueOnce({
      ecbApiKeyEncrypted: null,
      ecbApiKeyIv: null,
      ecbApiKeyTag: null,
    });
    const res = await POST(
      new Request("http://localhost/api/coach/play-cricket/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId }),
      }) as never
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("no_api_key");
    expect(playCricketClientMock.getTeams).not.toHaveBeenCalled();
  });

  it("successfully syncs and upserts PlayCricketImport and PlayCricketPlayerStats", async () => {
    const clubId = "11111111-1111-1111-1111-111111111111";
    getAuthUserMock.mockResolvedValueOnce({
      id: "coach-1",
      email: "c@test.com",
      role: "COACH",
    });
    clubFindFirstMock.mockResolvedValueOnce({ id: clubId, playCricketId: "site-123" });
    userFindUniqueMock.mockResolvedValueOnce({
      ecbApiKeyEncrypted: "ct",
      ecbApiKeyIv: "iv",
      ecbApiKeyTag: "tag",
    });
    decryptApiKeyMock.mockReturnValueOnce("plain-token");
    playCricketClientMock.getTeams.mockResolvedValueOnce({
      ok: true,
      data: [{ id: 1, name: "1st XI", club_id: 1, club_name: "Test Club" }],
    });
    playCricketClientMock.getPlayerStats.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          id: 100,
          team_id: 1,
          first_name: "John",
          last_name: "Smith",
          batting_innings: 5,
          batting_not_outs: 1,
          batting_runs: 120,
          batting_highest: 45,
          batting_average: 30,
          batting_strike_rate: 85,
          batting_fifties: 1,
          batting_hundreds: 0,
          bowling_overs: 0,
          bowling_wickets: 0,
          bowling_runs: 0,
          bowling_average: null,
          bowling_economy: null,
          bowling_best_figures: null,
          bowling_five_wickets: 0,
          fielding_catches: 2,
          fielding_stumpings: 0,
          fielding_run_outs: 1,
          season: "2024",
          competition_type: "Limited Overs",
        },
      ],
    });
    importUpsertMock.mockResolvedValueOnce({ id: "import-1" });
    statsUpsertMock.mockResolvedValue(undefined);

    const res = await POST(
      new Request("http://localhost/api/coach/play-cricket/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId, season: "2024" }),
      }) as never
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      success?: boolean;
      season?: string;
      playersUpserted?: number;
      statsRowsUpserted?: number;
    };
    expect(json.success).toBe(true);
    expect(json.season).toBe("2024");
    expect(json.playersUpserted).toBe(1);
    expect(json.statsRowsUpserted).toBe(1);
    expect(importUpsertMock).toHaveBeenCalledTimes(1);
    expect(statsUpsertMock).toHaveBeenCalledTimes(1);
    expect(userFindUniqueMock).toHaveBeenCalledTimes(1);
  });

  it("does not modify User records (route only reads user for decryption)", async () => {
    const clubId = "11111111-1111-1111-1111-111111111111";
    getAuthUserMock.mockResolvedValueOnce({ id: "coach-1", email: "c@test.com", role: "COACH" });
    clubFindFirstMock.mockResolvedValueOnce({ id: clubId, playCricketId: "site-123" });
    userFindUniqueMock.mockResolvedValueOnce({
      ecbApiKeyEncrypted: "ct",
      ecbApiKeyIv: "iv",
      ecbApiKeyTag: "tag",
    });
    decryptApiKeyMock.mockReturnValueOnce("plain-token");
    playCricketClientMock.getTeams.mockResolvedValueOnce({ ok: true, data: [] });
    playCricketClientMock.getPlayerStats.mockResolvedValueOnce({ ok: true, data: [] });

    await POST(
      new Request("http://localhost/api/coach/play-cricket/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId }),
      }) as never
    );
    expect(userFindUniqueMock).toHaveBeenCalledTimes(1);
    expect(userFindUniqueMock).toHaveBeenCalledWith({
      where: { id: "coach-1" },
      select: {
        ecbApiKeyEncrypted: true,
        ecbApiKeyIv: true,
        ecbApiKeyTag: true,
      },
    });
  });
});
