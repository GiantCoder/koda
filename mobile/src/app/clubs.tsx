import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/ui/BackBar";
import { Card, CardContent } from "@/components/ui/Card";
import { useAppSelector } from "@/store/hooks";
import { ApiError } from "@/api/client";
import { getMyClubs, type ClubSummary } from "@/api/clubs";

/**
 * Clubs -- Phase 7, deliberately minimal per both the user's decision and
 * a real backend constraint found afterward: GET /api/clubs is coach/
 * admin-only (a player/parent has no real "my club" lookup at all -- see
 * api/clubs.ts), so this screen only renders for those roles. Read-only:
 * no create/edit, and no fabricated rating stat.
 */
export default function ClubsScreen() {
  const isCoachOrAdmin = useAppSelector(
    (state) => state.auth.user?.role === "COACH" || state.auth.user?.role === "ADMIN"
  );
  const [clubs, setClubs] = useState<ClubSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isCoachOrAdmin) {
      setLoading(false);
      return;
    }
    getMyClubs()
      .then(setClubs)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load clubs"))
      .finally(() => setLoading(false));
  }, [isCoachOrAdmin]);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top", "left", "right"]}>
      <BackBar label="Dashboard" />
      <Text className="px-6 pt-2 text-2xl font-bold text-text-primary">Clubs</Text>

      <ScrollView className="flex-1 px-6">
        <View className="gap-3 pb-10 pt-3">
          {!isCoachOrAdmin ? (
            <Card>
              <CardContent>
                <Text className="text-sm text-text-secondary">
                  Club management is only available to coaches right now -- there's no real "which
                  club am I in" lookup on the backend yet for players or parents.
                </Text>
              </CardContent>
            </Card>
          ) : loading ? (
            <ActivityIndicator className="pt-8" />
          ) : error ? (
            <Text className="text-sm text-danger">{error}</Text>
          ) : clubs.length === 0 ? (
            <Card>
              <CardContent>
                <Text className="text-sm text-text-secondary">
                  You haven't set up a club yet. Head to the web app to create one.
                </Text>
              </CardContent>
            </Card>
          ) : (
            clubs.map((club) => (
              <Card key={club.id}>
                <CardContent>
                  <Text className="text-base font-semibold text-text-primary">{club.name}</Text>
                  <Text className="mt-0.5 text-sm text-text-secondary">
                    {club.address}
                    {club.postcode ? `, ${club.postcode}` : ""}
                  </Text>
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    <View className="rounded-full bg-surface-secondary px-3 py-1">
                      <Text className="text-xs text-text-secondary">{club.stats.playersCoached} players</Text>
                    </View>
                    <View className="rounded-full bg-surface-secondary px-3 py-1">
                      <Text className="text-xs text-text-secondary">{club.stats.juniors} juniors</Text>
                    </View>
                    <View className="rounded-full bg-surface-secondary px-3 py-1">
                      <Text className="text-xs text-text-secondary">{club.stats.seniors} seniors</Text>
                    </View>
                    <View className="rounded-full bg-surface-secondary px-3 py-1">
                      <Text className="text-xs text-text-secondary">
                        {club.stats.sessionsThisMonth} sessions this month
                      </Text>
                    </View>
                  </View>
                </CardContent>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
