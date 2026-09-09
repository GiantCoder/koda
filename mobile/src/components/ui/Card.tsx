import React from "react";
import { View, Text, type ViewProps } from "react-native";

interface CardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

// Mirrors app/components/ui/Card.tsx on the web side.
export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <View
      className={`rounded-lg border border-surface-secondary dark:border-surface-secondary-dark bg-surface dark:bg-surface-dark p-6 ${className}`}
      {...props}
    >
      {children}
    </View>
  );
}

export function CardHeader({ children, className = "" }: CardProps) {
  return <Text className={`mb-4 text-lg font-semibold text-text-primary dark:text-text-primary-dark ${className}`}>{children}</Text>;
}

export function CardContent({ children, className = "" }: CardProps) {
  return <View className={className}>{children}</View>;
}
