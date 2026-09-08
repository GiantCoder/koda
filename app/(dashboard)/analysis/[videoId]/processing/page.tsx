"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { LoadingSpinner } from "@/app/components/common/LoadingSpinner";
import { useAnalysisStatus } from "@/app/lib/useAnalysisStatus";
import { ProcessingTimeline } from "@/app/components/analysis/ProcessingStageCard";
import {
  VideoSkeletonOverlay,
  SkeletonJointLegend,
  OverlayLayerControls,
  useOverlayStatusText,
  type OverlayLayerToggles,
} from "@/app/components/video/VideoSkeletonOverlay";
import type { PoseEstimateResponse } from "@/src/lib/analysis/mediapipe-types";

const POSE_READY_STAGES = new Set([
  "shot_classification",
  "generating_feedback",
  "complete",
]);

export default function AnalysisProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = typeof params.videoId === "string" ? params.videoId : null;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [overlayLayers, setOverlayLayers] = useState<OverlayLayerToggles>({
    showVideo: true,
    showSkeleton: true,
    showBbox: true,
  });
  const [poseData, setPoseData] = useState<PoseEstimateResponse | null>(null);
  const [poseDataError, setPoseDataError] = useState<string | null>(null);
  const [isPoseLoading, setIsPoseLoading] = useState(false);

  const { status, error, retry } = useAnalysisStatus({
    videoId,
    enabled: !!videoId,
    pollIntervalMs: 3000,
    onComplete: (s) => {
      router.push(`/analysis/${s.id}`);
    },
  });

  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    async function loadAnalysisId() {
      try {
        const res = await fetch(`/api/analysis/video/${videoId}`);
        if (!res.ok) return;
        const data = (await res.json()) as { id?: string };
        if (!cancelled && data.id) {
          setAnalysisId(data.id);
        }
      } catch {
        // Optional — overlay loads once analysisId is known from status polling
      }
    }
    void loadAnalysisId();
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  useEffect(() => {
    if (!status?.stage || !POSE_READY_STAGES.has(status.stage)) return;
    if (!analysisId || poseData || isPoseLoading) return;

    let cancelled = false;
    const loadPose = async () => {
      setIsPoseLoading(true);
      setPoseDataError(null);
      try {
        const response = await fetch(`/api/analysis/${analysisId}/pose`);
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Failed to fetch pose data (${response.status})`);
        }
        const payload = (await response.json()) as PoseEstimateResponse;
        if (!cancelled) setPoseData(payload);
      } catch (loadError) {
        if (!cancelled) {
          setPoseDataError(
            loadError instanceof Error ? loadError.message : "Failed to fetch pose data"
          );
        }
      } finally {
        if (!cancelled) setIsPoseLoading(false);
      }
    };
    void loadPose();
    return () => {
      cancelled = true;
    };
  }, [status?.stage, analysisId, poseData, isPoseLoading]);

  const handleCancel = useCallback(() => {
    router.push("/upload");
  }, [router]);

  const poseOverlayOn =
    (overlayLayers.showSkeleton || overlayLayers.showBbox) && Boolean(poseData);
  const overlayStatusText = useOverlayStatusText(
    poseOverlayOn,
    isPoseLoading,
    poseDataError,
    poseData
  );

  if (!videoId) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>Invalid Video</CardHeader>
          <CardContent>
            <p className="text-[var(--text-secondary)]">
              No video ID provided. Please start from the upload page.
            </p>
            <Link href="/upload">
              <Button className="mt-4">Go to Upload</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="border-[var(--danger)]/50">
          <CardHeader>Unable to Load Status</CardHeader>
          <CardContent>
            <p className="text-[var(--danger)]">{error.message}</p>
            <div className="mt-4 flex gap-2">
              <Button onClick={retry}>Retry</Button>
              <Link href="/upload">
                <Button variant="secondary">Back to Upload</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayStatus = status ?? {
    id: videoId,
    stage: "upload_complete" as const,
    progress: 0,
  };

  const isComplete = displayStatus.stage === "complete";
  const isFailed = displayStatus.stage === "failed" || !!displayStatus.error;
  const estimatedMins = displayStatus.estimatedSecondsRemaining
    ? Math.ceil(displayStatus.estimatedSecondsRemaining / 60)
    : null;
  const previewSrc = `/api/videos/${videoId}/stream?playback=1`;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Analysis in Progress
        </h1>
        <p className="mt-1 text-[var(--text-secondary)]">
          Your video is being processed in the background. You can leave and check back from Upload → Recent Uploads.
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-0">
          <div className="relative aspect-video w-full bg-black">
            <video
              ref={videoRef}
              src={previewSrc}
              controls
              className="h-full w-full object-contain"
              preload="metadata"
            />
            <VideoSkeletonOverlay
              videoRef={videoRef}
              poseData={poseData}
              enabled={Boolean(poseData) || !overlayLayers.showVideo}
              showVideo={overlayLayers.showVideo}
              showSkeleton={overlayLayers.showSkeleton}
              showBbox={overlayLayers.showBbox}
            />
            <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
              <OverlayLayerControls
                layers={overlayLayers}
                onChange={setOverlayLayers}
                poseAvailable={Boolean(poseData) && !poseDataError}
              />
              {overlayLayers.showSkeleton && poseData ? (
                <div className="rounded-lg bg-black/60 px-3 py-2">
                  <SkeletonJointLegend />
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 p-4">
            {overlayStatusText ? (
              <span className="rounded-full bg-[var(--surface-secondary)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                {overlayStatusText}
              </span>
            ) : (
              <span className="rounded-full bg-[var(--surface-secondary)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                Skeleton overlay available after pose analysis
              </span>
            )}
            {isPoseLoading && (
              <span className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <LoadingSpinner size="sm" />
                Loading pose data…
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>Pipeline Status</CardHeader>
        <CardContent>
          <ProcessingTimeline
            currentStage={displayStatus.stage}
            error={displayStatus.error}
            activityType={displayStatus.activityType}
          />

          {!isComplete && !isFailed && estimatedMins !== null && (
            <p className="mt-6 text-sm text-[var(--text-secondary)]">
              Estimated time remaining: ~{estimatedMins} min
            </p>
          )}

          {isFailed && (
            <div className="mt-6 rounded-lg border border-[var(--danger)] bg-[var(--danger)]/10 p-4">
              <p className="text-sm text-[var(--danger)]">
                {displayStatus.error ?? "Analysis failed"}
              </p>
              <div className="mt-4 flex gap-2">
                <Button onClick={retry}>Retry</Button>
                <Link href="/upload">
                  <Button variant="secondary">Upload Another</Button>
                </Link>
              </div>
            </div>
          )}

          {!isComplete && !isFailed && (
            <div className="mt-6 flex justify-between">
              <Button variant="ghost" onClick={handleCancel}>
                Back to Upload
              </Button>
              <p className="text-sm text-[var(--text-secondary)]">
                Processing continues if you leave this page.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
