import React from "react";
import { Text, View } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { useColorScheme } from "nativewind";
import type { ProgressTrendPoint } from "@/api/progress";
import { TREND_LINE_COLOR } from "./chartColors";

/**
 * First chart in the app -- real grade-over-time data from
 * GET /api/progress/[userId]/trend (one point per completed analysis).
 * react-native-gifted-charts per the roadmap doc's earmark.
 */
export function TrendLineChart({ trend }: { trend: ProgressTrendPoint[] }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const axisColor = isDark ? "#9CA3AF" : "#6B7280";
  const rulesColor = isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6";

  if (trend.length === 0) {
    return <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">No completed analyses yet -- your grade trend will appear here once you have a few.</Text>;
  }

  const data = trend.map((point) => ({
    value: point.grade,
    label: point.date.slice(5), // MM-DD, keeps x-axis labels short
  }));

  return (
    <View>
      <LineChart
        data={data}
        height={180}
        color={TREND_LINE_COLOR}
        thickness={2.5}
        dataPointsColor={TREND_LINE_COLOR}
        startFillColor={TREND_LINE_COLOR}
        startOpacity={0.15}
        endOpacity={0.02}
        areaChart
        curved
        noOfSections={4}
        maxValue={100}
        yAxisTextStyle={{ color: axisColor, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: axisColor, fontSize: 9 }}
        rulesColor={rulesColor}
        yAxisColor={rulesColor}
        xAxisColor={rulesColor}
        initialSpacing={12}
        spacing={Math.max(28, 280 / Math.max(1, data.length))}
      />
    </View>
  );
}
