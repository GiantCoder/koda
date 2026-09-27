import React, { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProcessingTimeline } from "@/components/upload/ProcessingTimeline";
import { useAnalysisStatus } from "@/lib/useAnalysisStatus";
import { getAccessToken } from "@/api/tokenStore";
import { API_BASE_URL } from "@/api/client";

/**
 * Real, polling-based processing screen (GET /api/analysis/[videoId]/status
 * every 3s -- see src/lib/useAnalysisStatus.ts for why this is polling-only,
 * no SSE). Deliberately simpler than web's equivalent page: a plain video
 * preview with native controls, no skeleton-overlay canvas here -- that
 * lives on the full analysis-detail screen (Phase 4) this routes to on
 * completion.
 */
export default function AnalysisProcessingScreen() {
  const { videoId } = useLocalSearchParams<{ videoId: string }>();

  const { status, error, retry } = useAnalysisStatus({
    videoId: videoId ?? null,
    enabled: !!videoId,
    pollIntervalMs: 3000,
  });

  const streamSource = useMemo(() => {
    if (!videoId) return null;
    const accessToken = getAccessToken();
    return {
      uri: `${API_BASE_URL}/api/videos/${videoId}/stream?playback=1`,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    };
  }, [videoId]);

  const player = useVideoPlayer(streamSource, (p) => {
    p.loop = false;
  });

  if (!videoId) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface dark:bg-surface-dark px-6">
        <Text className="mb-4 text-center text-sm text-danger dark:text-danger-dark">No video specified.</Text>
        <Button onPress={() => router.replace("/(app)/upload")}>Go to Upload</Button>
      </SafeAreaView>
    );
  }

  if (error && !status) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface dark:bg-surface-dark px-6">
        <Card>
          <CardHeader>Unable to Load Status</CardHeader>
          <CardContent>
            <Text className="mb-4 text-sm text-danger dark:text-danger-dark">{error.message}</Text>
            <View className="flex-row gap-3">
              <Button onPress={retry}>Retry</Button>
              <Button variant="secondary" onPress={() => router.replace("/(app)/upload")}>
                Back to Upload
              </Button>
            </View>
          </CardContent>
        </Card>
      </SafeAreaView>
    );
  }

  const displayStatus = status ?? { id: videoId, stage: "upload_complete" as const, progress: 0 };
  const isComplete = displayStatus.stage === "complete";
  const isFailed = displayStatus.stage === "failed" || !!displayStatus.error;
  const estimatedMins = displayStatus.estimatedSecondsRemaining
    ? Math.ceil(displayStatus.estimatedSecondsRemaining / 60)
    : null;

  return (
    <SafeAreaView className="flex-1 bg-surface-secondary dark:bg-surface-secondary-dark" edges={["top", "left", "right"]}>
      <ScrollView className="flex-1 px-6 pt-6">
        <Text className="mb-1 text-2xl font-bold text-text-primary dark:text-text-primary-dark">Analysis in Progress</Text>
        <Text className="mb-6 text-sm text-text-secondary dark:text-text-secondary-dark">
          Your video is processing in the background -- you can leave this screen and check back
          from Upload → Recent Uploads.
        </Text>

        <Card className="mb-6 overflow-hidden p-0">
          <VideoView player={player} style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: "black" }} nativeControls />
        </Card>

        <Card>
          <CardHeader>Pipeline Status</CardHeader>
          <CardContent>
            <ProcessingTimeline
              currentStage={displayStatus.stage}
              error={displayStatus.error}
              activityType={displayStatus.activityType}
            />

            {isComplete ? (
              <View className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <Text className="mb-1 font-medium text-text-primary dark:text-text-primary-dark">Analysis complete!</Text>
                <Text className="mb-4 text-sm text-text-secondary dark:text-text-secondary-dark">
                  Your shot grade, coaching tips, and pose overlay are ready.
                </Text>
                <Button className="self-start" onPress={() => router.replace(`/analysis/${videoId}`)}>
                  View Results
                </Button>
              </View>
            ) : isFailed ? (
              <View className="mt-6 rounded-lg border border-danger dark:border-danger-dark/30 bg-danger dark:bg-danger-dark/10 p-4">
                <Text className="text-sm text-danger dark:text-danger-dark">{displayStatus.error ?? "Analysis failed."}</Text>
                <View className="mt-4 flex-row gap-3">
                  <Button onPress={retry}>Retry</Button>
                  <Button variant="secondary" onPress={() => router.replace("/(app)/upload")}>
                    Upload Another
                  </Button>
                </View>
              </View>
            ) : (
              <>
                {estimatedMins !== null ? (
                  <Text className="mt-6 text-sm text-text-secondary dark:text-text-secondary-dark">
                    Estimated time remaining: ~{estimatedMins} min
                  </Text>
                ) : null}
                <Button
                  variant="ghost"
                  className="mt-4 self-start"
                  onPress={() => router.replace("/(app)/upload")}
                >
                  Back to Upload
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
