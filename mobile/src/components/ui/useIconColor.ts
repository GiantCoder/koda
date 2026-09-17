import { useColorScheme } from "nativewind";

/** Tailwind `text-secondary` / `text-secondary-dark`. */
export const ICON_COLOR_SECONDARY = "#6B7280";
export const ICON_COLOR_SECONDARY_DARK = "#9CA3AF";

export function useSecondaryIconColor(): string {
  const { colorScheme } = useColorScheme();
  return colorScheme === "dark" ? ICON_COLOR_SECONDARY_DARK : ICON_COLOR_SECONDARY;
}
