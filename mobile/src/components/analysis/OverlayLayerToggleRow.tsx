import React from "react";
import { Pressable, Text, View } from "react-native";

interface OverlayLayerToggleRowProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

/** One compact checkbox row for the video-overlay layer panel (Video /
 * Skeleton / Bbox) -- styled for sitting on top of a video (dark
 * translucent backdrop, white label), unlike the form-oriented shared
 * Checkbox component. Mirrors web's OverlayLayerControls. */
export function OverlayLayerToggleRow({
  label,
  checked,
  onToggle,
  disabled = false,
}: OverlayLayerToggleRowProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      onPress={disabled ? undefined : onToggle}
      className={`flex-row items-center gap-2 ${disabled ? "opacity-50" : ""}`}
    >
      <View
        className={`h-3.5 w-3.5 items-center justify-center rounded-sm border ${
          checked ? "border-success dark:border-success-dark bg-success dark:bg-success-dark" : "border-white/40 bg-transparent"
        }`}
      >
        {checked ? <Text className="text-[9px] font-bold leading-none text-white">✓</Text> : null}
      </View>
      <Text className="text-xs text-white">{label}</Text>
    </Pressable>
  );
}
