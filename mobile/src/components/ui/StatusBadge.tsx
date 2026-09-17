import React from "react";
import { Text, View } from "react-native";

export type StatusTone = "success" | "info" | "danger" | "warning" | "neutral";

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  /** Optional leading icon; falls back to a small tonal dot. */
  icon?: React.ReactNode;
}

const TONE_CLASSES: Record<StatusTone, { bg: string; dot: string; text: string }> = {
  success: {
    bg: "bg-success/15 dark:bg-success-dark/20",
    dot: "bg-success dark:bg-success-dark",
    text: "text-success dark:text-success-dark",
  },
  info: {
    bg: "bg-cricket-green/15 dark:bg-cricket-green/25",
    dot: "bg-cricket-green",
    text: "text-cricket-green",
  },
  danger: {
    bg: "bg-danger/15 dark:bg-danger-dark/20",
    dot: "bg-danger dark:bg-danger-dark",
    text: "text-danger dark:text-danger-dark",
  },
  warning: {
    bg: "bg-warning/15 dark:bg-warning-dark/20",
    dot: "bg-warning dark:bg-warning-dark",
    text: "text-warning dark:text-warning-dark",
  },
  neutral: {
    bg: "bg-surface-secondary dark:bg-surface-secondary-dark",
    dot: "bg-text-secondary dark:bg-text-secondary-dark",
    text: "text-text-secondary dark:text-text-secondary-dark",
  },
};

export function StatusBadge({ label, tone = "neutral", icon }: StatusBadgeProps) {
  const classes = TONE_CLASSES[tone];
  return (
    <View className={`flex-row items-center gap-1.5 self-start rounded-full px-2 py-1 ${classes.bg}`}>
      {icon ?? <View className={`h-1.5 w-1.5 rounded-full ${classes.dot}`} />}
      <Text className={`text-[11px] font-medium leading-none ${classes.text}`}>{label}</Text>
    </View>
  );
}
