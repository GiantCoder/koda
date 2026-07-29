import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getAuthUserMock = vi.fn();
const analysisFindUniqueMock = vi.fn();
const canViewUserMock = vi.fn();

vi.mock("@/lib/get-auth-user", () => ({
  getAuthUser: getAuthUserMock,
}));

vi.mock("@/lib/rbac", () => ({
  canViewUser: (...args: unknown[]) => canViewUserMock(...args),
}));

vi.mock("@/prisma/client", () => ({
  prisma: {
    analysis: {
      findUnique: (...args: unknown[]) => analysisFindUniqueMock(...args),
    },
  },
}));

const ANALYSIS_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

const sampleManifest = [
  { index: 0, timestampMs: 0, storageKey: `frames/${ANALYSIS_ID}/frame-0000.jpg` },
  { index: 1, timestampMs: 125, storageKey: `frames/${ANALYSIS_ID}/frame-0001.jpg` },
];

let GET: (
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) => Promise<Response>;

describe("GET /api/analysis/[id]/frames", () => {
  beforeAll(async () => {
    const route = await import("./route");
    GET = route.GET;
  }, 30000);

  beforeEach(() => {
    vi.clearAllMocks();
    canViewUserMock.mockReturnValue(true);
  });

  it("returns manifest with per-frame URLs on happy path", async () => {
    getAuthUserMock.mockResolvedValueOnce({
      id: "coach-1",
      role: "COACH",
    });
    analysisFindUniqueMock.mockResolvedValueOnce({
      id: ANALYSIS_ID,
      frameManifest: sampleManifest,
      video: { userId: "player-1" },
    });

    const res = await GET(
      new NextRequest(`http://localhost/api/analysis/${ANALYSIS_ID}/frames`),
      { params: Promise.resolve({ id: ANALYSIS_ID }) }
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      analysisId: string;
      frames: { index: number; timestampMs: number; url: string }[];
    };
    expect(json.analysisId).toBe(ANALYSIS_ID);
    expect(json.frames).toEqual([
      {
        index: 0,
        timestampMs: 0,
        url: `/api/analysis/${ANALYSIS_ID}/frames/0`,
      },
      {
        index: 1,
        timestampMs: 125,
        url: `/api/analysis/${ANALYSIS_ID}/frames/1`,
      },
    ]);
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=60");
  });

  it("returns 404 when frameManifest is null", async () => {
    getAuthUserMock.mockResolvedValueOnce({ id: "coach-1", role: "COACH" });
    analysisFindUniqueMock.mockResolvedValueOnce({
      id: ANALYSIS_ID,
      frameManifest: null,
      video: { userId: "player-1" },
    });

    const res = await GET(
      new NextRequest(`http://localhost/api/analysis/${ANALYSIS_ID}/frames`),
      { params: Promise.resolve({ id: ANALYSIS_ID }) }
    );

    expect(res.status).toBe(404);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/unavailable/i);
  });

  it("returns 404 when analysis does not exist", async () => {
    getAuthUserMock.mockResolvedValueOnce({ id: "coach-1", role: "COACH" });
    analysisFindUniqueMock.mockResolvedValueOnce(null);

    const res = await GET(
      new NextRequest(`http://localhost/api/analysis/${ANALYSIS_ID}/frames`),
      { params: Promise.resolve({ id: ANALYSIS_ID }) }
    );

    expect(res.status).toBe(404);
  });

  it("returns 403 when canViewUser forbids access", async () => {
    getAuthUserMock.mockResolvedValueOnce({ id: "other-player", role: "PLAYER" });
    canViewUserMock.mockReturnValueOnce(false);
    analysisFindUniqueMock.mockResolvedValueOnce({
      id: ANALYSIS_ID,
      frameManifest: sampleManifest,
      video: { userId: "player-1" },
    });

    const res = await GET(
      new NextRequest(`http://localhost/api/analysis/${ANALYSIS_ID}/frames`),
      { params: Promise.resolve({ id: ANALYSIS_ID }) }
    );

    expect(res.status).toBe(403);
  });

  it("returns 400 for malformed analysis id", async () => {
    getAuthUserMock.mockResolvedValueOnce({ id: "coach-1", role: "COACH" });

    const res = await GET(
      new NextRequest("http://localhost/api/analysis/not-a-uuid/frames"),
      { params: Promise.resolve({ id: "not-a-uuid" }) }
    );

    expect(res.status).toBe(400);
  });
});
