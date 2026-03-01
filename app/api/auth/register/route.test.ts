import { describe, expect, it, vi } from "vitest";

const findUniqueMock = vi.fn();
const createMock = vi.fn();

vi.mock("@/prisma/client", () => ({
  prisma: {
    user: {
      findUnique: findUniqueMock,
      create: createMock,
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed"),
  signJwt: vi.fn().mockResolvedValue("access-token"),
}));

describe("POST /api/auth/register", () => {
  it("returns 409 when email exists", async () => {
    findUniqueMock.mockResolvedValueOnce({ id: "existing-user" });

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "existing@test.com",
        password: "Test1234!",
        displayName: "Existing User",
        role: "PLAYER",
        privacyPreferences: {
          performanceAnalytics: true,
          marketingCommunications: false,
          coachParentComms: true,
        },
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request as never);
    expect(response.status).toBe(409);
  });
});
