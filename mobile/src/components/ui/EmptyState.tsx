import React from "react";
import { Text, View } from "react-native";
import { Button } from "./Button";
import { Card } from "./Card";

interface EmptyStateProps {
  icon: React.ReactNode;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Card className="items-center">
      <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-surface-secondary dark:bg-surface-secondary-dark">
        {icon}
      </View>
      <Text className="text-center text-sm text-text-secondary dark:text-text-secondary-dark">{message}</Text>
      {actionLabel && onAction ? (
        <View className="mt-4">
          <Button size="sm" onPress={onAction}>
            {actionLabel}
          </Button>
        </View>
      ) : null}
    </Card>
  );
}
