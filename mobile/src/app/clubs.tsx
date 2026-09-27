import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/ui/BackBar";
import { Card, CardContent } from "@/components/ui/Card";
import { GroupCoverCard } from "@/components/ui/GroupCoverCard";
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
              const address = `${club.address}${club.postcode ? `, ${club.postcode}` : ""}`;
              return (
                <GroupCoverCard
                  key={club.id}
                  title={club.name}
                  subtitle={address}
                  coverUri={bannerUri}
                  avatarUri={badgeUri}
                  avatarName={club.name}
                  avatarId={club.id}
                  badges={[
                    `${club.stats.playersCoached} players`,
                    `${club.stats.juniors} juniors`,
                    `${club.stats.seniors} seniors`,
                    `${club.stats.sessionsThisMonth} sessions this month`,
                  ]}
                />
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
