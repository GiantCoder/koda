import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { PieChart } from "react-native-gifted-charts";
import type { ShotDistributionEntry } from "@/api/progress";
import { assignCategoryColors } from "./chartColors";

function formatShotType(s: string): string {
  if (s.toUpperCase() === "UNKNOWN") return "Unclassified";
  return s
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

/** Real shot-type breakdown from GET /api/progress/[userId]/shots. */
export function ShotDistributionChart({ shots }: { shots: ShotDistributionEntry[] }) {
  const colors = useMemo(() => assignCategoryColors(shots.map((s) => s.shotType)), [shots]);

  if (shots.length === 0) {
    return <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">No completed analyses yet -- your shot mix will appear here once you have a few.</Text>;
  }

  const data = shots.map((s) => ({
    value: s.count,
    color: colors.get(s.shotType) ?? "#6B7280",
  }));

  return (
    <View className="flex-row items-center gap-4">
      <PieChart data={data} radius={70} showText={false} />
      <View className="flex-1 gap-1.5">
        {shots.map((s) => (
          <View key={s.shotType} className="flex-row items-center gap-2">
            <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.get(s.shotType) ?? "#6B7280" }} />
            <Text className="flex-1 text-xs text-text-primary dark:text-text-primary-dark">{formatShotType(s.shotType)}</Text>
            <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">
              {s.count}
              {s.percentage != null ? ` · ${s.percentage}%` : ""}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
