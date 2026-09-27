import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BackBar } from "@/components/ui/BackBar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OptionPicker, type Option } from "@/components/ui/OptionPicker";
import { PressableScale } from "@/components/ui/PressableScale";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { PlayerCardCompact } from "@/components/profile/PlayerCardCompact";
import { AvatarPickerModal } from "@/components/profile/AvatarPickerModal";
import { TrendLineChart } from "@/components/progress/TrendLineChart";
import { useAppSelector } from "@/store/hooks";
import { ApiError } from "@/api/client";
import { createConversation } from "@/api/conversations";
import { getTeamPlayer, updateTeamPlayer, type TeamPlayerProfile } from "@/api/team";
import type { PlayerCardDto } from "@/api/playerCard";
import { toStoredAvatarUrl } from "@/lib/mediaUrl";
import {
  getTeamPlayerCard,
  getPlayerAnalysedVideos,
  getPlayerTrend,
  type AnalysedVideo,
  type VideoCategory,
} from "@/api/players";

/**
 * Player detail screen -- Phase 6. Reached by tapping a roster row on the
 * Team tab. Real data throughout: GET /api/team/players/[id]/player-card
 * (same RBAC-checked card the player sees of themselves in Phase 2, just
 * viewed by their coach/parent here), .../analysed-videos (a real,
 * paginated, filterable list -- every row links straight into the same
 * Phase 4 analysis results screen), and .../analysed-videos/trend, which
 * this screen turns into a single aggregate grade-over-time line using
 * the same TrendLineChart component Phase 4 built for the Progress tab
 * (web's own per-category breakdown chart isn't ported -- see roadmap doc).
 *
 * "Message" is coach/admin only, matching Messages tab's existing "who can
 * start a conversation" rule -- starts a real conversation via the Phase 5
 * messaging backend and jumps straight into the thread.
 */

const CATEGORY_OPTIONS: Option[] = [
  { value: "all", label: "All" },
  { value: "batting", label: "Batting" },
  { value: "bowling", label: "Bowling" },
  { value: "fielding", label: "Fielding" },
  { value: "keeping", label: "Keeping" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function PlayerDetailScreen() {
  const { playerId } = useLocalSearchParams<{ playerId: string }>();
  const user = useAppSelector((state) => state.auth.user);
  const canMessage = user?.role === "COACH" || user?.role === "ADMIN";
  const canEditAvatar = user?.role === "ADMIN" || user?.role === "COACH" || user?.role === "PARENT";

  const [player, setPlayer] = useState<TeamPlayerProfile | null>(null);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [card, setCard] = useState<PlayerCardDto | null>(null);
  const [trend, setTrend] = useState<{ date: string; grade: number; analysisId: string }[]>([]);
  const [videos, setVideos] = useState<AnalysedVideo[]>([]);
  const [category, setCategory] = useState<VideoCategory | "all">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [videosLoading, setVideosLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messaging, setMessaging] = useState(false);

  const loadOverview = useCallback(async () => {
    if (!playerId) return;
    setError(null);
    try {
      const [cardData, trendPoints, playerData] = await Promise.all([
        getTeamPlayerCard(playerId),
        getPlayerTrend(playerId),
        getTeamPlayer(playerId).catch(() => null),
      ]);
      setCard(cardData);
      setPlayer(playerData);
      setTrend(
        trendPoints
          .filter((p) => p.gradeOverall !== null)
          .map((p) => ({ date: p.uploadedAt, grade: p.gradeOverall as number, analysisId: p.analysisId }))
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load player");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [playerId]);

  const loadVideos = useCallback(
    async (targetPage: number, targetCategory: VideoCategory | "all") => {
      if (!playerId) return;
      setVideosLoading(true);
      try {
        const result = await getPlayerAnalysedVideos(playerId, {
          page: targetPage,
          pageSize: 10,
          category: targetCategory,
        });
        setVideos(result.videos);
        setPage(result.pagination.page);
        setTotalPages(result.pagination.totalPages);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to load videos");
      } finally {
        setVideosLoading(false);
      }
    },
    [playerId]
  );

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    void loadVideos(1, category);
  }, [category, loadVideos]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void loadOverview();
    void loadVideos(page, category);
  }, [loadOverview, loadVideos, page, category]);

  const handleSelectAvatar = useCallback(
    async (fullUrl: string) => {
      if (!playerId) return;
      setAvatarSaving(true);
      try {
        const avatarUrl = toStoredAvatarUrl(fullUrl);
        await updateTeamPlayer(playerId, { avatarUrl });
        setPlayer((prev) => (prev ? { ...prev, avatarUrl } : { id: playerId, displayName: card?.displayName ?? "", email: "", avatarUrl }));
        setAvatarModalOpen(false);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to update avatar");
      } finally {
        setAvatarSaving(false);
      }
    },
    [playerId, card?.displayName]
  );

  const handleMessage = useCallback(async () => {
    if (!playerId) return;
    setMessaging(true);
    try {
      const conversation = await createConversation([playerId]);
      router.push(`/messages/${conversation.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to start conversation");
    } finally {
      setMessaging(false);
    }
  }, [playerId]);

  const trendForChart = useMemo(() => trend, [trend]);

  if (!playerId) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface dark:bg-surface-dark">
        <Text className="text-text-secondary dark:text-text-secondary-dark">No player specified.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-secondary dark:bg-surface-secondary-dark" edges={["top", "left", "right"]}>
      <BackBar label="Team" />
      <ScrollView
        className="flex-1 px-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {loading ? (
          <View className="items-center pt-12">
            <ActivityIndicator />
          </View>
        ) : error && !card ? (
          <Text className="pt-6 text-sm text-danger dark:text-danger-dark">{error}</Text>
        ) : card ? (
          <View className="gap-4 pb-10 pt-2">
            <View className="flex-row items-center gap-3">
              <View className="relative">
                <UserAvatar
                  name={player?.displayName ?? card.displayName}
                  uri={player?.avatarUrl}
                  size={72}
                />
                {canEditAvatar ? (
                  <PressableScale
                    onPress={() => setAvatarModalOpen(true)}
                    disabled={avatarSaving}
                    accessibilityLabel="Edit avatar"
                    className="absolute -bottom-1 -right-1 h-8 w-8 items-center justify-center rounded-full bg-primary"
                  >
                    <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
                  </PressableScale>
                ) : null}
              </View>
              <View className="flex-1">
                <Text className="text-xl font-semibold text-text-primary dark:text-text-primary-dark">
                  {player?.displayName ?? card.displayName}
                </Text>
                <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">Player profile</Text>
              </View>
            </View>

            <Card>
              <CardContent>
                <PlayerCardCompact card={card} />
              </CardContent>
            </Card>

            {canMessage ? (
              <Button variant="secondary" onPress={() => void handleMessage()} isLoading={messaging}>
                Message {card.displayName}
              </Button>
            ) : null}

            <Card>
              <CardHeader>Grade trend</CardHeader>
              <CardContent>
                <TrendLineChart trend={trendForChart} />
              </CardContent>
            </Card>

            <View>
              <Text className="mb-2 text-lg font-semibold text-text-primary dark:text-text-primary-dark">Analysed videos</Text>
              <OptionPicker
                options={CATEGORY_OPTIONS}
                value={category}
                onChange={(v) => setCategory(v as VideoCategory | "all")}
                layout="chips"
              />
            </View>

            {videosLoading ? (
              <ActivityIndicator />
            ) : videos.length === 0 ? (
              <Card>
                <CardContent>
                  <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">No analysed videos in this category yet.</Text>
                </CardContent>
              </Card>
            ) : (
              <View className="gap-1">
                {videos.map((video) => (
                  <Pressable
                    key={video.id}
                    onPress={() => router.push(`/analysis/${video.id}`)}
                    className="flex-row items-center justify-between rounded-lg border border-surface-secondary dark:border-surface-secondary-dark p-3"
                  >
                    <View className="flex-1">
                      <Text className="text-text-primary dark:text-text-primary-dark" numberOfLines={1}>
                        {video.filename ?? "Untitled video"}
                      </Text>
                      <Text className="mt-0.5 text-xs text-text-secondary dark:text-text-secondary-dark">
                        {formatDate(video.uploadedAt)} · {video.category}
                        {video.commentCount > 0 ? ` · ${video.commentCount} comments` : ""}
                      </Text>
                    </View>
                    {video.gradeLetter ? (
                      <View className="ml-2 items-center justify-center rounded-full bg-surface-secondary dark:bg-surface-secondary-dark px-3 py-1">
                        <Text className="text-sm font-bold text-text-primary dark:text-text-primary-dark">{video.gradeLetter}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            )}

            {totalPages > 1 ? (
              <View className="flex-row items-center justify-between pb-4">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onPress={() => void loadVideos(page - 1, category)}
                >
                  Previous
                </Button>
                <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">
                  Page {page} of {totalPages}
                </Text>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onPress={() => void loadVideos(page + 1, category)}
                >
                  Next
                </Button>
              </View>
            ) : null}

            {error ? <Text className="pb-4 text-sm text-danger dark:text-danger-dark">{error}</Text> : null}
          </View>
        ) : null}
      </ScrollView>

      {canEditAvatar ? (
        <AvatarPickerModal
          visible={avatarModalOpen}
          selectedUrl={player?.avatarUrl ?? null}
          onClose={() => setAvatarModalOpen(false)}
          onSelect={(url) => void handleSelectAvatar(url)}
        />
      ) : null}
    </SafeAreaView>
  );
}
