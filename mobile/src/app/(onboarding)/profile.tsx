import React, { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { KeyboardAwareScreen } from "@/components/ui/KeyboardAwareScreen";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OptionPicker } from "@/components/ui/OptionPicker";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { completeOnboardingThunk } from "@/store/authSlice";
import { updateProfile } from "@/api/onboarding";

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

// No avatar picker yet (web's version pulls from /api/avatars) -- small
// enough to be its own follow-up rather than blocking Phase 1 on it.
export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [clubOrSchool, setClubOrSchool] = useState("");
  const [position, setPosition] = useState<string | null>(null);
  const [battingStyle, setBattingStyle] = useState<string | null>(null);
  const [bowlingStyle, setBowlingStyle] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFinish = async () => {
    setError(null);
    setSaving(true);
    try {
      await updateProfile({
        displayName: displayName.trim() || undefined,
        clubOrSchool: clubOrSchool.trim() || undefined,
        primaryPosition: position ?? undefined,
        battingStyle: battingStyle ?? undefined,
        bowlingStyle: bowlingStyle ?? undefined,
      });
      await dispatch(completeOnboardingThunk());
      router.replace("/");
    } catch (err) {
      console.error("[onboarding/profile] Failed to save profile:", err);
      setError("Couldn't save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAwareScreen>
      <Card>
          <CardHeader>Complete Your Profile</CardHeader>
          <CardContent>
            <Text className="mb-6 text-sm text-text-secondary dark:text-text-secondary-dark">
              Add a few details to personalise your experience. You can change these later.
            </Text>
            <View className="gap-4">
              <Input label="Display name" value={displayName} onChangeText={setDisplayName} autoCapitalize="words" />
              <Input label="Club / School" value={clubOrSchool} onChangeText={setClubOrSchool} placeholder="Optional" />
              <OptionPicker label="Primary position" options={POSITIONS} value={position} onChange={setPosition} />
              <OptionPicker label="Batting style" options={BATTING_STYLES} value={battingStyle} onChange={setBattingStyle} />
              <OptionPicker label="Bowling style" options={BOWLING_STYLES} value={bowlingStyle} onChange={setBowlingStyle} />
            </View>
            {error ? <Text className="mt-4 text-sm text-danger dark:text-danger-dark">{error}</Text> : null}
            <Button className="mt-6" onPress={handleFinish} isLoading={saving}>
              Finish setup
            </Button>
          </CardContent>
      </Card>
    </KeyboardAwareScreen>
  );
}
