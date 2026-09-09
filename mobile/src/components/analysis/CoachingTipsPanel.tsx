import React from "react";
import { Text, View } from "react-native";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import type { CoachingTip } from "@/api/analysis";

interface CoachingTipsPanelProps {
  tips: CoachingTip[];
}

function tipBorderColor(type?: string): string {
  if (type === "improvement") return "#F59E0B";
  if (type === "recommendation") return "#16a34a";
  return "#16a34a";
}

export function CoachingTipsPanel({ tips }: CoachingTipsPanelProps) {
  return (
    <Card>
      <CardHeader>💡 AI Coaching Tips</CardHeader>
      <CardContent className="gap-3">
        {tips.length === 0 ? (
          <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">No coaching tips available for this shot.</Text>
        ) : (
          tips.map((tip, idx) => (
            <View
              key={idx}
              className="rounded-r-lg bg-surface-secondary dark:bg-surface-secondary-dark p-3"
              style={{ borderLeftWidth: 4, borderLeftColor: tipBorderColor(tip.type) }}
            >
              <Text className="font-medium text-text-primary dark:text-text-primary-dark">{tip.title}</Text>
              {tip.body ? <Text className="mt-1 text-sm text-text-secondary dark:text-text-secondary-dark">{tip.body}</Text> : null}
              {tip.description && tip.description !== tip.body ? (
                <Text className="mt-1 text-sm text-text-secondary dark:text-text-secondary-dark">{tip.description}</Text>
              ) : null}
            </View>
          ))
        )}
      </CardContent>
    </Card>
  );
}
