import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/ui/BackBar";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScreenTitle } from "@/components/ui/ScreenTitle";
import { Ionicons } from "@expo/vector-icons";
import { ApiError } from "@/api/client";
import {
  getGamificationSummary,
  getBadges,
  getPointsHistory,
  type GamificationSummary,
  type BadgeCatalogueEntry,
  type PointTransaction,
  type BadgeRarity,
} from "@/api/gamification";

/**
 * Achievements -- Phase 7. See api/gamification.ts: this surfaces a fully
 * real backend that, until now, had no UI anywhere (web included). Badge
 * icons are rendered as a rarity-tier vector icon rather than web's iconKey
 * slugs (e.g. "badge-first-touch") -- those slugs have no matching art
 * asset in either codebase, just a naming convention, so a real icon set
 * would need designing regardless of platform.
 */

const RARITY_ICON: Record<BadgeRarity, { name: React.ComponentProps<typeof Ionicons>["name"]; color: string }> = {
  COMMON: { name: "medal-outline", color: "#B45309" },
  UNCOMMON: { name: "medal-outline", color: "#9CA3AF" },
  RARE: { name: "medal", color: "#F59E0B" },
  EPIC: { name: "trophy", color: "#E63946" },
  LEGENDARY: { name: "diamond", color: "#2D6A4F" },
};

const PAGE_SIZE = 10;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function AchievementsScreen() {
  const [summary, setSummary] = useState<GamificationSummary | null>(null);
  const [badges, setBadges] = useState<BadgeCatalogueEntry[]>([]);
  const [history, setHistory] = useState<PointTransaction[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [summaryData, badgesData, historyData] = await Promise.all([
        getGamificationSummary(),
        getBadges(),
        getPointsHistory({ limit: PAGE_SIZE }),
      ]);
      setSummary(summaryData);
      setBadges(badgesData);
      setHistory(historyData.transactions);
      setHistoryCursor(historyData.nextCursor);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load achievements");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMoreHistory = useCallback(async () => {
    if (!historyCursor || historyLoading) return;
    setHistoryLoading(true);
    try {
      const result = await getPointsHistory({ limit: PAGE_SIZE, cursor: historyCursor });
      setHistory((prev) => [...prev, ...result.transactions]);
      setHistoryCursor(result.nextCursor);
    } catch {
      // silent -- pagination failure isn't worth interrupting the screen
    } finally {
      setHistoryLoading(false);
    }
  }, [historyCursor, historyLoading]);

  return (
    <SafeAreaView className="flex-1 bg-surface-secondary dark:bg-surface-secondary-dark" edges={["top", "left", "right"]}>
      <BackBar label="Dashboard" />
      <ScreenTitle className="px-6 pt-2">Achievements</ScreenTitle>

      {loading ? (
        <View className="items-center pt-12">
          <ActivityIndicator />
        </View>
      ) : error && !summary ? (
        <Text className="px-6 pt-6 text-sm text-danger dark:text-danger-dark">{error}</Text>
      ) : (
        <ScrollView
          className="flex-1 px-6"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
            />
          }
        >
          <View className="gap-4 pb-10 pt-3">
            {summary ? (
              <View className="flex-row flex-wrap gap-2">
                <View className="flex-1 min-w-[45%] items-center rounded-lg bg-surface-secondary dark:bg-surface-secondary-dark py-4">
                  <Text className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">{summary.totalPoints}</Text>
                  <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">Total points</Text>
                </View>
                <View className="flex-1 min-w-[45%] items-center rounded-lg bg-surface-secondary dark:bg-surface-secondary-dark py-4">
                  <Text className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">{summary.goldStarCount}</Text>
                  <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">Gold stars</Text>
                </View>
                <View className="flex-1 min-w-[45%] items-center rounded-lg bg-surface-secondary dark:bg-surface-secondary-dark py-4">
                  <Text className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">{summary.practiceStreakDays}</Text>
                  <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">Day streak</Text>
                </View>
                <View className="flex-1 min-w-[45%] items-center rounded-lg bg-surface-secondary dark:bg-surface-secondary-dark py-4">
                  <Text className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">{summary.currentSeasonPts}</Text>
                  <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">This season</Text>
                </View>
              </View>
            ) : null}

            {summary?.leagueSummary ? (
              <Card>
                <CardContent>
                  <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">Current league</Text>
                  <Text className="mt-1 text-base font-semibold text-text-primary dark:text-text-primary-dark">
                    {summary.leagueSummary.leagueName}
                  </Text>
                  <Text className="mt-0.5 text-sm text-text-secondary dark:text-text-secondary-dark">
                    Rank {summary.leagueSummary.rank} of {summary.leagueSummary.totalMembers}
                  </Text>
                </CardContent>
              </Card>
            ) : null}

            <View>
              <Text className="mb-2 text-lg font-semibold text-text-primary dark:text-text-primary-dark">
                Badges ({badges.filter((b) => b.earned).length}/{badges.length})
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {badges.map((badge) => (
                  <View
                    key={badge.definition.id}
                    className={`w-[31%] items-center rounded-lg p-2 ${
                      badge.earned ? "bg-surface-secondary dark:bg-surface-secondary-dark" : "bg-surface-secondary dark:bg-surface-secondary-dark/40"
                    }`}
                  >
                    <View className={`${badge.earned ? "" : "opacity-30"}`}>
                      <Ionicons
                        name={RARITY_ICON[badge.definition.rarity].name}
                        size={26}
                        color={RARITY_ICON[badge.definition.rarity].color}
                      />
                    </View>
                    <Text
                      className={`mt-1 text-center text-[11px] font-medium ${
                        badge.earned ? "text-text-primary dark:text-text-primary-dark" : "text-text-secondary dark:text-text-secondary-dark"
                      }`}
                      numberOfLines={2}
                    >
                      {badge.definition.name}
                    </Text>
                    {!badge.earned ? (
                      <Text className="mt-0.5 text-center text-[9px] text-text-secondary dark:text-text-secondary-dark" numberOfLines={2}>
                        {badge.definition.description}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>

            <View>
              <Text className="mb-2 text-lg font-semibold text-text-primary dark:text-text-primary-dark">Recent activity</Text>
              {history.length === 0 ? (
                <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">No points earned yet.</Text>
              ) : (
                <View className="gap-1">
                  {history.map((tx) => (
                    <View key={tx.id} className="flex-row items-center justify-between rounded-lg p-2">
                      <View className="flex-1 pr-2">
                        <Text className="text-sm text-text-primary dark:text-text-primary-dark">{tx.reason.replace(/_/g, " ")}</Text>
                        <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">{formatDate(tx.createdAt)}</Text>
                      </View>
                      <Text className={`text-sm font-semibold ${tx.points >= 0 ? "text-success dark:text-success-dark" : "text-danger dark:text-danger-dark"}`}>
                        {tx.points >= 0 ? "+" : ""}
                        {tx.points}
                      </Text>
                    </View>
                  ))}
                  {historyCursor ? (
                    <Button variant="secondary" size="sm" onPress={() => void loadMoreHistory()} isLoading={historyLoading}>
                      Load more
                    </Button>
                  ) : null}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
