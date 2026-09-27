import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/ui/BackBar";
import { Card, CardContent } from "@/components/ui/Card";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useAppSelector } from "@/store/hooks";
import { ApiError } from "@/api/client";
import { getClubBadgeUrl, getClubBannerUrl, getMyClubs, type ClubSummary } from "@/api/clubs";
import { resolveAssetUrl } from "@/lib/mediaUrl";

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
    <SafeAreaView className="flex-1 bg-surface-secondary dark:bg-surface-secondary-dark" edges={["top", "left", "right"]}>
      <BackBar label="Dashboard" />
      <Text className="px-6 pt-2 text-2xl font-bold text-text-primary dark:text-text-primary-dark">Clubs</Text>

      <ScrollView className="flex-1 px-6">
        <View className="gap-3 pb-10 pt-3">
          {!isCoachOrAdmin ? (
            <Card>
              <CardContent>
                <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">
                  Club management is only available to coaches right now -- there's no real "which
                  club am I in" lookup on the backend yet for players or parents.
                </Text>
              </CardContent>
            </Card>
          ) : loading ? (
            <ActivityIndicator className="pt-8" />
          ) : error ? (
            <Text className="text-sm text-danger dark:text-danger-dark">{error}</Text>
          ) : clubs.length === 0 ? (
            <Card>
              <CardContent>
                <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">
                  You haven't set up a club yet. Head to the web app to create one.
                </Text>
              </CardContent>
            </Card>
          ) : (
            clubs.map((club) => {
              const bannerUri = resolveAssetUrl(getClubBannerUrl(club));
              const badgeUri = resolveAssetUrl(getClubBadgeUrl(club));
              return (
                <Card key={club.id} className="overflow-hidden p-0">
                  <View className="relative min-h-40">
                    {bannerUri ? (
                      <Image source={{ uri: bannerUri }} className="absolute inset-0 h-full w-full" resizeMode="cover" />
                    ) : null}
                    {bannerUri ? <View className="absolute inset-0 bg-black/35" /> : null}
                    <CardContent className="relative p-5">
                      <View className="flex-row items-center gap-3">
                        <UserAvatar name={club.name} uri={badgeUri} size={44} />
                        <Text
                          className={`flex-1 text-base font-semibold ${
                            bannerUri
                              ? "text-white"
                              : "text-text-primary dark:text-text-primary-dark"
                          }`}
                        >
                          {club.name}
                        </Text>
                      </View>
                      <Text
                        className={`mt-1 text-sm ${
                          bannerUri ? "text-white/85" : "text-text-secondary dark:text-text-secondary-dark"
                        }`}
                      >
                        {club.address}
                        {club.postcode ? `, ${club.postcode}` : ""}
                      </Text>
                      <View className="mt-3 flex-row flex-wrap gap-2">
                        <View className="rounded-full bg-surface/90 dark:bg-surface-dark/90 px-3 py-1">
                          <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">
                            {club.stats.playersCoached} players
                          </Text>
                        </View>
                        <View className="rounded-full bg-surface/90 dark:bg-surface-dark/90 px-3 py-1">
                          <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">
                            {club.stats.juniors} juniors
                          </Text>
                        </View>
                        <View className="rounded-full bg-surface/90 dark:bg-surface-dark/90 px-3 py-1">
                          <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">
                            {club.stats.seniors} seniors
                          </Text>
                        </View>
                        <View className="rounded-full bg-surface/90 dark:bg-surface-dark/90 px-3 py-1">
                          <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">
                            {club.stats.sessionsThisMonth} sessions this month
                          </Text>
                        </View>
                      </View>
                    </CardContent>
                  </View>
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
