import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { BackBar } from "@/components/ui/BackBar";
import { useAppSelector } from "@/store/hooks";
import { ApiError } from "@/api/client";
import { getLeagueTable, type LeagueEntry } from "@/api/leagues";

function RankBadge({ rank }: { rank: number | null }) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
  return (
    <View className="w-10 items-center">
      <Text className="text-base font-bold text-text-primary">{medal ?? (rank ?? "—")}</Text>
    </View>
  );
}

export default function LeagueStandingsScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const currentUserId = useAppSelector((state) => state.auth.user?.id);

  const [entries, setEntries] = useState<LeagueEntry[]>([]);
  const [userEntry, setUserEntry] = useState<LeagueEntry | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!leagueId) return;
    setError(null);
    try {
      const result = await getLeagueTable(leagueId, { limit: 30 });
      setEntries(result.entries);
      setUserEntry(result.userEntry);
      setNextCursor(result.nextCursor);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load standings");
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!leagueId || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await getLeagueTable(leagueId, { limit: 30, cursor: nextCursor });
      setEntries((prev) => [...prev, ...result.entries]);
      setNextCursor(result.nextCursor);
    } catch {
      // silent -- pagination failure isn't worth interrupting the list
    } finally {
      setLoadingMore(false);
    }
  }, [leagueId, nextCursor, loadingMore]);

  if (!leagueId) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface">
        <Text className="text-text-secondary">No league specified.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top", "left", "right"]}>
      <BackBar label="Leagues" />
      <Text className="px-6 pt-2 text-2xl font-bold text-text-primary">Standings</Text>

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
          ListFooterComponent={
            <>
              {loadingMore ? <ActivityIndicator className="py-4" /> : null}
              {userEntry ? (
                <View className="mt-4 flex-row items-center gap-3 rounded-lg bg-primary/10 p-3">
                  <RankBadge rank={userEntry.currentRank} />
                  <Text className="flex-1 font-semibold text-text-primary">{userEntry.user.displayName} (you)</Text>
                  <Text className="text-sm font-medium text-text-primary">{userEntry.points} pts</Text>
                </View>
              ) : null}
            </>
          }
          renderItem={({ item }) => (
            <View
              className={`flex-row items-center gap-3 rounded-lg p-3 ${
                item.userId === currentUserId ? "bg-primary/10" : ""
              }`}
            >
              <RankBadge rank={item.currentRank} />
              <Text className="flex-1 text-text-primary" numberOfLines={1}>
                {item.user.displayName}
                {item.userId === currentUserId ? " (you)" : ""}
              </Text>
              {item.goldStars > 0 ? (
                <Text className="text-xs text-text-secondary">⭐️{item.goldStars}</Text>
              ) : null}
              <Text className="text-sm font-medium text-text-primary">{item.points} pts</Text>
            </View>
          )}
          ListEmptyComponent={
            <Text className="text-sm text-text-secondary">No one has scored in this season yet.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}
