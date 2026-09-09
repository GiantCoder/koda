import React from "react";
import { Text, View } from "react-native";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

export interface ShotTag {
  label: string;
  type?: "strength" | "improvement" | "neutral";
}

function tagClasses(type?: string): string {
  if (type === "strength") return "bg-success dark:bg-success-dark/20 border-success dark:border-success-dark/30";
  if (type === "improvement") return "bg-warning dark:bg-warning-dark/20 border-warning dark:border-warning-dark/30";
  return "bg-surface-secondary dark:bg-surface-secondary-dark border-surface-secondary dark:border-surface-secondary-dark";
}
function tagTextColor(type?: string): string {
  if (type === "strength") return "#16a34a";
  if (type === "improvement") return "#F59E0B";
  return "#6B7280";
}

export function TagStrip({ tags }: { tags: ShotTag[] }) {
  return (
    <Card>
      <CardHeader>🏷️ Auto-Generated Tags</CardHeader>
      <CardContent>
        {tags.length === 0 ? (
          <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">No tags generated for this shot.</Text>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {tags.map((tag, idx) => (
              <View
                key={idx}
                className={`rounded-full border px-3 py-1 ${tagClasses(tag.type)}`}
              >
                <Text className="text-xs font-medium" style={{ color: tagTextColor(tag.type) }}>
                  #{tag.label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </CardContent>
    </Card>
  );
}
