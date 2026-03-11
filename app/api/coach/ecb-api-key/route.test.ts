import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";

const getAuthUserMock = vi.fn();
const userFindUniqueMock = vi.fn();
const userUpdateMock = vi.fn();
const encryptApiKeyMock = vi.fn();
const decryptApiKeyMock = vi.fn();
const maskApiKeyMock = vi.fn();

vi.mock("@/lib/get-auth-user", () => ({
  getAuthUser: getAuthUserMock,
}));

vi.mock("@/lib/encrypt", () => ({
  encryptApiKey: (...args: unknown[]) => encryptApiKeyMock(...args),
  decryptApiKey: (...args: unknown[]) => decryptApiKeyMock(...args),
  maskApiKey: (...args: unknown[]) => maskApiKeyMock(...args),
}));

vi.mock("@/prisma/client", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => userFindUniqueMock(...args),
      update: (...args: unknown[]) => userUpdateMock(...args),
    },
  },
}));

let GET: (req: Request) => Promise<Response>;
let POST: (req: Request) => Promise<Response>;
let DELETE: (req: Request) => Promise<Response>;

describe("GET /api/coach/ecb-api-key", () => {
  beforeAll(async () => {
    const route = await import("./route");
    GET = route.GET;
    POST = route.POST;
    DELETE = route.DELETE;
  }, 30000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    getAuthUserMock.mockResolvedValueOnce(null);
    const res = await GET(new Request("http://localhost/api/coach/ecb-api-key") as never);
    expect(res.status).toBe(401);
  });

  it("returns 403 for PLAYER role", async () => {
    getAuthUserMock.mockResolvedValueOnce({
      id: "user-1",
      email: "p@test.com",
      role: "PLAYER",
    });
    const res = await GET(new Request("http://localhost/api/coach/ecb-api-key") as never);
    expect(res.status).toBe(403);
  });

  it("returns hasKey false when no key fields present", async () => {
    getAuthUserMock.mockResolvedValueOnce({
      id: "coach-1",
      email: "c@test.com",
      role: "COACH",
    });
    userFindUniqueMock.mockResolvedValueOnce({
      ecbApiKeyEncrypted: null,
      ecbApiKeyIv: null,
      ecbApiKeyTag: null,
      ecbApiKeyVerifiedAt: null,
    });
    const res = await GET(new Request("http://localhost/api/coach/ecb-api-key") as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { hasKey: boolean; maskedKey: string | null; verifiedAt: string | null };
    expect(json.hasKey).toBe(false);
    expect(json.maskedKey).toBeNull();
    expect(json.verifiedAt).toBeNull();
  });

  it("returns masked key and verifiedAt when key exists", async () => {
    getAuthUserMock.mockResolvedValueOnce({
      id: "coach-1",
      email: "c@test.com",
      role: "COACH",
    });
    userFindUniqueMock.mockResolvedValueOnce({
      ecbApiKeyEncrypted: "abc",
      ecbApiKeyIv: "iv",
      ecbApiKeyTag: "tag",
      ecbApiKeyVerifiedAt: new Date("2026-03-11T14:32:00Z"),
    });
    decryptApiKeyMock.mockReturnValueOnce("plain-secret-key");
    maskApiKeyMock.mockReturnValueOnce("••••••••key1");
    const res = await GET(new Request("http://localhost/api/coach/ecb-api-key") as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { hasKey: boolean; maskedKey: string | null; verifiedAt: string | null };
    expect(json.hasKey).toBe(true);
    expect(json.maskedKey).toBe("••••••••key1");
    expect(json.verifiedAt).toBe("2026-03-11T14:32:00.000Z");
  });
});

describe("POST /api/coach/ecb-api-key", () => {
  beforeAll(async () => {
    const route = await import("./route");
    POST = route.POST;
  }, 30000);

  beforeEach(() => {
    vi.clearAllMocks();
    encryptApiKeyMock.mockReturnValue({ ciphertext: "ct", iv: "iv", tag: "tag" });
    maskApiKeyMock.mockReturnValue("••••••••ab12");
    userUpdateMock.mockResolvedValue(undefined);
  });

  it("returns 401 when unauthenticated", async () => {
    getAuthUserMock.mockResolvedValueOnce(null);
    const res = await POST(
      new Request("http://localhost/api/coach/ecb-api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: "a-long-enough-key" }),
      }) as never
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for PLAYER role", async () => {
    getAuthUserMock.mockResolvedValueOnce({
      id: "user-1",
      email: "p@test.com",
      role: "PLAYER",
    });
    const res = await POST(
      new Request("http://localhost/api/coach/ecb-api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: "a-long-enough-key" }),
      }) as never
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid body (key too short)", async () => {
    getAuthUserMock.mockResolvedValueOnce({
      id: "coach-1",
      email: "c@test.com",
      role: "COACH",
    });
    const res = await POST(
      new Request("http://localhost/api/coach/ecb-api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: "short" }),
      }) as never
    );
    expect(res.status).toBe(400);
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it("saves encrypted fields and clears verifiedAt", async () => {
    getAuthUserMock.mockResolvedValueOnce({
      id: "coach-1",
      email: "c@test.com",
      role: "COACH",
    });
    const res = await POST(
      new Request("http://localhost/api/coach/ecb-api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: "my-ecb-api-key-12345" }),
      }) as never
    );
    expect(res.status).toBe(200);
    expect(encryptApiKeyMock).toHaveBeenCalledWith("my-ecb-api-key-12345");
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: "coach-1" },
      data: {
        ecbApiKeyEncrypted: "ct",
        ecbApiKeyIv: "iv",
        ecbApiKeyTag: "tag",
        ecbApiKeyVerifiedAt: null,
      },
    });
    const json = (await res.json()) as { success: boolean; maskedKey: string };
    expect(json.success).toBe(true);
    expect(json.maskedKey).toBe("••••••••ab12");
  });
});

describe("DELETE /api/coach/ecb-api-key", () => {
  beforeAll(async () => {
    const route = await import("./route");
    DELETE = route.DELETE;
  }, 30000);

  beforeEach(() => {
    vi.clearAllMocks();
    userUpdateMock.mockResolvedValue(undefined);
  });

  it("returns 401 when unauthenticated", async () => {
    getAuthUserMock.mockResolvedValueOnce(null);
    const res = await DELETE(new Request("http://localhost/api/coach/ecb-api-key", { method: "DELETE" }) as never);
    expect(res.status).toBe(401);
  });

  it("returns 403 for PLAYER role", async () => {
    getAuthUserMock.mockResolvedValueOnce({
      id: "user-1",
      email: "p@test.com",
      role: "PLAYER",
    });
    const res = await DELETE(new Request("http://localhost/api/coach/ecb-api-key", { method: "DELETE" }) as never);
    expect(res.status).toBe(403);
  });

  it("clears all three key fields", async () => {
    getAuthUserMock.mockResolvedValueOnce({
      id: "coach-1",
      email: "c@test.com",
      role: "COACH",
    });
    const res = await DELETE(new Request("http://localhost/api/coach/ecb-api-key", { method: "DELETE" }) as never);
    expect(res.status).toBe(200);
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: "coach-1" },
      data: {
        ecbApiKeyEncrypted: null,
        ecbApiKeyIv: null,
        ecbApiKeyTag: null,
        ecbApiKeyVerifiedAt: null,
      },
    });
  });
});
