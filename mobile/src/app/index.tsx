import { ActivityIndicator, Text } from "react-native";
import { Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSelector } from "@/store/hooks";

/**
 * Gatekeeper screen. Every other screen assumes it got here through this
 * redirect logic, so it never has to re-check auth/onboarding state itself.
 *
 * onboardingComplete === false always routes to /(onboarding)/consent, even
 * for a user who's already past the consent step -- that screen re-checks
 * the real consent status on mount and redirects itself onward to privacy
 * when it's not (or no longer) needed. See its comments for why that's the
 * simplest correct place to put this "resume where you left off" logic
 * given there's no server-side "onboarding step" field to resume from.
 */
export default function Gatekeeper() {
  const { status, onboardingComplete } = useAppSelector((state) => state.auth);

  if (status === "checkingSession" || (status === "signedIn" && onboardingComplete === null)) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface dark:bg-surface-dark">
        <ActivityIndicator size="large" color="#208AEF" />
        <Text className="mt-3 text-sm text-text-secondary dark:text-text-secondary-dark">Loading…</Text>
      </SafeAreaView>
    );
  }

  if (status !== "signedIn") {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (!onboardingComplete) {
    return <Redirect href="/(onboarding)/consent" />;
  }

  return <Redirect href="/(app)/dashboard" />;
}
