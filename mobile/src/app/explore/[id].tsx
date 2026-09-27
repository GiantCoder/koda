import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { BackBar } from "@/components/ui/BackBar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useAppSelector } from "@/store/hooks";
import { getAccessToken } from "@/api/tokenStore";
import { API_BASE_URL, ApiError } from "@/api/client";
import { getExploreClip, type ExploreClipDetail } from "@/api/explore";

function formatCoachingTip(tip: unknown): { title: string; body: string } {
  if (typeof tip === "object" && tip !== null) {
    const t = tip as Record<string, unknown>;
    return {
      title: typeof t.title === "string" ? t.title : "Tip",
      body: typeof t.body === "string" ? t.body : typeof t.description === "string" ? t.description : "",
    };
  }
  return { title: "Tip", body: String(tip) };
}

export default function ExploreClipDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUserId = useAppSelector((state) => state.auth.user?.id);
  const [clip, setClip] = useState<ExploreClipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getExploreClip(id)
      .then(setClip)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load clip"))
      .finally(() => setLoading(false));
  }, [id]);

  const isOwnClip = clip?.uploadedById === currentUserId;
  const videoSource =
    isOwnClip && clip
      ? { uri: `${API_BASE_URL}${clip.videoUrl}`, headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` } }
      : null;
  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = false;
  });

  if (!id) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface dark:bg-surface-dark">
        <Text className="text-text-secondary dark:text-text-secondary-dark">No clip specified.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-secondary dark:bg-surface-secondary-dark" edges={["top", "left", "right"]}>
      <BackBar label="Explore" />
      {loading ? (
        <View className="items-center pt-12">
          <ActivityIndicator />
        </View>
      ) : error || !clip ? (
        <Text className="px-6 pt-6 text-sm text-danger dark:text-danger-dark">{error ?? "Clip not found"}</Text>
      ) : (
        <ScrollView className="flex-1 px-6">
          <View className="gap-4 pb-10 pt-2">
            {isOwnClip ? (
              <Card className="overflow-hidden p-0">
                <View style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: "black" }}>
                  <VideoView player={player} style={{ width: "100%", height: "100%" }} contentFit="cover" nativeControls />
                </View>
              </Card>
            ) : (
              <Card>
                <CardContent>
                  <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">
                    Only {clip.uploadedBy} can play this clip back -- Explore shares the clip's coaching
                    detail publicly, but video playback stays restricted to whoever uploaded it.
                  </Text>
                </CardContent>
              </Card>
            )}

            <View>
              <Text className="text-xl font-bold text-text-primary dark:text-text-primary-dark">{clip.title}</Text>
              <Text className="mt-1 text-sm text-text-secondary dark:text-text-secondary-dark">{clip.description}</Text>
              <Text className="mt-1 text-xs text-text-secondary dark:text-text-secondary-dark">
                by {clip.uploadedBy}
                {clip.grade !== "N/A" ? ` · Grade ${clip.grade}` : ""}
              </Text>
            </View>

            {Array.isArray(clip.analysis.coachingTips) && clip.analysis.coachingTips.length > 0 ? (
              <Card>
                <CardHeader>Coaching Tips</CardHeader>
                <CardContent className="gap-2">
                  {clip.analysis.coachingTips.map((tip, i) => {
                    const parsed = formatCoachingTip(tip);
                    return (
                      <View key={i}>
                        <Text className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">{parsed.title}</Text>
                        {parsed.body ? <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">{parsed.body}</Text> : null}
                      </View>
                    );
                  })}
                </CardContent>
              </Card>
            ) : null}

            {clip.relatedClips.length > 0 ? (
              <View>
                <Text className="mb-2 text-lg font-semibold text-text-primary dark:text-text-primary-dark">More like this</Text>
                <View className="gap-1">
                  {clip.relatedClips.map((related) => (
                    <Pressable
                      key={related.id}
                      onPress={() => router.push(`/explore/${related.id}`)}
                      className="rounded-lg border border-surface-secondary dark:border-surface-secondary-dark p-3"
                    >
                      <Text className="text-text-primary dark:text-text-primary-dark" numberOfLines={1}>
                        {related.title}
                      </Text>
                      <Text className="mt-0.5 text-xs text-text-secondary dark:text-text-secondary-dark">by {related.uploadedBy}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
