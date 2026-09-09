import React from "react";
import { Text, View } from "react-native";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

export interface TechniqueDataPoint {
  dimension: string;
  value: number;
  fullMark?: number;
}

/**
 * Web's "TechniqueRadarChart" is misnamed -- despite the name and icon, it
 * actually renders horizontal progress bars (no recharts RadarChart is
 * used). Mobile ports the real bars rather than building an actual radar
 * chart, and names the component honestly. See roadmap doc.
 */
export function TechniqueBars({ data }: { data: TechniqueDataPoint[] }) {
  return (
    <Card>
      <CardHeader>📊 Technique Analysis</CardHeader>
      <CardContent className="gap-3">
        {data.length === 0 ? (
          <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">No technique data available for this shot.</Text>
        ) : (
          data.map((item) => {
            const fullMark = item.fullMark ?? 100;
            const pct = Math.max(0, Math.min(100, Math.round((item.value / fullMark) * 100)));
            return (
              <View key={item.dimension}>
                <View className="mb-1 flex-row items-center justify-between">
                  <Text className="text-sm text-text-primary dark:text-text-primary-dark">{item.dimension}</Text>
                  <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">{item.value}/{fullMark}</Text>
                </View>
                <View className="h-2 rounded-full bg-surface-secondary dark:bg-surface-secondary-dark">
                  <View className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </View>
              </View>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
