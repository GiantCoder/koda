import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useVideoPlayer } from "expo-video";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { BackBar } from "@/components/ui/BackBar";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  getCollections,
  createCollection,
  addClipToCollection,
  type CollectionSummary,
} from "@/api/collections";
import { useAppSelector } from "@/store/hooks";
import { getAccessToken } from "@/api/tokenStore";
import { API_BASE_URL } from "@/api/client";
import { ApiError } from "@/api/client";
import {
  getAnalysisForVideo,
  getAnalysisFrames,
  getAnalysisPose,
  getAnnotations,
  createAnnotation,
  type AnalysisResult,
  type AnalysisFrame,
  type PoseEstimateResponse,
  type Annotation,
  type CoachingTip,
} from "@/api/analysis";
import { AnalysisVideoStage } from "@/components/analysis/AnalysisVideoStage";
import { ShotGradeCard, type MetricScore } from "@/components/analysis/ShotGradeCard";
import { CoachingTipsPanel } from "@/components/analysis/CoachingTipsPanel";
import { TagStrip, type ShotTag } from "@/components/analysis/TagStrip";
import { TechniqueBars, type TechniqueDataPoint } from "@/components/analysis/TechniqueBars";
import { TechnicalFeedbackList } from "@/components/analysis/TechnicalFeedbackList";
import { FrameGallery } from "@/components/analysis/FrameGallery";
import { AnnotationsPanel } from "@/components/analysis/AnnotationsPanel";

/**
 * Real analysis results screen -- Phase 4. Picks up exactly where the
 * processing screen's "coming in Phase 4" placeholder left off. Every
 * section here is backed by a real endpoint (see src/api/analysis.ts and
 * the Phase 4 notes in the roadmap doc); the two "reprocess" buttons and
 * the PDF `/report` route are deliberately left out (dead/edge-case, see
 * roadmap doc).
 */

function formatShotType(s: string): string {
  return s
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function gradeFromScore(score: number): string {
  if (score >= 85) return "A";
  if (score >= 75) return "B+";
  if (score >= 65) return "B";
  if (score >= 55) return "C+";
  return "C";
}

function starRatingFromScore(score: number): number {
  if (score >= 90) return 5;
  if (score >= 80) return 4;
  if (score >= 70) return 3;
  if (score >= 60) return 2;
  return 1;
}

function parseCoachingTips(raw: unknown): CoachingTip[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((t) => ({
    title: typeof t === "object" && t !== null && "title" in t ? String((t as { title: unknown }).title) : "Tip",
    body:
      typeof t === "object" && t !== null && "body" in t
        ? String((t as { body: unknown }).body)
        : typeof t === "object" && t !== null && "description" in t
          ? String((t as { description: unknown }).description)
          : "",
    description:
      typeof t === "object" && t !== null && "description" in t
        ? String((t as { description: unknown }).description)
        : undefined,
    type:
      typeof t === "object" && t !== null && "type" in t
        ? ((t as { type: unknown }).type as CoachingTip["type"])
        : undefined,
  }));
}

function deriveTags(analysis: AnalysisResult): ShotTag[] {
  const isBowling = analysis.activityType === "BOWLING";
  const tags: ShotTag[] = [];
  if (isBowling) {
    if (analysis.deliveryType) tags.push({ label: formatShotType(analysis.deliveryType), type: "neutral" });
    [
      { k: "RunUpRhythm", v: analysis.scoreRunUpRhythm },
      { k: "LoadUp", v: analysis.scoreLoadUp },
      { k: "BowlingArm", v: analysis.scoreBowlingArmAction },
      { k: "ReleasePoint", v: analysis.scoreReleasePoint },
      { k: "Balance", v: analysis.scoreBalance },
    ].forEach(({ k, v }) => {
      if (v != null) tags.push({ label: k, type: v >= 85 ? "strength" : v < 70 ? "improvement" : "neutral" });
    });
    return tags;
  }
  if (analysis.shotType) tags.push({ label: formatShotType(analysis.shotType), type: "neutral" });
  [
    { k: "Backlift", v: analysis.scoreBacklift },
    { k: "WeightTransfer", v: analysis.scoreWeightTransfer },
    { k: "HeadPosition", v: analysis.scoreHeadPosition },
    { k: "FollowThrough", v: analysis.scoreFollowThrough },
    { k: "Timing", v: analysis.scoreTiming },
  ].forEach(({ k, v }) => {
    if (v != null) tags.push({ label: k, type: v >= 85 ? "strength" : v < 70 ? "improvement" : "neutral" });
  });
  return tags;
}

function deriveTechniqueData(analysis: AnalysisResult): TechniqueDataPoint[] {
  const isBowling = analysis.activityType === "BOWLING";
  const dims = isBowling
    ? [
        { key: "Run-Up Rhythm", val: analysis.scoreRunUpRhythm },
        { key: "Load-Up", val: analysis.scoreLoadUp },
        { key: "Bowling Arm Action", val: analysis.scoreBowlingArmAction },
        { key: "Delivery Stride", val: analysis.scoreDeliveryStride },
        { key: "Release Point", val: analysis.scoreReleasePoint },
        { key: "Follow-Through", val: analysis.scoreFollowThrough },
        { key: "Alignment", val: analysis.scoreAlignment },
        { key: "Balance", val: analysis.scoreBalance },
      ]
    : [
        { key: "Head Position", val: analysis.scoreHeadPosition },
        { key: "Weight Transfer", val: analysis.scoreWeightTransfer },
        { key: "Backlift", val: analysis.scoreBacklift },
        { key: "Shot Selection", val: analysis.scoreShotSelection },
        { key: "Footwork", val: analysis.scoreFootwork },
        { key: "Balance", val: analysis.scoreBalance },
        { key: "Timing", val: analysis.scoreTiming },
        { key: "Follow-Through", val: analysis.scoreFollowThrough },
      ];
  return dims.filter((d) => d.val != null).map((d) => ({ dimension: d.key, value: d.val as number, fullMark: 100 }));
}

function deriveMetrics(analysis: AnalysisResult): MetricScore[] {
  return deriveTechniqueData(analysis).map((d) => ({ label: d.dimension, value: d.value }));
}

export default function AnalysisResultsScreen() {
  const { videoId } = useLocalSearchParams<{ videoId: string }>();
  const user = useAppSelector((state) => state.auth.user);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [frames, setFrames] = useState<AnalysisFrame[]>([]);
  const [poseData, setPoseData] = useState<PoseEstimateResponse | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [overlayLayers, setOverlayLayers] = useState({
    showVideo: true,
    showSkeleton: true,
    showBbox: false,
  });
  const [playerFullscreen, setPlayerFullscreen] = useState(false);
  const [saveVisible, setSaveVisible] = useState(false);
  const [savedCollectionIds, setSavedCollectionIds] = useState<Set<string>>(new Set());
  const [collections, setCollections] = useState<CollectionSummary[] | null>(null);
  const [savingToId, setSavingToId] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const openSaveModal = useCallback(async () => {
    setSaveError(null);
    setSaveVisible(true);
    if (collections === null) {
      try {
        setCollections(await getCollections());
      } catch {
        setCollections([]);
      }
    }
  }, [collections]);

  const handleSaveToCollection = useCallback(
    async (collectionId: string) => {
      if (!videoId) return;
      setSavingToId(collectionId);
      setSaveError(null);
      try {
        await addClipToCollection(collectionId, videoId);
        setSavedCollectionIds((prev) => new Set(prev).add(collectionId));
      } catch (e) {
        setSaveError(e instanceof ApiError ? e.message : "Failed to save clip");
      } finally {
        setSavingToId(null);
      }
    },
    [videoId]
  );

  const handleCreateAndSave = useCallback(async () => {
    const name = newCollectionName.trim();
    if (!name || !videoId) return;
    setCreatingCollection(true);
    setSaveError(null);
    try {
      const created = await createCollection({ name });
      setCollections((prev) => [{ ...created, clipCount: 0, shareCount: 0, ownerId: "", ownerName: "", canEdit: true, isSharedWithMe: false, thumbnails: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...(prev ?? [])]);
      await addClipToCollection(created.id, videoId);
      setSavedCollectionIds((prev) => new Set(prev).add(created.id));
      setNewCollectionName("");
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : "Failed to create collection");
    } finally {
      setCreatingCollection(false);
    }
  }, [newCollectionName, videoId]);

  const load = useCallback(async () => {
    if (!videoId) return;
    setError(null);
    try {
      const data = await getAnalysisForVideo(videoId);
      setAnalysis(data);

      // Frames/pose/annotations are all non-blocking: a video with no
      // frame manifest or pose data yet (older or still-processing
      // analyses) should still show scores/tips instead of failing hard.
      void getAnalysisFrames(data.id).then(setFrames).catch(() => setFrames([]));
      void getAnalysisPose(data.id).then(setPoseData).catch(() => setPoseData(null));
      void getAnnotations(data.id).then(setAnnotations).catch(() => setAnnotations([]));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load analysis");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [videoId]);

  useEffect(() => {
    void load();
  }, [load]);

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
    p.timeUpdateEventInterval = 0.05;
  });

  const handleCreateAnnotation = useCallback(
    async (input: { timestampMs: number; content: string }) => {
      if (!analysis) return;
      const created = await createAnnotation(analysis.id, input);
      setAnnotations((prev) => [...prev, created].sort((a, b) => a.timestampMs - b.timestampMs));
    },
    [analysis]
  );

  if (!videoId) {
    return (
      <SafeAreaView className="flex-1 bg-surface-secondary dark:bg-surface-secondary-dark" edges={["top", "left", "right"]}>
        <BackBar />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm text-danger dark:text-danger-dark">No video specified.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-secondary dark:bg-surface-secondary-dark" edges={["top", "left", "right"]}>
        <BackBar />
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">Loading analysis…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !analysis) {
    return (
      <SafeAreaView className="flex-1 bg-surface-secondary dark:bg-surface-secondary-dark" edges={["top", "left", "right"]}>
        <BackBar />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="mb-4 text-center text-sm text-danger dark:text-danger-dark">{error ?? "Analysis not found."}</Text>
          <Button onPress={() => router.replace("/(app)/dashboard")}>Back to Dashboard</Button>
        </View>
      </SafeAreaView>
    );
  }

  const overallScore = analysis.gradeOverall ?? 0;
  const gradeLetter = analysis.gradeLetter ?? gradeFromScore(overallScore);
  const tips = parseCoachingTips(analysis.coachingTips);
  const tags = deriveTags(analysis);
  const techniqueData = deriveTechniqueData(analysis);
  const metrics = deriveMetrics(analysis);
  const isBowling = analysis.activityType === "BOWLING";
  const canAddAnnotations = user?.role === "COACH";

  return (
    <SafeAreaView className="flex-1 bg-surface-secondary dark:bg-surface-secondary-dark" edges={["top", "left", "right"]}>
      <BackBar />
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
        <View className="mb-1 flex-row items-start justify-between">
          <Text className="flex-1 pr-3 text-2xl font-bold text-text-primary dark:text-text-primary-dark">
            {analysis.video?.filename?.trim() || (isBowling ? "Bowling Analysis" : "Shot Analysis")}
          </Text>
          <Button variant="secondary" size="sm" onPress={() => void openSaveModal()}>
            + Collection
          </Button>
        </View>
        <Text className="mb-4 text-sm text-text-secondary dark:text-text-secondary-dark">
          {isBowling
            ? analysis.deliveryType
              ? formatShotType(analysis.deliveryType)
              : "Bowling delivery"
            : analysis.shotType
              ? formatShotType(analysis.shotType)
              : "Shot"}
        </Text>

        <Card className="mb-6 overflow-hidden p-0">
          <AnalysisVideoStage
            player={player}
            poseData={poseData}
            overlayLayers={overlayLayers}
            onOverlayLayersChange={setOverlayLayers}
            fullscreen={playerFullscreen}
            onToggleFullscreen={() => setPlayerFullscreen((open) => !open)}
          />
          {!poseData ? (
            <View className="p-3">
              <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">
                Pose overlay unavailable for this clip.
              </Text>
            </View>
          ) : null}
        </Card>

        <View className="gap-4 pb-8">
          <ShotGradeCard
            gradeLetter={gradeLetter}
            starRating={starRatingFromScore(overallScore)}
            metrics={metrics}
            overallScore={overallScore}
            title={isBowling ? "Delivery Quality" : "Shot Quality"}
          />
          <CoachingTipsPanel tips={tips} />
          <TagStrip tags={tags} />
          <TechniqueBars data={techniqueData} />
          {analysis.technicalFeedback && analysis.technicalFeedback.length > 0 ? (
            <TechnicalFeedbackList items={analysis.technicalFeedback} />
          ) : null}
          <FrameGallery frames={frames} />
          <AnnotationsPanel
            annotations={annotations}
            canCreate={canAddAnnotations}
            onCreate={handleCreateAnnotation}
          />
        </View>
      </ScrollView>

      <FullScreenModal visible={saveVisible} onRequestClose={() => setSaveVisible(false)}>
          <View className="flex-row items-center justify-between px-6 pt-2">
            <Text className="text-xl font-bold text-text-primary dark:text-text-primary-dark">Add to Collection</Text>
            <Button variant="ghost" size="sm" onPress={() => setSaveVisible(false)}>
              Close
            </Button>
          </View>
          <ScrollView className="flex-1 px-6 pt-4">
            {collections === null ? (
              <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">Loading…</Text>
            ) : (
              <View className="gap-1">
                {collections
                  .filter((c) => c.canEdit)
                  .map((c) => {
                    const saved = savedCollectionIds.has(c.id);
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => (saved ? undefined : void handleSaveToCollection(c.id))}
                        disabled={savingToId === c.id || saved}
                        className="flex-row items-center justify-between rounded-lg p-3"
                      >
                        <Text className="text-text-primary dark:text-text-primary-dark">{c.name}</Text>
                        {saved ? (
                          <StatusBadge label="Saved" tone="success" />
                        ) : (
                          <Text className="text-xs text-primary">
                            {savingToId === c.id ? "Saving…" : "Save"}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                {collections.filter((c) => c.canEdit).length === 0 ? (
                  <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">You don't have any collections yet.</Text>
                ) : null}
              </View>
            )}

            <View className="mt-4 flex-row items-end gap-2 border-t border-surface-secondary dark:border-surface-secondary-dark pt-4">
              <View className="flex-1">
                <Input
                  label="New collection"
                  value={newCollectionName}
                  onChangeText={setNewCollectionName}
                  placeholder="e.g. Best Cover Drives"
                />
              </View>
              <Button onPress={() => void handleCreateAndSave()} isLoading={creatingCollection} size="md">
                Create &amp; Save
              </Button>
            </View>
            {saveError ? <Text className="mt-2 text-sm text-danger dark:text-danger-dark">{saveError}</Text> : null}
          </ScrollView>
      </FullScreenModal>
    </SafeAreaView>
  );
}
