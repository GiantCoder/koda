import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSelector } from "@/store/hooks";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { getDashboardSummary, type DashboardSummary } from "@/api/dashboard";
import { ApiError } from "@/api/client";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-1/2 p-2">
      <View className="rounded-lg bg-surface-secondary p-4">
        <Text className="text-2xl font-bold text-text-primary">{value}</Text>
        <Text className="text-xs text-text-secondary">{label}</Text>
      </View>
    </View>
  );
}

/**
 * Real dashboard, calling GET /api/dashboard/summary. Unlike the web app's
 * dashboard -- which never calls this endpoint and shows entirely
 * hardcoded sessions/squads/activity instead -- this shows what's actually
 * there. Today that's mostly zeros, because the backend itself is an
 * intentional MVP stub (no Video/Analysis/Session counts wired up yet).
 * That's shown honestly with empty-state copy rather than invented numbers;
 * this screen will fill in on its own as Phase 3+ lands real video/analysis
 * data, no rework needed here.
 */
export default function DashboardScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error("[dashboard] Failed to load summary:", err);
      setError(err instanceof ApiError ? err.message : "Couldn't load your dashboard right now.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const firstName = summary?.user.displayName?.split(" ")[0] ?? user?.displayName?.split(" ")[0] ?? "there";
  const memberSince = summary
    ? new Date(summary.user.memberSince).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : null;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top", "left", "right"]}>
      <ScrollView
        className="flex-1 px-6 pt-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text className="text-2xl font-bold text-text-primary">
          {getGreeting()}, {firstName}!
        </Text>
        {memberSince ? (
          <Text className="mt-1 text-text-secondary">Member since {memberSince}</Text>
        ) : null}

        {error ? (
          <Card className="mt-6">
            <Text className="text-sm text-danger">{error}</Text>
          </Card>
        ) : null}

        <Card className="mt-6">
          <CardHeader>Your Progress</CardHeader>
          <CardContent>
            <View className="-m-2 flex-row flex-wrap">
              <StatBlock label="Videos uploaded" value={String(summary?.stats.totalVideos ?? "—")} />
              <StatBlock label="Analyses completed" value={String(summary?.stats.totalAnalyses ?? "—")} />
              <StatBlock label="Upcoming sessions" value={String(summary?.stats.upcomingSessions ?? "—")} />
              <StatBlock label="Latest grade" value={summary?.stats.latestGrade ?? "—"} />
            </View>
            {summary && summary.stats.totalAnalyses === 0 ? (
              <Text className="mt-4 text-sm text-text-secondary">
                No analyses yet. Once video upload and coaching analysis ship (Phase 3), your
                progress will show up here automatically.
              </Text>
            ) : null}
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
