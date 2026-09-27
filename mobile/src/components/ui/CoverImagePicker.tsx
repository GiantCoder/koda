import React from "react";
import { Image, Text, View } from "react-native";
import { Button } from "./Button";
import { resolveAssetUrl } from "@/lib/mediaUrl";

export function CoverImagePicker({
  previewUri,
  isLoading,
  error,
  onPick,
}: {
  previewUri?: string | null;
  isLoading?: boolean;
  error?: string | null;
  onPick: () => void;
}) {
  const resolved = resolveAssetUrl(previewUri);

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-text-primary dark:text-text-primary-dark">Background image</Text>
      {resolved ? (
        <Image source={{ uri: resolved }} className="h-28 w-full rounded-lg" resizeMode="cover" />
      ) : (
        <View className="h-28 items-center justify-center rounded-lg bg-surface-secondary dark:bg-surface-secondary-dark">
          <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">No background yet</Text>
        </View>
      )}
      <Button variant="secondary" size="sm" onPress={onPick} isLoading={isLoading}>
        {resolved ? "Change background" : "Add background"}
      </Button>
      {error ? <Text className="text-sm text-danger dark:text-danger-dark">{error}</Text> : null}
    </View>
  );
}
