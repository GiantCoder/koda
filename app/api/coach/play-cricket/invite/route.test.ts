import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";

const getAuthUserMock = vi.fn();
const parseRequestBodyMock = vi.fn();

function postInviteRequest(body: { importId: string }) {
  parseRequestBodyMock.mockResolvedValueOnce(body);
  return new Request("http://localhost/api/coach/play-cricket/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const importFindUniqueMock = vi.fn();
const inviteTokenUpsertMock = vi.fn();
const importUpdateMock = vi.fn();

vi.mock("@/lib/get-auth-user", () => ({
  getAuthUser: (...args: unknown[]) => getAuthUserMock(...args),
}));

vi.mock("@/lib/parse-request-body", () => ({
  parseRequestBody: (...args: unknown[]) => parseRequestBodyMock(...args),
}));

vi.mock("@/prisma/client", () => ({
  prisma: {
    playCricketImport: {
      findUnique: (...args: unknown[]) => importFindUniqueMock(...args),
      update: (...args: unknown[]) => importUpdateMock(...args),
    },
    playCricketInviteToken: {
      upsert: (...args: unknown[]) => inviteTokenUpsertMock(...args),
    },
  },
}));

let POST: (req: Request) => Promise<Response>;

describe("POST /api/coach/play-cricket/invite", () => {
  beforeAll(async () => {
    const route = await import("./route");
    POST = route.POST;
  }, 30000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 for non-COACH", async () => {
    getAuthUserMock.mockResolvedValueOnce({ id: "u1", role: "PLAYER" });
    const res = await POST(postInviteRequest({ importId: "11111111-1111-1111-1111-111111111111" }) as never);
    expect(res.status).toBe(403);
    expect(importFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 400 if import not found or wrong coach", async () => {
    getAuthUserMock.mockResolvedValueOnce({ id: "coach-1", role: "COACH" });
    importFindUniqueMock.mockResolvedValueOnce(null);
    const res = await POST(postInviteRequest({ importId: "11111111-1111-1111-1111-111111111111" }) as never);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toContain("not found");
  });

  it("returns 400 if status is already LINKED", async () => {
    const importId = "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee";
    getAuthUserMock.mockResolvedValueOnce({ id: "coach-1", role: "COACH" });
    importFindUniqueMock.mockResolvedValueOnce({
      id: importId,
      coachId: "coach-1",
      status: "LINKED",
    });
    const res = await POST(postInviteRequest({ importId }) as never);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toContain("already linked");
  });

  it("creates invite token and sets status to INVITED", async () => {
    const importId = "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee";
    getAuthUserMock.mockResolvedValueOnce({ id: "coach-1", role: "COACH" });
    importFindUniqueMock.mockResolvedValueOnce({
      id: importId,
      coachId: "coach-1",
      status: "PENDING",
    });
    inviteTokenUpsertMock.mockResolvedValueOnce({});
    importUpdateMock.mockResolvedValueOnce({});

    const res = await POST(postInviteRequest({ importId }) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { success?: boolean; inviteUrl?: string; expiresAt?: string };
    expect(json.success).toBe(true);
    expect(json.inviteUrl).toContain("/register?invite=");
    expect(inviteTokenUpsertMock).toHaveBeenCalled();
    expect(importUpdateMock).toHaveBeenCalledWith({
      where: { id: importId },
      data: expect.objectContaining({
        status: "INVITED",
        invitedAt: expect.any(Date),
      }),
    });
  });
});
