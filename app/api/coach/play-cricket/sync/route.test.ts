import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";

const getAuthUserMock = vi.fn();
const decryptApiKeyMock = vi.fn();
const inngestSendMock = vi.fn();
const syncLogCreateMock = vi.fn();

vi.mock("@/lib/get-auth-user", () => ({
  getAuthUser: (...args: unknown[]) => getAuthUserMock(...args),
}));

vi.mock("@/lib/encrypt", () => ({
  decryptApiKey: (...args: unknown[]) => decryptApiKeyMock(...args),
}));

vi.mock("@/inngest/client", () => ({
  inngest: {
    send: (...args: unknown[]) => inngestSendMock(...args),
  },
}));

const clubFindFirstMock = vi.fn();
const userFindUniqueMock = vi.fn();

vi.mock("@/prisma/client", () => ({
  prisma: {
    club: { findFirst: (...args: unknown[]) => clubFindFirstMock(...args) },
    user: { findUnique: (...args: unknown[]) => userFindUniqueMock(...args) },
    playCricketSyncLog: { create: (...args: unknown[]) => syncLogCreateMock(...args) },
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
    expect(syncLogCreateMock).not.toHaveBeenCalled();
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
    expect(syncLogCreateMock).not.toHaveBeenCalled();
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
    expect(inngestSendMock).not.toHaveBeenCalled();
  });

  it("creates PENDING sync log and dispatches Inngest event", async () => {
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
    syncLogCreateMock.mockResolvedValueOnce({ id: "log-1" });
    inngestSendMock.mockResolvedValueOnce(undefined);

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
      syncLogId?: string;
      message?: string;
    };
    expect(json.success).toBe(true);
    expect(json.syncLogId).toBe("log-1");
    expect(syncLogCreateMock).toHaveBeenCalledWith({
      data: {
        coachId: "coach-1",
        clubId,
        season: "2024",
        status: "PENDING",
        startedAt: expect.any(Date),
      },
    });
    expect(inngestSendMock).toHaveBeenCalledWith({
      name: "play-cricket/sync.requested",
      data: {
        coachId: "coach-1",
        clubId,
        season: "2024",
        requestedAt: expect.any(String),
      },
    });
  });
});
