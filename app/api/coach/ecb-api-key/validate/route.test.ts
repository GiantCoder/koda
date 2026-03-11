import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";

const getAuthUserMock = vi.fn();
const userFindUniqueMock = vi.fn();
const userUpdateMock = vi.fn();
const decryptApiKeyMock = vi.fn();

let fetchMock: ReturnType<typeof vi.fn>;

vi.mock("@/lib/get-auth-user", () => ({
  getAuthUser: getAuthUserMock,
}));

vi.mock("@/lib/encrypt", () => ({
  decryptApiKey: (...args: unknown[]) => decryptApiKeyMock(...args),
}));

vi.mock("@/prisma/client", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => userFindUniqueMock(...args),
      update: (...args: unknown[]) => userUpdateMock(...args),
    },
  },
}));

beforeAll(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

let POST: (req: Request) => Promise<Response>;

describe("POST /api/coach/ecb-api-key/validate", () => {
  beforeAll(async () => {
    const route = await import("./route");
    POST = route.POST;
  }, 30000);

  beforeEach(() => {
    vi.clearAllMocks();
    userUpdateMock.mockResolvedValue(undefined);
  });

  it("returns 401 when unauthenticated", async () => {
    getAuthUserMock.mockResolvedValueOnce(null);
    const res = await POST(new Request("http://localhost/api/coach/ecb-api-key/validate", { method: "POST" }) as never);
    expect(res.status).toBe(401);
  });

  it("returns 403 for PLAYER role", async () => {
    getAuthUserMock.mockResolvedValueOnce({
      id: "user-1",
      email: "p@test.com",
      role: "PLAYER",
    });
    const res = await POST(new Request("http://localhost/api/coach/ecb-api-key/validate", { method: "POST" }) as never);
    expect(res.status).toBe(403);
  });

  it("returns 400 when no key is saved", async () => {
    getAuthUserMock.mockResolvedValueOnce({
      id: "coach-1",
      email: "c@test.com",
      role: "COACH",
    });
    userFindUniqueMock.mockResolvedValueOnce({
      ecbApiKeyEncrypted: null,
      ecbApiKeyIv: null,
      ecbApiKeyTag: null,
    });
    const res = await POST(new Request("http://localhost/api/coach/ecb-api-key/validate", { method: "POST" }) as never);
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns valid true and updates ecbApiKeyVerifiedAt when Play-Cricket returns 200", async () => {
    getAuthUserMock.mockResolvedValueOnce({
      id: "coach-1",
      email: "c@test.com",
      role: "COACH",
    });
    userFindUniqueMock
      .mockResolvedValueOnce({
        ecbApiKeyEncrypted: "ct",
        ecbApiKeyIv: "iv",
        ecbApiKeyTag: "tag",
      })
      .mockResolvedValue(undefined);
    decryptApiKeyMock.mockReturnValueOnce("api-token");
    fetchMock.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: () => Promise.resolve({ clubs: [] }),
    });
    const res = await POST(new Request("http://localhost/api/coach/ecb-api-key/validate", { method: "POST" }) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { valid: boolean; verifiedAt?: string };
    expect(json.valid).toBe(true);
    expect(json.verifiedAt).toBeDefined();
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: "coach-1" },
      data: { ecbApiKeyVerifiedAt: expect.any(Date) },
    });
  });

  it('returns valid false reason invalid_key when Play-Cricket returns 401', async () => {
    getAuthUserMock.mockResolvedValueOnce({
      id: "coach-1",
      email: "c@test.com",
      role: "COACH",
    });
    userFindUniqueMock.mockResolvedValueOnce({
      ecbApiKeyEncrypted: "ct",
      ecbApiKeyIv: "iv",
      ecbApiKeyTag: "tag",
    });
    decryptApiKeyMock.mockReturnValueOnce("bad-token");
    fetchMock.mockResolvedValueOnce({ status: 401, ok: false });
    const res = await POST(new Request("http://localhost/api/coach/ecb-api-key/validate", { method: "POST" }) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { valid: boolean; reason: string };
    expect(json.valid).toBe(false);
    expect(json.reason).toBe("invalid_key");
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it('returns valid false reason unreachable when fetch throws', async () => {
    getAuthUserMock.mockResolvedValueOnce({
      id: "coach-1",
      email: "c@test.com",
      role: "COACH",
    });
    userFindUniqueMock.mockResolvedValueOnce({
      ecbApiKeyEncrypted: "ct",
      ecbApiKeyIv: "iv",
      ecbApiKeyTag: "tag",
    });
    decryptApiKeyMock.mockReturnValueOnce("api-token");
    fetchMock.mockRejectedValueOnce(new Error("Network error"));
    const res = await POST(new Request("http://localhost/api/coach/ecb-api-key/validate", { method: "POST" }) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { valid: boolean; reason: string };
    expect(json.valid).toBe(false);
    expect(json.reason).toBe("unreachable");
    expect(userUpdateMock).not.toHaveBeenCalled();
  });
});
