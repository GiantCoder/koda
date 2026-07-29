import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getAuthUserMock = vi.fn();
const analysisFindUniqueMock = vi.fn();
const canViewUserMock = vi.fn();
const downloadFromStorageMock = vi.fn();

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

vi.mock("@/src/lib/storage", () => ({
  downloadFromStorage: (...args: unknown[]) => downloadFromStorageMock(...args),
}));

const ANALYSIS_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

const sampleManifest = [
  { index: 0, timestampMs: 0, storageKey: `frames/${ANALYSIS_ID}/frame-0000.jpg` },
  { index: 1, timestampMs: 125, storageKey: `frames/${ANALYSIS_ID}/frame-0001.jpg` },
];

let GET: (
  req: NextRequest,
  ctx: { params: Promise<{ id: string; index: string }> }
) => Promise<Response>;

describe("GET /api/analysis/[id]/frames/[index]", () => {
  beforeAll(async () => {
    const route = await import("./route");
    GET = route.GET;
  }, 30000);

  beforeEach(() => {
    vi.clearAllMocks();
    canViewUserMock.mockReturnValue(true);
  });

  it("streams JPEG bytes for a valid frame index", async () => {
    getAuthUserMock.mockResolvedValueOnce({ id: "coach-1", role: "COACH" });
    analysisFindUniqueMock.mockResolvedValueOnce({
      id: ANALYSIS_ID,
      frameManifest: sampleManifest,
      video: { userId: "player-1" },
    });
    downloadFromStorageMock.mockResolvedValueOnce(Buffer.from("fake-jpeg"));

    const res = await GET(
      new NextRequest(`http://localhost/api/analysis/${ANALYSIS_ID}/frames/1`),
      { params: Promise.resolve({ id: ANALYSIS_ID, index: "1" }) }
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=3600");
    expect(downloadFromStorageMock).toHaveBeenCalledWith(
      `frames/${ANALYSIS_ID}/frame-0001.jpg`
    );
    const body = Buffer.from(await res.arrayBuffer());
    expect(body.toString()).toBe("fake-jpeg");
  });

  it("returns 404 for out-of-range frame index", async () => {
    getAuthUserMock.mockResolvedValueOnce({ id: "coach-1", role: "COACH" });
    analysisFindUniqueMock.mockResolvedValueOnce({
      id: ANALYSIS_ID,
      frameManifest: sampleManifest,
      video: { userId: "player-1" },
    });

    const res = await GET(
      new NextRequest(`http://localhost/api/analysis/${ANALYSIS_ID}/frames/99`),
      { params: Promise.resolve({ id: ANALYSIS_ID, index: "99" }) }
    );

    expect(res.status).toBe(404);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("Frame not found");
    expect(downloadFromStorageMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a malformed frame index", async () => {
    getAuthUserMock.mockResolvedValueOnce({ id: "coach-1", role: "COACH" });

    const res = await GET(
      new NextRequest(`http://localhost/api/analysis/${ANALYSIS_ID}/frames/abc`),
      { params: Promise.resolve({ id: ANALYSIS_ID, index: "abc" }) }
    );

    expect(res.status).toBe(400);
  });

  it("returns 404 when frameManifest is null", async () => {
    getAuthUserMock.mockResolvedValueOnce({ id: "coach-1", role: "COACH" });
    analysisFindUniqueMock.mockResolvedValueOnce({
      id: ANALYSIS_ID,
      frameManifest: null,
      video: { userId: "player-1" },
    });

    const res = await GET(
      new NextRequest(`http://localhost/api/analysis/${ANALYSIS_ID}/frames/0`),
      { params: Promise.resolve({ id: ANALYSIS_ID, index: "0" }) }
    );

    expect(res.status).toBe(404);
  });

  it("returns 403 when canViewUser forbids access", async () => {
    getAuthUserMock.mockResolvedValueOnce({ id: "other", role: "PLAYER" });
    canViewUserMock.mockReturnValueOnce(false);
    analysisFindUniqueMock.mockResolvedValueOnce({
      id: ANALYSIS_ID,
      frameManifest: sampleManifest,
      video: { userId: "player-1" },
    });

    const res = await GET(
      new NextRequest(`http://localhost/api/analysis/${ANALYSIS_ID}/frames/0`),
      { params: Promise.resolve({ id: ANALYSIS_ID, index: "0" }) }
    );

    expect(res.status).toBe(403);
  });
});
