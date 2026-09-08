import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { Button } from "@/components/ui/Button";

/**
 * Deliberately not a port of app/page.tsx (the web landing page) -- that's a
 * long scrolling marketing page with feature lists and a footer, which is a
 * web-marketing-site pattern, not a mobile-app-launch pattern. A phone's
 * "first screen after opening the app" is normally just branding + the two
 * entry points; the marketing job is done by the App Store listing instead.
 */
export default function WelcomeScreen() {
  return (
    <SafeAreaView className="flex-1 justify-between bg-surface px-6 py-10">
      <View />
      <View className="items-center">
        <View className="mb-2 rounded-full bg-primary/10 px-4 py-1">
          <Text className="text-xs font-semibold text-primary">Ages 7-18 · Built for families</Text>
        </View>
        <Text className="mt-4 text-center text-4xl font-bold text-text-primary">Koda Cricket</Text>
        <Text className="mt-4 text-center text-base text-text-secondary">
          The complete junior cricket development platform connecting coaches, parents, and young
          athletes.
        </Text>
      </View>
      <View className="gap-3">
        <Link href="/(auth)/role" asChild>
          <Button size="lg">Get Started</Button>
        </Link>
        <Link href="/(auth)/login" asChild>
          <Button variant="secondary" size="lg">
            Sign In
          </Button>
        </Link>
      </View>
    </SafeAreaView>
  );
}
