import { describe, expect, it, vi } from "vitest";

const findUniqueMock = vi.fn();
const updateMock = vi.fn();
const verifyPasswordMock = vi.fn();

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

describe("POST /api/auth/login", () => {
  it("returns 401 on wrong password", async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: "u1",
      email: "coach@test.com",
      passwordHash: "hash",
      role: "COACH",
      isActive: true,
      consentRecord: null,
    });
    verifyPasswordMock.mockResolvedValueOnce(false);

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "coach@test.com", password: "wrong" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request as never);
    expect(response.status).toBe(401);
  });
});
