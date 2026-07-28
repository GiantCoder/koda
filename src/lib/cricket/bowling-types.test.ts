import { describe, expect, it } from "vitest";
import {
  DELIVERY_TYPE_PROMPT_UNION,
  DELIVERY_TYPE_VALUES,
  formatDeliveryType,
  formatBowlingDeliveryLabel,
  isValidDeliveryType,
} from "./bowling-types";

describe("bowling-types", () => {
  it("includes every delivery type in the prompt union", () => {
    for (const value of DELIVERY_TYPE_VALUES) {
      expect(DELIVERY_TYPE_PROMPT_UNION.split("|")).toContain(value);
    }
  });

  it("round-trips labels via formatDeliveryType", () => {
    expect(formatDeliveryType("YORKER")).toBe("Yorker");
    expect(formatDeliveryType("GOOD_LENGTH")).toBe("Good Length");
    expect(formatDeliveryType("OFF_BREAK")).toBe("Off Break");
    expect(formatDeliveryType("UNKNOWN")).toBe("Unknown");
  });

  it("guards valid delivery types", () => {
    expect(isValidDeliveryType("YORKER")).toBe(true);
    expect(isValidDeliveryType("NOT_A_DELIVERY")).toBe(false);
  });

  it("formats a combined bowling delivery label", () => {
    expect(
      formatBowlingDeliveryLabel({
        bowlingArm: "RIGHT_ARM",
        bowlingType: "PACE",
        deliveryType: "YORKER",
        deliveryConfidence: 0.74,
      })
    ).toBe("Right-arm pace — Yorker — 74% confidence");
  });
});
