import React from "react";
import { Text, View } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import type { ProgressTrendPoint } from "@/api/progress";

/**
 * First chart in the app -- real grade-over-time data from
 * GET /api/progress/[userId]/trend (one point per completed analysis).
 * react-native-gifted-charts per the roadmap doc's earmark.
 */
export function TrendLineChart({ trend }: { trend: ProgressTrendPoint[] }) {
  if (trend.length === 0) {
    return <Text className="text-sm text-text-secondary">No completed analyses yet -- your grade trend will appear here once you have a few.</Text>;
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
        color="#208AEF"
        thickness={2.5}
        dataPointsColor="#208AEF"
        startFillColor="#208AEF"
        startOpacity={0.15}
        endOpacity={0.02}
        areaChart
        curved
        noOfSections={4}
        maxValue={100}
        yAxisTextStyle={{ color: "#6B7280", fontSize: 10 }}
        xAxisLabelTextStyle={{ color: "#6B7280", fontSize: 9 }}
        rulesColor="#F3F4F6"
        yAxisColor="#F3F4F6"
        xAxisColor="#F3F4F6"
        initialSpacing={12}
        spacing={Math.max(28, 280 / Math.max(1, data.length))}
      />
    </View>
  );
}
