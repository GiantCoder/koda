import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";

const getAuthUserMock = vi.fn();
const syncLogFindFirstMock = vi.fn();

vi.mock("@/lib/get-auth-user", () => ({
  getAuthUser: (...args: unknown[]) => getAuthUserMock(...args),
}));

vi.mock("@/prisma/client", () => ({
  prisma: {
    playCricketSyncLog: { findFirst: (...args: unknown[]) => syncLogFindFirstMock(...args) },
  },
}));

let GET: (req: Request) => Promise<Response>;

describe("GET /api/coach/play-cricket/sync/status", () => {
  beforeAll(async () => {
    const route = await import("./route");
    GET = route.GET;
  }, 30000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    getAuthUserMock.mockResolvedValueOnce(null);
    const res = await GET(
      new Request("http://localhost/api/coach/play-cricket/sync/status?clubId=11111111-1111-1111-1111-111111111111") as never
    );
    expect(res.status).toBe(401);
    expect(syncLogFindFirstMock).not.toHaveBeenCalled();
  });

  it("returns 400 when clubId missing", async () => {
    getAuthUserMock.mockResolvedValueOnce({ id: "c1", role: "COACH" });
    const res = await GET(new Request("http://localhost/api/coach/play-cricket/sync/status") as never);
    expect(res.status).toBe(400);
  });

  it("returns latest sync log for club+season", async () => {
    getAuthUserMock.mockResolvedValueOnce({ id: "c1", role: "COACH" });
    syncLogFindFirstMock.mockResolvedValueOnce({
      status: "COMPLETE",
      playersUpserted: 10,
      statsRowsUpserted: 15,
      matchesSynced: 5,
      startedAt: new Date("2024-01-01"),
      completedAt: new Date("2024-01-01T00:05:00Z"),
      errorMessage: null,
    });
    const res = await GET(
      new Request("http://localhost/api/coach/play-cricket/sync/status?clubId=11111111-1111-1111-1111-111111111111&season=2024") as never
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("COMPLETE");
    expect(json.playersUpserted).toBe(10);
    expect(json.matchesSynced).toBe(5);
    expect(syncLogFindFirstMock).toHaveBeenCalledWith({
      where: { coachId: "c1", clubId: "11111111-1111-1111-1111-111111111111", season: "2024" },
      orderBy: { startedAt: "desc" },
    });
  });

  it("returns null status when no log exists", async () => {
    getAuthUserMock.mockResolvedValueOnce({ id: "c1", role: "COACH" });
    syncLogFindFirstMock.mockResolvedValueOnce(null);
    const res = await GET(
      new Request("http://localhost/api/coach/play-cricket/sync/status?clubId=11111111-1111-1111-1111-111111111111") as never
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBeNull();
    expect(json.playersUpserted).toBe(0);
  });
});
