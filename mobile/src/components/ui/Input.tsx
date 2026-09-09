import React, { forwardRef } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      // `className` is applied here too (not just on the TextInput below) so
      // layout utilities like `flex-1`/`flex-[1.3]` -- used to lay out
      // several Inputs side by side in a row, e.g. the register screen's
      // day/month/year fields -- actually affect how much row width this
      // Input takes up. Before this, the outer wrapper was hard-coded to
      // `w-full` regardless of what was passed in, so every Input in a row
      // claimed the *entire* row width and the row overflowed off-screen.
      // Text-appearance classes (e.g. `capitalize`) are harmless no-ops here
      // and still apply for real on the TextInput itself below.
      <View className={`w-full ${className}`}>
        {label ? <Text className="mb-1.5 text-sm font-medium text-text-primary">{label}</Text> : null}
        <TextInput
          ref={ref}
          placeholderTextColor="#9CA3AF"
          className={`w-full rounded-lg border px-4 py-3 text-base text-text-primary ${
            error ? "border-danger" : "border-surface-secondary"
          } ${className}`}
          {...props}
        />
        {error ? <Text className="mt-1 text-xs text-danger">{error}</Text> : null}
      </View>
    );
  }
);
Input.displayName = "Input";
