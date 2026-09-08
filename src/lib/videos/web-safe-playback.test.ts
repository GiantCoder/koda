import { describe, expect, it } from "vitest";
import { webSafePlaybackKey } from "./web-safe-playback";

describe("webSafePlaybackKey", () => {
  it("appends .websafe.mp4 to the original storage path", () => {
    expect(webSafePlaybackKey("uploads/u1/v1/clip.mp4")).toBe(
      "uploads/u1/v1/clip.mp4.websafe.mp4"
    );
  });

  it("is idempotent for already-safe keys", () => {
    const key = "uploads/u1/v1/clip.mp4.websafe.mp4";
    expect(webSafePlaybackKey(key)).toBe(key);
  });
});
