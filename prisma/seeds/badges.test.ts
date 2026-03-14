import { describe, expect, it, vi } from "vitest";

vi.mock("@prisma/client", () => ({
  BadgeRarity: {
    COMMON: "COMMON",
    UNCOMMON: "UNCOMMON",
    RARE: "RARE",
    EPIC: "EPIC",
    LEGENDARY: "LEGENDARY",
  },
}));

import { BADGE_SEED_DATA } from "./badges";

describe("badge seed data", () => {
  it("has exactly 15 badge definitions", () => {
    expect(BADGE_SEED_DATA).toHaveLength(15);
  });

  it("has unique keys for all badges", () => {
    const keys = BADGE_SEED_DATA.map((b) => b.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(15);
    expect(keys).toEqual([...uniqueKeys]);
  });

  it("has expected keys in sort order", () => {
    const expectedKeys = [
      "FIRST_TOUCH",
      "GOLD_STANDARD",
      "HAT_TRICK",
      "TECHNIQUE_MASTER",
      "PERFECT_STANCE",
      "TIMING_KING",
      "POWER_PLAYER",
      "DAILY_DRILLS",
      "WEEK_WARRIOR",
      "IRON_WILL",
      "VOLUME_BATTER",
      "SHOT_ARTIST",
      "LEAGUE_CHAMPION",
      "CHALLENGE_WINNER",
      "FAN_FAVOURITE",
    ];
    expect(BADGE_SEED_DATA.map((b) => b.key)).toEqual(expectedKeys);
  });

  it("has sortOrder 1 through 15", () => {
    const orders = BADGE_SEED_DATA.map((b) => b.sortOrder).sort((a, b) => a - b);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  });

  it("each badge has non-empty name, description, iconKey and valid pointsValue", () => {
    for (const badge of BADGE_SEED_DATA) {
      expect(badge.key).toBeTruthy();
      expect(badge.name.length).toBeGreaterThan(0);
      expect(badge.description.length).toBeGreaterThan(0);
      expect(badge.iconKey.length).toBeGreaterThan(0);
      expect(badge.pointsValue).toBeGreaterThanOrEqual(0);
      expect(["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"]).toContain(
        badge.rarity
      );
    }
  });

  it("iconKey matches badge-* pattern for asset path", () => {
    for (const badge of BADGE_SEED_DATA) {
      expect(badge.iconKey).toMatch(/^badge-[a-z-]+$/);
    }
  });
});
