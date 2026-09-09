import React from "react";
import { Text, View } from "react-native";
import { PieChart } from "react-native-gifted-charts";
import type { ShotDistributionEntry } from "@/api/progress";

const PALETTE = ["#16a34a", "#208AEF", "#F59E0B", "#EF4444", "#A855F7", "#6B7280"];

function formatShotType(s: string): string {
  return s
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

/** Real shot-type breakdown from GET /api/progress/[userId]/shots. */
export function ShotDistributionChart({ shots }: { shots: ShotDistributionEntry[] }) {
  if (shots.length === 0) {
    return <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">No completed analyses yet -- your shot mix will appear here once you have a few.</Text>;
  }

  const data = shots.map((s, i) => ({
    value: s.count,
    color: PALETTE[i % PALETTE.length],
    text: `${s.percentage ?? 0}%`,
  }));

  return (
    <View className="flex-row items-center gap-4">
      <PieChart data={data} radius={70} showText textColor="#FFFFFF" textSize={10} />
      <View className="flex-1 gap-1.5">
        {shots.map((s, i) => (
          <View key={s.shotType} className="flex-row items-center gap-2">
            <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
            <Text className="flex-1 text-xs text-text-primary dark:text-text-primary-dark">{formatShotType(s.shotType)}</Text>
            <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">{s.count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
