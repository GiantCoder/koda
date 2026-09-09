import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/ui/BackBar";
import { OptionPicker, type Option } from "@/components/ui/OptionPicker";
import { useAppSelector } from "@/store/hooks";
import { ApiError } from "@/api/client";
import { getMyProfile } from "@/api/users";
import { getGlobalLeaderboard, type LeagueEntry, type AgeGroup } from "@/api/leagues";

const AGE_GROUP_OPTIONS: Option[] = [
  { value: "UNDER_10", label: "U10" },
  { value: "UNDER_12", label: "U12" },
  { value: "UNDER_14", label: "U14" },
  { value: "UNDER_16", label: "U16" },
  { value: "UNDER_18", label: "U18" },
  { value: "SENIOR", label: "Senior" },
];

/**
 * Koda Global -- browse-only by design (see api/leagues.ts's comment):
 * there's no real, discoverable way for a user to join this league, so
 * unlike leagues/index.tsx this screen has no "Join" action.
 */
export default function GlobalLeaderboardScreen() {
  const currentUserId = useAppSelector((state) => state.auth.user?.id);
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [entries, setEntries] = useState<LeagueEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyProfile()
      .then((profile) => setAgeGroup((profile.ageGroup as AgeGroup) ?? "SENIOR"))
      .catch(() => setAgeGroup("SENIOR"));
  }, []);

  const load = useCallback(async (group: AgeGroup) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getGlobalLeaderboard(group, { limit: 30 });
      setEntries(result.entries);
      setNextCursor(result.nextCursor);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ageGroup) void load(ageGroup);
  }, [ageGroup, load]);

  const loadMore = useCallback(async () => {
    if (!ageGroup || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await getGlobalLeaderboard(ageGroup, { limit: 30, cursor: nextCursor });
      setEntries((prev) => [...prev, ...result.entries]);
      setNextCursor(result.nextCursor);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  }, [ageGroup, nextCursor, loadingMore]);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top", "left", "right"]}>
      <BackBar label="Leagues" />
      <Text className="px-6 pt-2 text-2xl font-bold text-text-primary">🌍 Koda Global</Text>
      <View className="px-6 pt-3">
        <OptionPicker
          options={AGE_GROUP_OPTIONS}
          value={ageGroup}
          onChange={(v) => setAgeGroup(v as AgeGroup)}
        />
      </View>

      {loading ? (
        <View className="items-center pt-12">
          <ActivityIndicator />
        </View>
      ) : error ? (
        <Text className="px-6 pt-6 text-sm text-danger">{error}</Text>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 }}
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator className="py-4" /> : null}
          renderItem={({ item, index }) => (
            <View
              className={`flex-row items-center gap-3 rounded-lg p-3 ${
                item.userId === currentUserId ? "bg-primary/10" : ""
              }`}
            >
              <View className="w-10 items-center">
                <Text className="text-base font-bold text-text-primary">{index + 1}</Text>
              </View>
              <Text className="flex-1 text-text-primary" numberOfLines={1}>
                {item.user.displayName}
                {item.userId === currentUserId ? " (you)" : ""}
              </Text>
              <Text className="text-sm font-medium text-text-primary">{item.points} pts</Text>
            </View>
          )}
          ListEmptyComponent={
            <Text className="text-sm text-text-secondary">No entries for this age group yet.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}
