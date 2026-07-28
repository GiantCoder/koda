/**
 * Canonical bowling delivery types for Gemini classification output.
 * UNKNOWN = model could not classify; omit from player pickers.
 */
export const DELIVERY_TYPE_VALUES = [
  "GOOD_LENGTH",
  "FULL",
  "YORKER",
  "SHORT",
  "BOUNCER",
  "FULL_TOSS",
  "SLOWER_BALL",
  "OFF_BREAK",
  "LEG_BREAK",
  "GOOGLY",
  "ARM_BALL",
  "TOP_SPINNER",
  "UNKNOWN",
] as const;

export type DeliveryTypeValue = (typeof DELIVERY_TYPE_VALUES)[number];

const LABELS: Record<DeliveryTypeValue, string> = {
  GOOD_LENGTH: "Good Length",
  FULL: "Full",
  YORKER: "Yorker",
  SHORT: "Short",
  BOUNCER: "Bouncer",
  FULL_TOSS: "Full Toss",
  SLOWER_BALL: "Slower Ball",
  OFF_BREAK: "Off Break",
  LEG_BREAK: "Leg Break",
  GOOGLY: "Googly",
  ARM_BALL: "Arm Ball",
  TOP_SPINNER: "Top Spinner",
  UNKNOWN: "Unknown",
};

/** Pipe-separated list for LLM prompts (include UNKNOWN for refusal bucket). */
export const DELIVERY_TYPE_PROMPT_UNION = DELIVERY_TYPE_VALUES.join("|");

/** UI picker order (no UNKNOWN). */
const UI_ORDER: Exclude<DeliveryTypeValue, "UNKNOWN">[] = [
  "GOOD_LENGTH",
  "FULL",
  "YORKER",
  "SHORT",
  "BOUNCER",
  "FULL_TOSS",
  "SLOWER_BALL",
  "OFF_BREAK",
  "LEG_BREAK",
  "GOOGLY",
  "ARM_BALL",
  "TOP_SPINNER",
];

export const DELIVERY_TYPE_OPTIONS = UI_ORDER.map((value) => ({
  value,
  label: LABELS[value],
}));

export function isValidDeliveryType(value: string): value is DeliveryTypeValue {
  return (DELIVERY_TYPE_VALUES as readonly string[]).includes(value);
}

export function formatDeliveryType(value: string): string {
  if (isValidDeliveryType(value)) {
    return LABELS[value];
  }
  return value
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export const BOWLING_ARM_VALUES = ["RIGHT_ARM", "LEFT_ARM", "UNKNOWN"] as const;
export type BowlingArmValue = (typeof BOWLING_ARM_VALUES)[number];

export const BOWLING_TYPE_VALUES = ["PACE", "SPIN", "UNKNOWN"] as const;
export type BowlingTypeValue = (typeof BOWLING_TYPE_VALUES)[number];

const ARM_LABELS: Record<BowlingArmValue, string> = {
  RIGHT_ARM: "Right-arm",
  LEFT_ARM: "Left-arm",
  UNKNOWN: "Unknown arm",
};

const TYPE_LABELS: Record<BowlingTypeValue, string> = {
  PACE: "pace",
  SPIN: "spin",
  UNKNOWN: "unknown",
};

export function isValidBowlingArm(value: string): value is BowlingArmValue {
  return (BOWLING_ARM_VALUES as readonly string[]).includes(value);
}

export function isValidBowlingType(value: string): value is BowlingTypeValue {
  return (BOWLING_TYPE_VALUES as readonly string[]).includes(value);
}

export function formatBowlingArm(value: string): string {
  if (isValidBowlingArm(value)) return ARM_LABELS[value];
  return formatDeliveryType(value);
}

export function formatBowlingType(value: string): string {
  if (isValidBowlingType(value)) return TYPE_LABELS[value];
  return value.toLowerCase();
}

/** e.g. "Right-arm pace — Yorker — 74% confidence" */
export function formatBowlingDeliveryLabel(input: {
  bowlingArm?: string | null;
  bowlingType?: string | null;
  deliveryType?: string | null;
  deliveryConfidence?: number | null;
}): string {
  const arm = formatBowlingArm(input.bowlingArm ?? "UNKNOWN");
  const type = formatBowlingType(input.bowlingType ?? "UNKNOWN");
  const delivery = formatDeliveryType(input.deliveryType ?? "UNKNOWN");
  const pct = Math.round((input.deliveryConfidence ?? 0) * 100);
  return `${arm} ${type} — ${delivery} — ${pct}% confidence`;
}
