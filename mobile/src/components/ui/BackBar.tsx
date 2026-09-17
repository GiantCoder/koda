import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { PressableScale } from "./PressableScale";

/**
 * Shared back-navigation row for root-level stack screens (outside the tab
 * bar). The root Stack has `headerShown: false` app-wide (src/app/_layout.tsx),
 * so screens pushed onto it get no native back button at all -- this was a
 * real bug on Phase 4's analysis results screen (no way back except an
 * undiscoverable swipe/hardware-back gesture), fixed by adding this
 * explicit control. Falls back to the dashboard if there's genuinely
 * nothing to go back to (e.g. a deep link opened the screen directly).
 */
export function BackBar({ label = "Back" }: { label?: string }) {
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(app)/dashboard");
    }
  };

  return (
    <View className="flex-row px-6 pt-2">
      <PressableScale onPress={handleBack} className="flex-row items-center py-2 pr-3" hitSlop={8}>
        <Ionicons name="chevron-back" size={18} color="#E63946" />
        <Text className="text-base font-medium text-primary">{label}</Text>
      </PressableScale>
    </View>
  );
}
