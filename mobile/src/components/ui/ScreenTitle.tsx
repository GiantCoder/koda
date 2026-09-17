import React from "react";
import { Text } from "react-native";

interface ScreenTitleProps {
  children: React.ReactNode;
  className?: string;
}

/** Screen H1s — Spline Sans display face, body copy stays on the system font. */
export function ScreenTitle({ children, className = "" }: ScreenTitleProps) {
  return (
    <Text className={`text-2xl font-display text-text-primary dark:text-text-primary-dark ${className}`}>
      {children}
    </Text>
  );
}
