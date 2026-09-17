import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { useSecondaryIconColor } from "@/components/ui/useIconColor";

export interface MetricScore {
  label: string;
  value: number;
  max?: number;
}

interface ShotGradeCardProps {
  gradeLetter: string;
  starRating: number;
  maxStars?: number;
  metrics: MetricScore[];
  overallScore: number;
  title?: string;
}

// Ports web's app/components/analysis/ShotGradeCard.tsx color thresholds.
function gradeColor(letter: string): string {
  const upper = letter.toUpperCase();
  if (["A", "A+", "B+", "B"].includes(upper)) return "#2D6A4F"; // cricket-green
  if (["C+", "C"].includes(upper)) return "#F59E0B"; // warning
  return "#6B7280"; // text-secondary
}

function scoreColor(value: number): string {
  if (value >= 85) return "#2D6A4F";
  if (value >= 65) return "#F59E0B";
  return "#6B7280";
}

export function ShotGradeCard({
  gradeLetter,
  starRating,
  maxStars = 5,
  metrics,
  overallScore,
  title = "Shot Quality",
}: ShotGradeCardProps) {
  const iconColor = useSecondaryIconColor();
  return (
    <Card>
      <View className="mb-4 flex-row items-center justify-between">
        <CardHeader className="mb-0" icon={<Ionicons name="ribbon-outline" size={18} color={iconColor} />}>
          {title}
        </CardHeader>
        <View className="flex-row gap-0.5">
          {Array.from({ length: maxStars }).map((_, i) => (
            <Ionicons
              key={i}
              name={i < starRating ? "star" : "star-outline"}
              size={16}
              color={i < starRating ? "#F59E0B" : iconColor}
            />
          ))}
        </View>
      </View>
      <CardContent className="gap-4">
        <View className="flex-row items-center gap-4">
          <View
            className="h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: gradeColor(gradeLetter) }}
          >
            <Text className="text-3xl font-bold text-white">{gradeLetter}</Text>
          </View>
          <View>
            <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">Overall Score</Text>
            <Text className="text-2xl font-bold" style={{ color: scoreColor(overallScore) }}>
              {overallScore.toFixed(1)}
            </Text>
          </View>
        </View>

        <View className="gap-2">
          {metrics.map((m) => (
            <View key={m.label} className="flex-row items-center justify-between gap-2">
              <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">{m.label}</Text>
              <Text className="text-sm font-medium" style={{ color: scoreColor(m.value) }}>
                {Math.round(m.value)}/{m.max ?? 100}
              </Text>
            </View>
          ))}
        </View>
      </CardContent>
    </Card>
  );
}
