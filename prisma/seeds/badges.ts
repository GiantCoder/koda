import type { PrismaClient } from "@prisma/client";
import { BadgeRarity } from "@prisma/client";

export const BADGE_SEED_DATA: Array<{
  key: string;
  name: string;
  description: string;
  rarity: BadgeRarity;
  iconKey: string;
  pointsValue: number;
  sortOrder: number;
}> = [
  {
    key: "FIRST_TOUCH",
    name: "First Touch",
    description: "Complete your first analysis",
    rarity: BadgeRarity.COMMON,
    iconKey: "badge-first-touch",
    pointsValue: 10,
    sortOrder: 1,
  },
  {
    key: "GOLD_STANDARD",
    name: "Gold Standard",
    description: "Score 90 or above on any analysis",
    rarity: BadgeRarity.UNCOMMON,
    iconKey: "badge-gold-standard",
    pointsValue: 25,
    sortOrder: 2,
  },
  {
    key: "HAT_TRICK",
    name: "Hat-Trick",
    description: "Score 90 or above on 3 separate analyses",
    rarity: BadgeRarity.RARE,
    iconKey: "badge-hat-trick",
    pointsValue: 50,
    sortOrder: 3,
  },
  {
    key: "TECHNIQUE_MASTER",
    name: "Technique Master",
    description: "Score 90+ on every shot type",
    rarity: BadgeRarity.EPIC,
    iconKey: "badge-technique-master",
    pointsValue: 150,
    sortOrder: 4,
  },
  {
    key: "PERFECT_STANCE",
    name: "Perfect Stance",
    description: "Score 95+ on Head Position AND Balance in the same analysis",
    rarity: BadgeRarity.RARE,
    iconKey: "badge-perfect-stance",
    pointsValue: 75,
    sortOrder: 5,
  },
  {
    key: "TIMING_KING",
    name: "Timing King",
    description: "Score 95+ on the Timing dimension",
    rarity: BadgeRarity.RARE,
    iconKey: "badge-timing-king",
    pointsValue: 75,
    sortOrder: 6,
  },
  {
    key: "POWER_PLAYER",
    name: "Power Player",
    description: "Score 90+ on Weight Transfer AND Follow Through in the same analysis",
    rarity: BadgeRarity.UNCOMMON,
    iconKey: "badge-power-player",
    pointsValue: 50,
    sortOrder: 7,
  },
  {
    key: "DAILY_DRILLS",
    name: "Daily Drills",
    description: "Complete analyses on 3 consecutive days",
    rarity: BadgeRarity.COMMON,
    iconKey: "badge-daily-drills",
    pointsValue: 25,
    sortOrder: 8,
  },
  {
    key: "WEEK_WARRIOR",
    name: "Week Warrior",
    description: "Complete analyses on 7 consecutive days",
    rarity: BadgeRarity.UNCOMMON,
    iconKey: "badge-week-warrior",
    pointsValue: 50,
    sortOrder: 9,
  },
  {
    key: "IRON_WILL",
    name: "Iron Will",
    description: "Complete analyses on 30 consecutive days",
    rarity: BadgeRarity.EPIC,
    iconKey: "badge-iron-will",
    pointsValue: 200,
    sortOrder: 10,
  },
  {
    key: "VOLUME_BATTER",
    name: "Volume Batter",
    description: "Complete 50 analyses in total",
    rarity: BadgeRarity.RARE,
    iconKey: "badge-volume-batter",
    pointsValue: 100,
    sortOrder: 11,
  },
  {
    key: "SHOT_ARTIST",
    name: "Shot Artist",
    description: "Complete at least one analysis for all 14 shot types",
    rarity: BadgeRarity.EPIC,
    iconKey: "badge-shot-artist",
    pointsValue: 150,
    sortOrder: 12,
  },
  {
    key: "LEAGUE_CHAMPION",
    name: "League Champion",
    description: "Finish 1st in a club league season",
    rarity: BadgeRarity.LEGENDARY,
    iconKey: "badge-league-champion",
    pointsValue: 300,
    sortOrder: 13,
  },
  {
    key: "CHALLENGE_WINNER",
    name: "Challenge Winner",
    description: "Win a Koda Challenge",
    rarity: BadgeRarity.LEGENDARY,
    iconKey: "badge-challenge-winner",
    pointsValue: 300,
    sortOrder: 14,
  },
  {
    key: "FAN_FAVOURITE",
    name: "Fan Favourite",
    description: "Have a showcase clip saved by 50 or more users",
    rarity: BadgeRarity.EPIC,
    iconKey: "badge-fan-favourite",
    pointsValue: 150,
    sortOrder: 15,
  },
];

export async function seedBadges(prisma: PrismaClient): Promise<void> {
  for (const badge of BADGE_SEED_DATA) {
    await prisma.badgeDefinition.upsert({
      where: { key: badge.key },
      update: {
        name: badge.name,
        description: badge.description,
        rarity: badge.rarity,
        iconKey: badge.iconKey,
        pointsValue: badge.pointsValue,
        sortOrder: badge.sortOrder,
      },
      create: {
        key: badge.key,
        name: badge.name,
        description: badge.description,
        rarity: badge.rarity,
        iconKey: badge.iconKey,
        pointsValue: badge.pointsValue,
        sortOrder: badge.sortOrder,
      },
    });
  }
}
