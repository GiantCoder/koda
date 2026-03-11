import { describe, expect, it, vi, beforeAll } from "vitest";

const findUniqueMock = vi.fn();
const updateMock = vi.fn();
const verifyPasswordMock = vi.fn();

vi.mock("@/src/lib/redis", () => ({
  redis: { set: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/prisma/client", () => ({
  prisma: {
    user: {
      findUnique: findUniqueMock,
      update: updateMock,
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  verifyPassword: verifyPasswordMock,
  signJwt: vi.fn().mockResolvedValue("access-token"),
}));

let POST: (req: Request) => Promise<Response>;

describe("POST /api/auth/login", () => {
  beforeAll(async () => {
    const route = await import("./route");
    POST = route.POST;
  }, 30000);

  it("returns 401 on wrong password", { timeout: 15000 }, async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: "u1",
      email: "coach@test.com",
      passwordHash: "hash",
      role: "COACH",
      isActive: true,
      consentRecord: null,
    });
    verifyPasswordMock.mockResolvedValueOnce(false);

    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "coach@test.com", password: "wrong" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request as never);
    expect(response.status).toBe(401);
  });
});
