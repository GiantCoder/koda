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
      <View className="w-full">
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
