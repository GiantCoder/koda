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
      className={`rounded-lg border border-surface-secondary bg-surface p-6 ${className}`}
      {...props}
    >
      {children}
    </View>
  );
}

export function CardHeader({ children, className = "" }: CardProps) {
  return <Text className={`mb-4 text-lg font-semibold text-text-primary ${className}`}>{children}</Text>;
}

export function CardContent({ children, className = "" }: CardProps) {
  return <View className={className}>{children}</View>;
}
