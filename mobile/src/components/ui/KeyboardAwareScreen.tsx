import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView, type SafeAreaViewProps } from "react-native-safe-area-context";

interface KeyboardAwareScreenProps {
  children: React.ReactNode;
  contentContainerClassName?: string;
  safeAreaClassName?: string;
  edges?: SafeAreaViewProps["edges"];
}

/**
 * Shared shell for form screens: SafeAreaView + KeyboardAvoidingView +
 * ScrollView. Every screen with several stacked inputs (register, login,
 * onboarding consent/privacy/profile) used to be a bare ScrollView with no
 * keyboard avoidance at all -- fine when the form fits above the keyboard,
 * but on a smaller phone (reported: iPhone 15 Pro) with a longer form like
 * register's, the keyboard could cover the last field or two with no way
 * to scroll them into view. `behavior="padding"` on iOS shrinks the
 * available height when the keyboard opens, so the ScrollView actually has
 * room to scroll the focused field above it.
 */
export function KeyboardAwareScreen({
  children,
  contentContainerClassName = "flex-grow justify-center px-6 py-10",
  safeAreaClassName = "flex-1 bg-surface dark:bg-surface-dark",
  edges,
}: KeyboardAwareScreenProps) {
  return (
    <SafeAreaView className={safeAreaClassName} edges={edges}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerClassName={contentContainerClassName} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
