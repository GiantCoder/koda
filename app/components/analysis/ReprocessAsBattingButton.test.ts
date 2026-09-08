import { describe, expect, it } from "vitest";
import {
  shouldOfferReprocessAsBatting,
  shouldOfferReprocessAsBowling,
} from "./ReprocessActivityButton";

describe("shouldOfferReprocessAsBatting", () => {
  it("offers for bowling analyses", () => {
    expect(shouldOfferReprocessAsBatting({ activityType: "BOWLING" })).toBe(true);
  });

  it("offers when pose overlay reports masked bowler", () => {
    expect(
      shouldOfferReprocessAsBatting({
        activityType: "BATTING",
        overlayStatusText:
          "Pose overlay unavailable — foreground coach/bowler was masked; distant batter too small to track.",
      })
    ).toBe(true);
  });

  it("offers when tip text mentions constrained bowler pose tracking", () => {
    expect(
      shouldOfferReprocessAsBatting({
        activityType: "BATTING",
        tipTexts: [
          "The analysis is heavily constrained as pose tracking focused on the bowler, making detailed assessment of the batter's mechanics impossible.",
        ],
      })
    ).toBe(true);
  });

  it("does not offer for a healthy batting result", () => {
    expect(
      shouldOfferReprocessAsBatting({
        activityType: "BATTING",
        overlayStatusText: "Pose overlay: 22 frames",
        tipTexts: ["Strong front-foot transfer through the drive."],
      })
    ).toBe(false);
  });
});

describe("shouldOfferReprocessAsBowling", () => {
  it("offers for batting analyses (bowling clip mis-routed as batting)", () => {
    expect(shouldOfferReprocessAsBowling({ activityType: "BATTING" })).toBe(true);
  });

  it("does not offer for bowling analyses", () => {
    expect(shouldOfferReprocessAsBowling({ activityType: "BOWLING" })).toBe(false);
  });
});
