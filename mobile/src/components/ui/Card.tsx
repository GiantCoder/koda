import React from "react";
import { View, Text, type ViewProps } from "react-native";
import { useColorScheme } from "nativewind";
import { cardElevation } from "./elevation";

interface CardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

// Mirrors app/components/ui/Card.tsx on the web side.
export function Card({ children, className = "", style, ...props }: CardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const clipped = className.includes("overflow-hidden");

  return (
    <View
      className={`rounded-2xl bg-surface dark:bg-surface-dark p-6 ${className}`}
      style={[cardElevation(isDark, { clipped }), style]}
      {...props}
    >
      {children}
    </View>
  );
}

export function CardHeader({ children, className = "", icon }: CardHeaderProps) {
  return (
    <View className={`mb-4 flex-row items-center gap-2 ${className}`}>
      {icon}
      <Text className="flex-shrink text-lg font-semibold text-text-primary dark:text-text-primary-dark">
        {children}
      </Text>
    </View>
  );
}

export function CardContent({ children, className = "" }: CardProps) {
  return <View className={className}>{children}</View>;
}
