import React, { useState } from "react";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logoutThunk } from "@/store/authSlice";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/**
 * Still the Phase 0 placeholder -- Phase 2 (Dashboard + Profile/Settings)
 * replaces this with the real thing. Its job right now is just to be the
 * landing spot a fully onboarded, signed-in user reaches.
 */
export default function DashboardScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <SafeAreaView className="flex-1 justify-center bg-surface px-6">
      <Card>
        <CardHeader>Koda Mobile</CardHeader>
        <CardContent>
          <Text className="mb-1 text-base text-text-primary">Signed in as {user?.displayName}</Text>
          <Text className="mb-6 text-sm text-text-secondary">
            {user?.email} · {user?.role}
          </Text>
          <Button variant="danger" onPress={() => setConfirmingSignOut(true)}>
            Sign out
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmingSignOut}
        title="Sign out of Koda?"
        message="You'll need to sign back in to see your dashboard."
        confirmLabel="Sign out"
        variant="danger"
        isLoading={isSigningOut}
        onCancel={() => setConfirmingSignOut(false)}
        onConfirm={() => {
          setConfirmingSignOut(false);
          setIsSigningOut(true);
          dispatch(logoutThunk()).finally(() => setIsSigningOut(false));
        }}
      />
    </SafeAreaView>
  );
}
