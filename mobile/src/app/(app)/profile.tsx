import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSelector } from "@/store/hooks";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OptionPicker } from "@/components/ui/OptionPicker";
import { PlayerCardCompact } from "@/components/profile/PlayerCardCompact";
import { AvatarPickerModal } from "@/components/profile/AvatarPickerModal";
import { getMyProfile, updateMyProfile, type MyProfile } from "@/api/users";
import { getPlayerCard, type PlayerCardDto } from "@/api/playerCard";
import { getSelectedAvatarUrl, setSelectedAvatarUrl } from "@/lib/avatarStore";
import { ApiError } from "@/api/client";

const POSITIONS = [
  { value: "batsman", label: "Batsman" },
  { value: "bowler", label: "Bowler" },
  { value: "all-rounder", label: "All-rounder" },
  { value: "wicket-keeper", label: "Wicket-keeper" },
];
const BATTING_STYLES = [
  { value: "right", label: "Right-handed" },
  { value: "left", label: "Left-handed" },
];
const BOWLING_STYLES = [
  { value: "fast", label: "Fast" },
  { value: "medium", label: "Medium" },
  { value: "spin", label: "Spin" },
  { value: "na", label: "N/A" },
];

type FormFields = {
  displayName: string;
  firstName: string;
  lastName: string;
  clubOrSchool: string;
  primaryPosition: string | null;
  battingStyle: string | null;
  bowlingStyle: string | null;
};

/**
 * Real profile screen: editable personal details (GET/PUT /api/users/me --
 * the same endpoint the web Profile page uses), the real player card
 * (GET /api/player-card), and a cosmetic-only avatar picker. Deliberately
 * doesn't include web's "Export My Data" / "Delete Account" buttons -- on
 * web those have no onClick handler at all, and the one real backend route
 * behind "export" is an explicit MVP placeholder that doesn't actually
 * queue anything. Not worth building UI for yet; revisit once there's a
 * real endpoint.
 */
export default function ProfileScreen() {
  const user = useAppSelector((state) => state.auth.user);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [playerCard, setPlayerCard] = useState<PlayerCardDto | null>(null);
  const [cardLoading, setCardLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [fields, setFields] = useState<FormFields>({
    displayName: "",
    firstName: "",
    lastName: "",
    clubOrSchool: "",
    primaryPosition: null,
    battingStyle: null,
    bowlingStyle: null,
  });

  useEffect(() => {
    void getSelectedAvatarUrl().then(setAvatarUrl);
  }, []);

  useEffect(() => {
    let isMounted = true;
    getMyProfile()
      .then((data) => {
        if (!isMounted) return;
        setProfile(data);
        setFields({
          displayName: data.displayName ?? "",
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          clubOrSchool: data.clubOrSchool ?? "",
          primaryPosition: data.primaryPosition,
          battingStyle: data.battingStyle,
          bowlingStyle: data.bowlingStyle,
        });
      })
      .catch((err) => {
        console.error("[profile] Failed to load /api/users/me:", err);
        if (isMounted) setLoadError("Couldn't load your profile right now.");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    getPlayerCard()
      .then((card) => {
        if (isMounted) setPlayerCard(card);
      })
      .catch((err) => {
        console.error("[profile] Failed to load player card:", err);
      })
      .finally(() => {
        if (isMounted) setCardLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectAvatar = async (fullUrl: string) => {
    setAvatarUrl(fullUrl);
    setAvatarModalOpen(false);
    await setSelectedAvatarUrl(fullUrl);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const updated = await updateMyProfile({
        displayName: fields.displayName.trim() || undefined,
        firstName: fields.firstName.trim() || undefined,
        lastName: fields.lastName.trim() || undefined,
        clubOrSchool: fields.clubOrSchool.trim() || undefined,
        primaryPosition: fields.primaryPosition ?? undefined,
        battingStyle: fields.battingStyle ?? undefined,
        bowlingStyle: fields.bowlingStyle ?? undefined,
      });
      setProfile(updated);
      setIsEditing(false);
      setSaveSuccess(true);
    } catch (err) {
      console.error("[profile] Failed to save profile:", err);
      setSaveError(err instanceof ApiError ? err.message : "Couldn't save your profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const initials = `${fields.firstName?.[0] ?? user?.displayName?.[0] ?? "U"}${fields.lastName?.[0] ?? ""}`;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top", "left", "right"]}>
      <ScrollView className="flex-1 px-6 pt-6">
        <Text className="mb-6 text-2xl font-bold text-text-primary">Profile</Text>

        <Card className="mb-6 items-center">
          <View className="relative">
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} className="h-24 w-24 rounded-full bg-surface-secondary" />
            ) : (
              <View className="h-24 w-24 items-center justify-center rounded-full bg-surface-secondary">
                <Text className="text-2xl font-semibold text-primary">{initials}</Text>
              </View>
            )}
            <Pressable
              onPress={() => setAvatarModalOpen(true)}
              accessibilityLabel="Change profile photo"
              className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full bg-primary"
            >
              <Text className="text-white">📷</Text>
            </Pressable>
          </View>
          <Text className="mt-3 text-lg font-semibold text-text-primary">
            {fields.firstName || fields.lastName ? `${fields.firstName} ${fields.lastName}`.trim() : profile?.displayName}
          </Text>
          <Text className="text-sm capitalize text-text-secondary">{profile?.role?.toLowerCase()}</Text>
        </Card>

        <Card className="mb-6">
          <CardHeader>Player Card</CardHeader>
          <CardContent className="items-center">
            {cardLoading ? (
              <ActivityIndicator className="py-6" />
            ) : playerCard ? (
              <PlayerCardCompact card={playerCard} />
            ) : (
              <Text className="text-sm text-text-secondary">
                Your player card will appear here after your first completed analysis.
              </Text>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <View className="mb-4 flex-row items-center justify-between">
            <CardHeader className="mb-0">Personal Details</CardHeader>
            <Pressable
              onPress={() => {
                setIsEditing((prev) => !prev);
                setSaveError(null);
                setSaveSuccess(false);
              }}
            >
              <Text className="text-sm font-medium text-primary">{isEditing ? "Cancel" : "Edit"}</Text>
            </Pressable>
          </View>
          <CardContent>
            {loadError ? <Text className="mb-3 text-sm text-danger">{loadError}</Text> : null}
            <View className="gap-4">
              <Input
                label="Display name"
                value={fields.displayName}
                onChangeText={(v) => setFields((p) => ({ ...p, displayName: v }))}
                editable={isEditing}
              />
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Input
                    label="First name"
                    value={fields.firstName}
                    onChangeText={(v) => setFields((p) => ({ ...p, firstName: v }))}
                    editable={isEditing}
                  />
                </View>
                <View className="flex-1">
                  <Input
                    label="Last name"
                    value={fields.lastName}
                    onChangeText={(v) => setFields((p) => ({ ...p, lastName: v }))}
                    editable={isEditing}
                  />
                </View>
              </View>
              <Input
                label="Club / School"
                value={fields.clubOrSchool}
                onChangeText={(v) => setFields((p) => ({ ...p, clubOrSchool: v }))}
                editable={isEditing}
              />
              {isEditing ? (
                <>
                  <OptionPicker
                    label="Primary position"
                    options={POSITIONS}
                    value={fields.primaryPosition}
                    onChange={(v) => setFields((p) => ({ ...p, primaryPosition: v }))}
                  />
                  <OptionPicker
                    label="Batting style"
                    options={BATTING_STYLES}
                    value={fields.battingStyle}
                    onChange={(v) => setFields((p) => ({ ...p, battingStyle: v }))}
                  />
                  <OptionPicker
                    label="Bowling style"
                    options={BOWLING_STYLES}
                    value={fields.bowlingStyle}
                    onChange={(v) => setFields((p) => ({ ...p, bowlingStyle: v }))}
                  />
                </>
              ) : (
                <View className="gap-2">
                  <Text className="text-sm text-text-secondary">
                    Position: {POSITIONS.find((o) => o.value === fields.primaryPosition)?.label ?? "Not set"}
                  </Text>
                  <Text className="text-sm text-text-secondary">
                    Batting: {BATTING_STYLES.find((o) => o.value === fields.battingStyle)?.label ?? "Not set"}
                  </Text>
                  <Text className="text-sm text-text-secondary">
                    Bowling: {BOWLING_STYLES.find((o) => o.value === fields.bowlingStyle)?.label ?? "Not set"}
                  </Text>
                </View>
              )}
            </View>

            {saveError ? <Text className="mt-3 text-sm text-danger">{saveError}</Text> : null}
            {saveSuccess ? <Text className="mt-3 text-sm text-emerald-700">Profile updated.</Text> : null}

            {isEditing ? (
              <Button className="mt-4" onPress={handleSave} isLoading={isSaving}>
                Save changes
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </ScrollView>

      <AvatarPickerModal
        visible={avatarModalOpen}
        selectedUrl={avatarUrl}
        onClose={() => setAvatarModalOpen(false)}
        onSelect={handleSelectAvatar}
      />
    </SafeAreaView>
  );
}
