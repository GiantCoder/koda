import React, { useState } from "react";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OptionPicker } from "@/components/ui/OptionPicker";

// Values match app/api/auth/schema.ts's registerSchema role enum exactly
// (unlike the web /onboarding/role page, this selection is actually sent to
// the register call -- see the Phase 1 discussion for why).
const ROLES = [
  { value: "PLAYER", label: "Player", description: "I'm a young cricketer aged 7-18" },
  { value: "PARENT", label: "Parent", description: "I manage my child's cricket journey" },
  { value: "COACH", label: "Coach", description: "I coach and support players" },
];

export default function RoleScreen() {
  const [role, setRole] = useState<string | null>(null);

  return (
    <SafeAreaView className="flex-1 justify-center bg-surface dark:bg-surface-dark px-6">
      <Card>
        <CardHeader>Choose Your Role</CardHeader>
        <CardContent>
          <Text className="mb-6 text-sm text-text-secondary dark:text-text-secondary-dark">
            Select one role to determine your experience.
          </Text>
          <OptionPicker layout="cards" options={ROLES} value={role} onChange={setRole} />
          <Button
            className="mt-6"
            disabled={!role}
            onPress={() => router.push({ pathname: "/(auth)/register", params: { role: role! } })}
          >
            Next
          </Button>
        </CardContent>
      </Card>
    </SafeAreaView>
  );
}
