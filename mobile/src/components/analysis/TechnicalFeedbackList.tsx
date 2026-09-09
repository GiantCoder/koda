import React from "react";
import { Text, View } from "react-native";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import type { TechnicalFeedbackItem } from "@/api/analysis";

/**
 * Simplified port of web's src/components/analysis/TechnicalFeedbackPanel.tsx
 * -- real, per-dimension Gemini-grounded feedback (diagnosis/evidence/drill),
 * richer than the plain coachingTips array. Trimmed for v1: no frame
 * thumbnail matching and no tap-to-seek-video (web's `onSeek` callback) --
 * both are real nice-to-haves web has, but add a meaningful chunk of extra
 * plumbing (video ref + frame lookup) for a first pass. See roadmap doc.
 */
function confidenceColor(confidence: TechnicalFeedbackItem["confidence"]): string {
  if (confidence === "high") return "#16a34a";
  if (confidence === "medium") return "#F59E0B";
  return "#6B7280";
}

function formatClock(seconds: number): string {
  const total = Math.max(0, seconds);
  const mins = Math.floor(total / 60);
  const secs = Math.floor(total % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function dimensionLabel(dimension: string): string {
  return dimension
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

export function TechnicalFeedbackList({ items }: { items: TechnicalFeedbackItem[] }) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardHeader>🔍 Detailed Technique Feedback</CardHeader>
      <CardContent className="gap-4">
        {items.map((item, idx) => (
          <View key={idx} className="border-b border-surface-secondary pb-4 last:border-0 last:pb-0">
            <View className="mb-1 flex-row items-center justify-between">
              <Text className="font-medium text-text-primary">{dimensionLabel(item.dimension)}</Text>
              <View className="flex-row items-center gap-2">
                {item.timestampSeconds != null ? (
                  <Text className="text-xs text-text-secondary">@ {formatClock(item.timestampSeconds)}</Text>
                ) : null}
                <View className="rounded-full bg-surface-secondary px-2 py-0.5">
                  <Text className="text-[10px] font-medium" style={{ color: confidenceColor(item.confidence) }}>
                    {item.confidence} confidence
                  </Text>
                </View>
              </View>
            </View>
            <Text className="text-sm text-text-secondary">{item.diagnosis}</Text>
            {item.evidence ? (
              <Text className="mt-1 text-xs italic text-text-secondary">Evidence: {item.evidence}</Text>
            ) : null}
            {item.drill ? (
              <Text className="mt-1 text-sm text-primary">Drill: {item.drill}</Text>
            ) : null}
          </View>
        ))}
      </CardContent>
    </Card>
  );
}
