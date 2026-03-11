import { describe, expect, it, vi, beforeAll } from "vitest";

const findUniqueMock = vi.fn();
const createMock = vi.fn();

vi.mock("@/src/lib/redis", () => ({
  redis: { set: vi.fn().mockResolvedValue(undefined) },
}));

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

let POST: (req: Request) => Promise<Response>;

describe("POST /api/auth/register", () => {
  beforeAll(async () => {
    const route = await import("./route");
    POST = route.POST;
  }, 30000);

  it("returns 409 when email exists", { timeout: 15000 }, async () => {
    findUniqueMock.mockResolvedValueOnce({ id: "existing-user" });

    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "existing@test.com",
        password: "Test1234!",
        displayName: "Existing User",
        role: "PLAYER",
        agreedToTerms: true,
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
