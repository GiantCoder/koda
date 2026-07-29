import { beforeEach, describe, expect, it, vi } from "vitest";

const uploadToStorageMock = vi.fn();

vi.mock("@/src/lib/storage", () => ({
  uploadToStorage: (...args: unknown[]) => uploadToStorageMock(...args),
}));

import { persistAnalysisFrames } from "./frame-persistence";

describe("persistAnalysisFrames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadToStorageMock.mockResolvedValue(undefined);
  });

  it("uploads each frame and returns a correctly shaped manifest", async () => {
    const frames = ["Zm9v", "YmFy", "YmF6"]; // foo, bar, baz
    const analysisId = "analysis-abc";

    const manifest = await persistAnalysisFrames(analysisId, frames, 8);

    expect(manifest).toHaveLength(3);
    expect(uploadToStorageMock).toHaveBeenCalledTimes(3);

    expect(manifest[0]).toEqual({
      index: 0,
      timestampMs: 0,
      storageKey: "frames/analysis-abc/frame-0000.jpg",
    });
    expect(manifest[1]).toEqual({
      index: 1,
      timestampMs: 125,
      storageKey: "frames/analysis-abc/frame-0001.jpg",
    });
    expect(manifest[2]).toEqual({
      index: 2,
      timestampMs: 250,
      storageKey: "frames/analysis-abc/frame-0002.jpg",
    });

    expect(uploadToStorageMock).toHaveBeenNthCalledWith(
      1,
      "frames/analysis-abc/frame-0000.jpg",
      Buffer.from("foo"),
      "image/jpeg"
    );
    expect(uploadToStorageMock).toHaveBeenNthCalledWith(
      2,
      "frames/analysis-abc/frame-0001.jpg",
      Buffer.from("bar"),
      "image/jpeg"
    );
  });

  it("computes timestamps from sampleFps correctly", async () => {
    const frames = ["YQ==", "Yg==", "Yw==", "ZA=="]; // a,b,c,d
    const manifest = await persistAnalysisFrames("id-1", frames, 10);

    expect(manifest.map((e) => e.timestampMs)).toEqual([0, 100, 200, 300]);
  });

  it("pads frame indices to 4 digits in storage keys", async () => {
    const frames = Array.from({ length: 12 }, (_, i) => Buffer.from(String(i)).toString("base64"));
    const manifest = await persistAnalysisFrames("x", frames, 4);

    expect(manifest[9].storageKey).toBe("frames/x/frame-0009.jpg");
    expect(manifest[10].storageKey).toBe("frames/x/frame-0010.jpg");
    expect(manifest[11].storageKey).toBe("frames/x/frame-0011.jpg");
    expect(manifest[11].timestampMs).toBe(Math.round((11 / 4) * 1000));
  });

  it("returns an empty manifest when there are no frames", async () => {
    const manifest = await persistAnalysisFrames("empty", [], 8);
    expect(manifest).toEqual([]);
    expect(uploadToStorageMock).not.toHaveBeenCalled();
  });
});
