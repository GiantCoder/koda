/**
 * Canonical shot types: must match Prisma `ShotType` enum and Gemini classification output.
 * UNKNOWN = model could not classify; omit from player pickers.
 */
export const SHOT_TYPE_VALUES = [
  "COVER_DRIVE",
  "OFF_DRIVE",
  "STRAIGHT_DRIVE",
  "ON_DRIVE",
  "SWEEP",
  "REVERSE_SWEEP",
  "PULL",
  "HOOK",
  "CUT",
  "GLANCE",
  "DEFENSIVE",
  "LATE_CUT",
  "FLICK",
  "SCOOP",
  "FORWARD_DEFENCE",
  "BACK_FOOT_DEFENCE",
  "LEG_GLANCE",
  "SQUARE_CUT",
  "UPPER_CUT",
  "LOFTED_DRIVE",
  "PADDLE_SWEEP",
  "RAMP",
  "CHECK_DRIVE",
  "LEAVE",
  "UNKNOWN",
] as const;

export type ShotTypeValue = (typeof SHOT_TYPE_VALUES)[number];

const LABELS: Record<ShotTypeValue, string> = {
  COVER_DRIVE: "Cover Drive",
  OFF_DRIVE: "Off Drive",
  STRAIGHT_DRIVE: "Straight Drive",
  ON_DRIVE: "On Drive",
  SWEEP: "Sweep",
  REVERSE_SWEEP: "Reverse Sweep",
  PULL: "Pull Shot",
  HOOK: "Hook Shot",
  CUT: "Cut Shot",
  GLANCE: "Glance",
  DEFENSIVE: "Defensive",
  LATE_CUT: "Late Cut",
  FLICK: "Flick",
  SCOOP: "Scoop",
  FORWARD_DEFENCE: "Forward Defence",
  BACK_FOOT_DEFENCE: "Back Foot Defence",
  LEG_GLANCE: "Leg Glance",
  SQUARE_CUT: "Square Cut",
  UPPER_CUT: "Upper Cut",
  LOFTED_DRIVE: "Lofted Drive",
  PADDLE_SWEEP: "Paddle Sweep",
  RAMP: "Ramp",
  CHECK_DRIVE: "Check Drive",
  LEAVE: "Leave",
  UNKNOWN: "Unknown",
};

/** Pipe-separated list for LLM prompts (include UNKNOWN for refusal bucket). */
export const SHOT_TYPE_PROMPT_UNION = SHOT_TYPE_VALUES.join("|");

/** Shadow Batting / UI picker order (no UNKNOWN). */
const UI_ORDER: Exclude<ShotTypeValue, "UNKNOWN">[] = [
  "COVER_DRIVE",
  "PULL",
  "CUT",
  "HOOK",
  "DEFENSIVE",
  "STRAIGHT_DRIVE",
  "OFF_DRIVE",
  "ON_DRIVE",
  "SWEEP",
  "REVERSE_SWEEP",
  "LATE_CUT",
  "FLICK",
  "GLANCE",
  "SCOOP",
  "FORWARD_DEFENCE",
  "BACK_FOOT_DEFENCE",
  "LEG_GLANCE",
  "SQUARE_CUT",
  "UPPER_CUT",
  "LOFTED_DRIVE",
  "PADDLE_SWEEP",
  "RAMP",
  "CHECK_DRIVE",
  "LEAVE",
];

export const SHOT_TYPE_OPTIONS = UI_ORDER.map((value) => ({
  value,
  label: LABELS[value],
}));

/** Upload / multi-shot hint pickers — includes UNKNOWN for “no specific hint”. */
export const SHOT_TYPE_HINT_OPTIONS: { value: ShotTypeValue; label: string }[] = [
  { value: "UNKNOWN", label: "No specific hint" },
  ...SHOT_TYPE_OPTIONS,
];

export function isValidShotType(value: string): value is ShotTypeValue {
  return (SHOT_TYPE_VALUES as readonly string[]).includes(value);
}
