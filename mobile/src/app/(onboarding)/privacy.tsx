import React, { useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OptionPicker } from "@/components/ui/OptionPicker";
import { updatePrivacyPreferences } from "@/api/onboarding";

const VISIBILITY_OPTIONS = [
  { value: "PUBLIC", label: "Public" },
  { value: "COACHES_PARENTS", label: "Coaches & Parents" },
  { value: "COACHES_ONLY", label: "Coaches Only" },
];

function ToggleRow({
  title,
  description,
  value,
  onChange,
  locked = false,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange?: (value: boolean) => void;
  locked?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between rounded-lg bg-surface-secondary p-4">
      <View className="mr-4 flex-1">
        <Text className="font-medium text-text-primary">{title}</Text>
        <Text className="text-sm text-text-secondary">{description}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} disabled={locked} />
    </View>
  );
}

// profileVisibility lives on this screen (not the Profile screen, despite
// that being where the web app's mock puts it) because it's actually part
// of app/api/onboarding/privacy's request body, not the profile endpoint's.
export default function PrivacyScreen() {
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [comms, setComms] = useState(true);
  const [visibility, setVisibility] = useState("COACHES_PARENTS");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    setError(null);
    setSaving(true);
    try {
      await updatePrivacyPreferences({
        performanceAnalytics: analytics,
        marketingCommunications: marketing,
        coachParentComms: comms,
        profileVisibility: visibility as never,
      });
      router.push("/(onboarding)/profile");
    } catch (err) {
      console.error("[onboarding/privacy] Failed to save privacy preferences:", err);
      setError("Couldn't save your preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-10">
        <Card>
          <CardHeader>Data &amp; Privacy</CardHeader>
          <CardContent>
            <Text className="mb-6 text-sm text-text-secondary">
              We collect and use your data as described below. You can adjust these any time in
              Settings.
            </Text>
            <View className="gap-3">
              <ToggleRow
                title="Essential data"
                description="Required for the service to function. Cannot be disabled."
                value={true}
                locked
              />
              <ToggleRow
                title="Performance & analytics"
                description="Helps us improve the product."
                value={analytics}
                onChange={setAnalytics}
              />
              <ToggleRow
                title="Marketing updates"
                description="Product news and offers."
                value={marketing}
                onChange={setMarketing}
              />
              <ToggleRow
                title="Coach-parent communication"
                description="Messaging between coaches and parents."
                value={comms}
                onChange={setComms}
              />
              <OptionPicker label="Profile visibility" options={VISIBILITY_OPTIONS} value={visibility} onChange={setVisibility} />
            </View>
            {error ? <Text className="mt-4 text-sm text-danger">{error}</Text> : null}
            <Button className="mt-6" onPress={handleContinue} isLoading={saving}>
              Continue
            </Button>
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
