import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useColorScheme } from "nativewind";
import { Button } from "./Button";
import { cardElevation } from "./elevation";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Repo rule (CLAUDE.md): never use a browser-native confirm/alert for
 * destructive or important actions — always a properly styled in-app
 * dialog. That rule was written with `window.confirm` in mind, but the
 * native equivalent is React Native's `Alert.alert`, which is just as much
 * a platform-native, unstyled popup. This component is the mobile
 * counterpart to app/components/ui/ConfirmDialog.tsx on the web — use this
 * (not Alert.alert) for anything destructive: deleting a video, removing a
 * squad member, signing out, etc.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <Pressable className="absolute inset-0" onPress={onCancel} />
        <View
          className="w-full max-w-sm rounded-xl bg-surface dark:bg-surface-dark p-6"
          style={cardElevation(isDark)}
        >
          <Text className="mb-2 text-lg font-semibold text-text-primary dark:text-text-primary-dark">{title}</Text>
          <Text className="mb-6 text-sm text-text-secondary dark:text-text-secondary-dark">{message}</Text>
          <View className="flex-row justify-end gap-3">
            <Button variant="ghost" onPress={onCancel} disabled={isLoading}>
              {cancelLabel}
            </Button>
            <Button variant={variant === "danger" ? "danger" : "primary"} onPress={onConfirm} isLoading={isLoading}>
              {confirmLabel}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
