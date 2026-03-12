import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";

const findUniqueMock = vi.fn();

vi.mock("@/prisma/client", () => ({
  prisma: {
    playCricketInviteToken: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}));

let GET: (req: Request, context: { params: Promise<{ token: string }> }) => Promise<Response>;

describe("GET /api/auth/invite/[token]", () => {
  beforeAll(async () => {
    const route = await import("./route");
    GET = route.GET;
  }, 30000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 for unknown token", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const res = await GET(
      new Request("http://localhost/api/auth/invite/abc") as never,
      { params: Promise.resolve({ token: "abc" }) } as never
    );
    expect(res.status).toBe(404);
  });

  it("returns 410 when token already used", async () => {
    findUniqueMock.mockResolvedValueOnce({
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      import: { firstName: "John", lastName: "Smith", playCricketPersonId: "1", id: "imp-1" },
    });
    const res = await GET(
      new Request("http://localhost/api/auth/invite/abc") as never,
      { params: Promise.resolve({ token: "abc" }) } as never
    );
    expect(res.status).toBe(410);
  });

  it("returns 410 when token expired", async () => {
    findUniqueMock.mockResolvedValueOnce({
      usedAt: null,
      expiresAt: new Date(Date.now() - 86400000),
      import: { firstName: "John", lastName: "Smith", playCricketPersonId: "1", id: "imp-1" },
    });
    const res = await GET(
      new Request("http://localhost/api/auth/invite/abc") as never,
      { params: Promise.resolve({ token: "abc" }) } as never
    );
    expect(res.status).toBe(410);
  });

  it("returns pre-fill data for valid token", async () => {
    findUniqueMock.mockResolvedValueOnce({
      usedAt: null,
      expiresAt: new Date(Date.now() + 86400000),
      import: {
        firstName: "John",
        lastName: "Smith",
        playCricketPersonId: "123",
        id: "imp-1",
      },
    });
    const res = await GET(
      new Request("http://localhost/api/auth/invite/validtoken") as never,
      { params: Promise.resolve({ token: "validtoken" }) } as never
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.valid).toBe(true);
    expect(json.firstName).toBe("John");
    expect(json.lastName).toBe("Smith");
    expect(json.playCricketPersonId).toBe("123");
    expect(json.importId).toBe("imp-1");
  });
});
