import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSelector } from "@/store/hooks";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ApiError } from "@/api/client";
import {
  getProgressSummary,
  getProgressTrend,
  getShotDistribution,
  type ProgressSummary,
  type ProgressTrendPoint,
  type ShotDistributionEntry,
} from "@/api/progress";
import { TrendLineChart } from "@/components/progress/TrendLineChart";
import { ShotDistributionChart } from "@/components/progress/ShotDistributionChart";

/**
 * Real progress/trends screen -- Phase 4. Deliberately does NOT port web's
 * app/(dashboard)/progress/page.tsx, which is almost entirely a
 * setTimeout()-mocked static object with invented sessions/achievements/
 * coach comments and never calls a progress endpoint at all. Instead this
 * goes straight to the real, working per-user routes
 * (GET /api/progress/[userId], /trend, /shots) that the web page's own
 * backend already has but never wired up. No achievements section --
 * GET /api/progress/[userId]/achievements is an explicit stub with no
 * Achievement model in the schema at all (see roadmap doc).
 *
 * Scoped to self-progress only for v1; the real coach-facing per-player
 * trend view (GET /api/team/players/[id]/analysed-videos/trend) is
 * deferred to Phase 6 (Team/Squads), per the user's scoping decision.
 */

function formatShotType(s: string): string {
  return s
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex-1 p-4">
      <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">{label}</Text>
      <Text className="mt-1 text-xl font-bold text-text-primary dark:text-text-primary-dark">{value}</Text>
    </Card>
  );
}

export default function ProgressScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [trend, setTrend] = useState<ProgressTrendPoint[]>([]);
  const [shots, setShots] = useState<ShotDistributionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setError(null);
    try {
      const [summaryData, trendData, shotsData] = await Promise.all([
        getProgressSummary(user.id),
        getProgressTrend(user.id),
        getShotDistribution(user.id),
      ]);
      setSummary(summaryData);
      setTrend(trendData);
      setShots(shotsData);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load progress");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={["top", "left", "right"]}>
      <ScrollView
        className="flex-1 px-6 pt-6"
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
        <Text className="mb-1 text-2xl font-bold text-text-primary dark:text-text-primary-dark">Progress</Text>
        <Text className="mb-6 text-sm text-text-secondary dark:text-text-secondary-dark">Track your cricket training journey</Text>

        {loading ? (
          <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">Loading…</Text>
        ) : error ? (
          <Text className="text-sm text-danger dark:text-danger-dark">{error}</Text>
        ) : !summary || summary.totalSessions === 0 ? (
          <Card>
            <CardContent>
              <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">
                No completed analyses yet. Upload and analyze a video to start tracking your progress.
              </Text>
            </CardContent>
          </Card>
        ) : (
          <View className="gap-6 pb-8">
            <View className="flex-row gap-3">
              <StatCard label="Sessions Analyzed" value={String(summary.totalSessions)} />
              <StatCard
                label="Average Grade"
                value={summary.avgGrade != null ? `${summary.avgGrade} (${summary.gradeLetter ?? "-"})` : "-"}
              />
            </View>
            <StatCard
              label="Most Practiced"
              value={summary.bestShot ? formatShotType(summary.bestShot) : "-"}
            />

            <Card>
              <CardHeader>📈 Grade Trend</CardHeader>
              <CardContent>
                <TrendLineChart trend={trend} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>🏏 Shot Mix</CardHeader>
              <CardContent>
                <ShotDistributionChart shots={shots} />
              </CardContent>
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
