import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { useSecondaryIconColor } from "@/components/ui/useIconColor";

export interface ShotTag {
  label: string;
  type?: "strength" | "improvement" | "neutral";
}

function tagTone(type?: string): StatusTone {
  if (type === "strength") return "success";
  if (type === "improvement") return "warning";
  return "neutral";
}

export function TagStrip({ tags }: { tags: ShotTag[] }) {
  const iconColor = useSecondaryIconColor();
  return (
    <Card>
      <CardHeader icon={<Ionicons name="pricetags-outline" size={18} color={iconColor} />}>
        Auto-Generated Tags
      </CardHeader>
      <CardContent>
        {tags.length === 0 ? (
          <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">No tags generated for this shot.</Text>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {tags.map((tag, idx) => (
              <StatusBadge key={idx} label={`#${tag.label}`} tone={tagTone(tag.type)} />
            ))}
          </View>
        )}
      </CardContent>
    </Card>
  );
}
