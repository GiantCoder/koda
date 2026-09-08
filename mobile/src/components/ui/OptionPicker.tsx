import React from "react";
import { Pressable, Text, View } from "react-native";

export interface Option {
  value: string;
  label: string;
  description?: string;
}

interface OptionPickerProps {
  label?: string;
  options: Option[];
  value: string | null;
  onChange: (value: string) => void;
  /** "cards" (stacked, room for a description) for a handful of big
   * decisions like role; "chips" (wrapping row, compact) for short
   * enumerations like batting style. */
  layout?: "cards" | "chips";
}

/**
 * Native stand-in for the web app's <Select> (a real HTML <select>, which
 * has no direct native equivalent without pulling in a native picker
 * dependency). A single-select list of pressable options covers everything
 * onboarding needs -- role, guardian relationship, position, batting/bowling
 * style -- without adding @react-native-picker/picker for Phase 1.
 */
export function OptionPicker({ label, options, value, onChange, layout = "chips" }: OptionPickerProps) {
  return (
    <View className="w-full">
      {label ? <Text className="mb-1.5 text-sm font-medium text-text-primary">{label}</Text> : null}
      {layout === "cards" ? (
        <View className="gap-3">
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <Pressable
                key={option.value}
                onPress={() => onChange(option.value)}
                className={`rounded-lg border-2 p-4 ${
                  selected ? "border-primary bg-surface-secondary" : "border-surface-secondary"
                }`}
              >
                <Text className="font-semibold text-text-primary">{option.label}</Text>
                {option.description ? (
                  <Text className="mt-0.5 text-sm text-text-secondary">{option.description}</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <Pressable
                key={option.value}
                onPress={() => onChange(option.value)}
                className={`rounded-full border px-4 py-2 ${
                  selected ? "border-primary bg-primary" : "border-surface-secondary bg-surface"
                }`}
              >
                <Text className={selected ? "text-sm font-medium text-white" : "text-sm text-text-primary"}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
