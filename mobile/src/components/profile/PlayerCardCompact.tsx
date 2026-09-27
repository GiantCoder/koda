import React from "react";
import { Text, View } from "react-native";
import type { PlayerCardDto } from "@/api/playerCard";

const TIER_COLORS: Record<PlayerCardDto["tier"], string> = {
  BRONZE: "#b45309",
  SILVER: "#6b7280",
  GOLD: "#ca8a04",
  ELITE: "#7c3aed",
};

const STAT_LABELS: { key: keyof PlayerCardDto; label: string }[] = [
  { key: "statTec", label: "TEC" },
  { key: "statPow", label: "POW" },
  { key: "statTim", label: "TIM" },
  { key: "statCon", label: "CON" },
  { key: "statPac", label: "PAC" },
  { key: "statFie", label: "FIE" },
];

/**
 * Compact, read-only stand-in for the web app's PlayerCardDisplay (which
 * leans on MUI + custom card art that doesn't exist in React Native).
 * Same real data (GET /api/player-card), simpler presentation: a tier
 * badge, overall rating, and a 6-stat grid.
 */
export function PlayerCardCompact({ card }: { card: PlayerCardDto }) {
  const isBlankSlate = card.id === null;

  return (
    <View className="w-full items-center">
      <View
        className="mb-2 rounded-full px-3 py-1"
        style={{ backgroundColor: TIER_COLORS[card.tier] }}
      >
        <Text className="text-xs font-bold uppercase tracking-wide text-white">{card.tier}</Text>
      </View>
      <Text className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">{card.displayName}</Text>
      <Text className="mb-4 text-3xl font-bold text-primary">{card.overall}</Text>
      <View className="w-full gap-2">
        {[STAT_LABELS.slice(0, 3), STAT_LABELS.slice(3, 6)].map((row, rowIndex) => (
          <View key={rowIndex} className="flex-row gap-2">
            {row.map(({ key, label }) => (
              <View
                key={key}
                className="flex-1 items-center rounded-lg bg-surface-secondary dark:bg-surface-secondary-dark py-2"
              >
                <Text className="text-sm font-bold text-text-primary dark:text-text-primary-dark">{String(card[key])}</Text>
                <Text className="text-[10px] text-text-secondary dark:text-text-secondary-dark">{label}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
      {isBlankSlate ? (
        <Text className="mt-4 text-center text-sm text-text-secondary dark:text-text-secondary-dark">
          This is a starting-point card. It'll update automatically once your first analysis
          completes.
        </Text>
      ) : null}
    </View>
  );
}
