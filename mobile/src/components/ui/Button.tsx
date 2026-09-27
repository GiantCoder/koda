import React from "react";
import { ActivityIndicator, Text, type PressableProps } from "react-native";
import { PressableScale } from "./PressableScale";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends Omit<PressableProps, "children" | "style"> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  children: React.ReactNode;
}

// Mirrors app/components/ui/Button.tsx on the web side (same variant/size
// vocabulary), rebuilt on Pressable + NativeWind since MUI/Tailwind-for-DOM
// don't run in React Native.
const containerBase = "flex-row items-center justify-center rounded-lg";
const containerSizes: Record<Size, string> = {
  sm: "px-3 py-2",
  md: "px-4 py-3",
  lg: "px-6 py-4",
};
const containerVariants: Record<Variant, string> = {
  primary: "bg-primary active:bg-primary-hover",
  secondary: "bg-surface-secondary dark:bg-surface-secondary-dark active:opacity-80",
  ghost: "bg-transparent active:bg-surface-secondary dark:active:bg-surface-secondary-dark",
  danger: "bg-danger dark:bg-danger-dark active:opacity-90",
};
const textSizes: Record<Size, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};
const textVariants: Record<Variant, string> = {
  primary: "text-white font-medium",
  secondary: "text-text-primary dark:text-text-primary-dark font-medium",
  ghost: "text-text-primary dark:text-text-primary-dark font-medium",
  danger: "text-white font-medium",
};

function isTextOnly(node: React.ReactNode): boolean {
  if (node == null || typeof node === "boolean") return true;
  if (typeof node === "string" || typeof node === "number") return true;
  if (Array.isArray(node)) return node.every(isTextOnly);
  return false;
}

function flattenText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join("");
  return "";
}

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps & { className?: string }) {
  const isDisabled = disabled || isLoading;
  return (
    <PressableScale
      accessibilityRole="button"
      disabled={isDisabled}
      className={`${containerBase} ${containerSizes[size]} ${containerVariants[variant]} ${
        isDisabled ? "opacity-50" : ""
      } ${className ?? ""}`}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === "secondary" || variant === "ghost" ? "#111827" : "#FFFFFF"} />
      ) : isTextOnly(children) ? (
        <Text className={`${textVariants[variant]} ${textSizes[size]}`}>{flattenText(children)}</Text>
      ) : (
        children
      )}
    </PressableScale>
  );
}
