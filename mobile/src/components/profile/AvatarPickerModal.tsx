import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { getAvatarCategories, type AvatarCategory } from "@/api/avatars";
import { API_BASE_URL } from "@/api/client";

interface AvatarPickerModalProps {
  visible: boolean;
  selectedUrl: string | null;
  onClose: () => void;
  onSelect: (fullUrl: string) => void;
}

/**
 * Mobile counterpart to app/components/profile/AvatarGalleryModal.tsx.
 * Fetches the real preset-avatar gallery from GET /api/avatars; selection
 * itself stays local-only (see ../../lib/avatarStore.ts) since there's no
 * backend to actually save it to yet.
 */
export function AvatarPickerModal({ visible, selectedUrl, onClose, onSelect }: AvatarPickerModalProps) {
  const [categories, setCategories] = useState<AvatarCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    setError(null);
    getAvatarCategories()
      .then((data) => {
        if (isMounted) setCategories(data);
      })
      .catch((err) => {
        console.error("[AvatarPickerModal] Failed to load avatars:", err);
        if (isMounted) setError("Couldn't load avatars right now.");
      });
    return () => {
      isMounted = false;
    };
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="max-h-[80%] rounded-t-2xl bg-surface dark:bg-surface-dark p-6">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">Choose an avatar</Text>
            <Button variant="ghost" size="sm" onPress={onClose}>
              Close
            </Button>
          </View>

          {error ? <Text className="text-sm text-danger dark:text-danger-dark">{error}</Text> : null}
          {!categories && !error ? (
            <ActivityIndicator className="py-8" />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {categories?.map((category) => (
                <View key={category.key} className="mb-5">
                  <Text className="mb-2 text-sm font-medium text-text-secondary dark:text-text-secondary-dark">{category.label}</Text>
                  <View className="flex-row flex-wrap gap-3">
                    {category.avatars.map((avatar) => {
                      const fullUrl = `${API_BASE_URL}${avatar.url}`;
                      const selected =
                        selectedUrl === fullUrl ||
                        selectedUrl === avatar.url ||
                        selectedUrl === `${API_BASE_URL}${avatar.url}`;
                      return (
                        <Pressable
                          key={avatar.id}
                          onPress={() => onSelect(fullUrl)}
                          className={`rounded-full border-2 ${selected ? "border-primary" : "border-transparent"}`}
                        >
                          <Image source={{ uri: fullUrl }} className="h-16 w-16 rounded-full bg-surface-secondary dark:bg-surface-secondary-dark" />
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
              {categories?.length === 0 ? (
                <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">No avatars available.</Text>
              ) : null}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
