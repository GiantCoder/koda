import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface CheckboxProps {
  checked: boolean;
  onToggle: (next: boolean) => void;
  label: React.ReactNode;
}

export function Checkbox({ checked, onToggle, label }: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onToggle(!checked)}
      className="flex-row items-start gap-3"
    >
      <View
        className={`mt-0.5 h-5 w-5 items-center justify-center rounded border-2 ${
          checked ? "border-primary bg-primary" : "border-surface-secondary dark:border-surface-secondary-dark bg-surface dark:bg-surface-dark"
        }`}
      >
        {checked ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
      </View>
      <Text className="flex-1 text-sm text-text-secondary dark:text-text-secondary-dark">{label}</Text>
    </Pressable>
  );
}
