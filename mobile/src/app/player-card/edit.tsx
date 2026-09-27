import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { BackBar } from "@/components/ui/BackBar";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { OptionPicker, type Option } from "@/components/ui/OptionPicker";
import { Ionicons } from "@expo/vector-icons";
import { useSecondaryIconColor } from "@/components/ui/useIconColor";
import { ApiError } from "@/api/client";
import {
  getPlayerCard,
  updatePlayerCard,
  uploadPlayerCardImage,
  type PlayerCardDto,
} from "@/api/playerCard";

/**
 * Player card editor -- Phase 7, resolving Phase 2's deferred customization.
 * Real PUT + real image upload. AI-generated backgrounds are intentionally
 * left out (see api/playerCard.ts) -- only DEFAULT and UPLOAD background
 * modes are offered here.
 */

const TIER_OPTIONS: Option[] = [
  { value: "BRONZE", label: "Bronze" },
  { value: "SILVER", label: "Silver" },
  { value: "GOLD", label: "Gold" },
  { value: "ELITE", label: "Elite" },
];
const ROLE_OPTIONS: Option[] = [
  { value: "BAT", label: "Batter" },
  { value: "BWL", label: "Bowler" },
  { value: "ALL", label: "All-rounder" },
  { value: "WKT", label: "Wicket Keeper" },
];
const SPORT_ICON_OPTIONS: Option[] = [
  { value: "BAT_ICON", label: "Bat" },
  { value: "BALL_ICON", label: "Ball" },
  { value: "GLOVES_ICON", label: "Gloves" },
];
const BACKGROUND_MODE_OPTIONS: Option[] = [
  { value: "DEFAULT", label: "Default" },
  { value: "UPLOAD", label: "My Photo" },
];

const STAT_FIELDS: { key: keyof Pick<PlayerCardDto, "statTec" | "statPow" | "statTim" | "statCon" | "statPac" | "statFie">; label: string }[] = [
  { key: "statTec", label: "Technique" },
  { key: "statPow", label: "Power" },
  { key: "statTim", label: "Timing" },
  { key: "statCon", label: "Consistency" },
  { key: "statPac", label: "Pace" },
  { key: "statFie", label: "Fielding" },
];

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-sm text-text-primary dark:text-text-primary-dark">{label}</Text>
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => onChange(Math.max(1, value - 1))}
          className="h-8 w-8 items-center justify-center rounded-full bg-surface-secondary dark:bg-surface-secondary-dark"
          hitSlop={8}
        >
          <Text className="text-base font-bold text-text-primary dark:text-text-primary-dark">−</Text>
        </Pressable>
        <Text className="w-8 text-center text-base font-semibold text-text-primary dark:text-text-primary-dark">{value}</Text>
        <Pressable
          onPress={() => onChange(Math.min(99, value + 1))}
          className="h-8 w-8 items-center justify-center rounded-full bg-surface-secondary dark:bg-surface-secondary-dark"
          hitSlop={8}
        >
          <Text className="text-base font-bold text-text-primary dark:text-text-primary-dark">+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function PlayerCardEditScreen() {
  const iconColor = useSecondaryIconColor();
  const [card, setCard] = useState<PlayerCardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);

  useEffect(() => {
    getPlayerCard()
      .then(setCard)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load player card"))
      .finally(() => setLoading(false));
  }, []);

  const patch = useCallback((updates: Partial<PlayerCardDto>) => {
    setCard((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const pickImage = useCallback(async (target: "photo" | "background") => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library access is needed to choose an image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const setUploading = target === "photo" ? setUploadingPhoto : setUploadingBackground;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadPlayerCardImage({
        fileUri: asset.uri,
        fileName: asset.fileName ?? `${target}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
      });
      if (target === "photo") {
        patch({ profilePhotoUrl: url });
      } else {
        patch({ backgroundUrl: url, backgroundMode: "UPLOAD" });
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to upload image");
    } finally {
      setUploading(false);
    }
  }, [patch]);

  const handleSave = useCallback(async () => {
    if (!card) return;
    if (!card.displayName.trim()) {
      setError("Display name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updatePlayerCard({
        displayName: card.displayName.trim(),
        tier: card.tier,
        role: card.role,
        sportIcon: card.sportIcon,
        statTec: card.statTec,
        statPow: card.statPow,
        statTim: card.statTim,
        statCon: card.statCon,
        statPac: card.statPac,
        statFie: card.statFie,
        profilePhotoUrl: card.profilePhotoUrl,
        backgroundUrl: card.backgroundMode === "UPLOAD" ? card.backgroundUrl : null,
        backgroundMode: card.backgroundMode === "UPLOAD" ? "UPLOAD" : "DEFAULT",
      });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save your card");
    } finally {
      setSaving(false);
    }
  }, [card]);

  return (
    <SafeAreaView className="flex-1 bg-surface-secondary dark:bg-surface-secondary-dark" edges={["top", "left", "right"]}>
      <BackBar label="Profile" />
      <Text className="px-6 pt-2 text-2xl font-bold text-text-primary dark:text-text-primary-dark">Edit Player Card</Text>

      {loading ? (
        <View className="items-center pt-12">
          <ActivityIndicator />
        </View>
      ) : !card ? (
        <Text className="px-6 pt-6 text-sm text-danger dark:text-danger-dark">{error}</Text>
      ) : (
        <ScrollView className="flex-1 px-6">
          <View className="gap-4 pb-10 pt-3">
            <Input
              label="Display name"
              value={card.displayName}
              onChangeText={(t) => patch({ displayName: t.slice(0, 20) })}
              maxLength={20}
            />

            <View>
              <Text className="mb-1.5 text-sm font-medium text-text-primary dark:text-text-primary-dark">Profile photo</Text>
              <View className="flex-row items-center gap-3">
                {card.profilePhotoUrl ? (
                  <Image source={{ uri: card.profilePhotoUrl }} className="h-16 w-16 rounded-full bg-surface-secondary dark:bg-surface-secondary-dark" />
                ) : (
                  <View className="h-16 w-16 items-center justify-center rounded-full bg-surface-secondary dark:bg-surface-secondary-dark">
                    <Ionicons name="baseball-outline" size={28} color={iconColor} />
                  </View>
                )}
                <Button variant="secondary" size="sm" onPress={() => void pickImage("photo")} isLoading={uploadingPhoto}>
                  Change Photo
                </Button>
              </View>
            </View>

            <OptionPicker
              label="Tier"
              options={TIER_OPTIONS}
              value={card.tier}
              onChange={(v) => patch({ tier: v as PlayerCardDto["tier"] })}
            />
            <OptionPicker
              label="Role"
              options={ROLE_OPTIONS}
              value={card.role}
              onChange={(v) => patch({ role: v as PlayerCardDto["role"] })}
            />
            <OptionPicker
              label="Icon"
              options={SPORT_ICON_OPTIONS}
              value={card.sportIcon}
              onChange={(v) => patch({ sportIcon: v as PlayerCardDto["sportIcon"] })}
            />

            <View>
              <Text className="mb-1 text-sm font-medium text-text-primary dark:text-text-primary-dark">Stats</Text>
              <View className="rounded-lg bg-surface-secondary dark:bg-surface-secondary-dark/40 px-3">
                {STAT_FIELDS.map(({ key, label }) => (
                  <Stepper key={key} label={label} value={card[key]} onChange={(v) => patch({ [key]: v } as Partial<PlayerCardDto>)} />
                ))}
              </View>
            </View>

            <OptionPicker
              label="Background"
              options={BACKGROUND_MODE_OPTIONS}
              value={card.backgroundMode === "AI" ? "DEFAULT" : card.backgroundMode}
              onChange={(v) => patch({ backgroundMode: v as PlayerCardDto["backgroundMode"] })}
            />
            {card.backgroundMode === "UPLOAD" ? (
              <View className="flex-row items-center gap-3">
                {card.backgroundUrl ? (
                  <Image source={{ uri: card.backgroundUrl }} className="h-16 w-24 rounded-lg bg-surface-secondary dark:bg-surface-secondary-dark" />
                ) : (
                  <View className="h-16 w-24 items-center justify-center rounded-lg bg-surface-secondary dark:bg-surface-secondary-dark">
                    <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">No image</Text>
                  </View>
                )}
                <Button variant="secondary" size="sm" onPress={() => void pickImage("background")} isLoading={uploadingBackground}>
                  Change Background
                </Button>
              </View>
            ) : null}

            {error ? <Text className="text-sm text-danger dark:text-danger-dark">{error}</Text> : null}
            <Button onPress={() => void handleSave()} isLoading={saving}>
              Save Card
            </Button>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
