"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { ShotGradeCard } from "@/app/components/analysis/ShotGradeCard";
import { CoachingTipsPanel, type CoachingTip } from "@/app/components/analysis/CoachingTipsPanel";
import { TagStrip, type ShotTag } from "@/app/components/analysis/TagStrip";
import { TechniqueRadarChart, type RadarDataPoint } from "@/app/components/analysis/TechniqueRadarChart";
import { LoadingSpinner } from "@/app/components/common/LoadingSpinner";
import { ToastContainer } from "@/app/components/ui/Toast";
import { useMockAuth } from "@/app/hooks/useMockAuth";
import { useToast } from "@/app/hooks/useToast";
import { buildMockAuthHeaders } from "@/app/lib/mock-auth-headers";
import {
  VideoSkeletonOverlay,
  useOverlayStatusText,
} from "@/app/components/video/VideoSkeletonOverlay";
import type { PoseEstimateResponse } from "@/src/lib/analysis/mediapipe-types";

interface AnalysisResult {
  id: string;
  videoId: string;
  status: string;
  shotType: string | null;
  shotConfidence: number | null;
  gradeOverall: number | null;
  gradeLetter: string | null;
  scoreBacklift: number | null;
  scoreWeightTransfer: number | null;
  scoreHeadPosition: number | null;
  scoreFollowThrough: number | null;
  scoreTiming: number | null;
  scoreBalance: number | null;
  scoreFootwork: number | null;
  scoreShotSelection: number | null;
  coachingTips: unknown;
  activityType?: string | null;
  activityConfidence?: number | null;
  rejectionReason?: string | null;
  video?: { cdnUrl: string | null; durationSeconds: number | null; resolutionWidth: number | null; resolutionHeight: number | null };
}

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
  if (!raw) return [];
  if (Array.isArray(raw)) {
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
      type: typeof t === "object" && t !== null && "type" in t ? (t as { type: unknown }).type as "strength" | "improvement" | "recommendation" : undefined,
    }));
  }
  return [];
}

function deriveTags(analysis: AnalysisResult): ShotTag[] {
  const tags: ShotTag[] = [];
  if (analysis.shotType) {
    tags.push({ label: formatShotType(analysis.shotType), type: "neutral" });
  }
  const scores = [
    { k: "Backlift", v: analysis.scoreBacklift },
    { k: "WeightTransfer", v: analysis.scoreWeightTransfer },
    { k: "HeadPosition", v: analysis.scoreHeadPosition },
    { k: "FollowThrough", v: analysis.scoreFollowThrough },
    { k: "Timing", v: analysis.scoreTiming },
  ];
  scores.forEach(({ k, v }) => {
    if (v != null) {
      tags.push({
        label: k,
        type: v >= 85 ? "strength" : v < 70 ? "improvement" : "neutral",
      });
    }
  });
  return tags.length > 0 ? tags : [
    { label: "CoverDrive", type: "neutral" },
    { label: "GoodBalance", type: "strength" },
    { label: "HighElbow", type: "strength" },
    { label: "HeadMovement", type: "improvement" },
  ];
}

function deriveRadarData(analysis: AnalysisResult): RadarDataPoint[] {
  const dims = [
    { key: "Head Position", val: analysis.scoreHeadPosition },
    { key: "Weight Transfer", val: analysis.scoreWeightTransfer },
    { key: "Backlift", val: analysis.scoreBacklift },
    { key: "Shot Selection", val: analysis.scoreShotSelection },
    { key: "Footwork", val: analysis.scoreFootwork },
    { key: "Balance", val: analysis.scoreBalance },
    { key: "Timing", val: analysis.scoreTiming },
    { key: "Follow-Through", val: analysis.scoreFollowThrough },
  ];
  return dims
    .filter((d) => d.val != null)
    .map((d) => ({ dimension: d.key, value: d.val as number, fullMark: 100 }));
}

export default function AnalysisResultsPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = typeof params.videoId === "string" ? params.videoId : null;
  const { user, role } = useMockAuth();
  const { toasts, showToast, closeToast } = useToast();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOverlayEnabled, setIsOverlayEnabled] = useState(true);
  const [poseData, setPoseData] = useState<PoseEstimateResponse | null>(null);
  const [poseDataError, setPoseDataError] = useState<string | null>(null);
  const [isPoseLoading, setIsPoseLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const fetchAnalysis = useCallback(async () => {
    if (!videoId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analysis/video/${videoId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Failed to load analysis (${res.status})`);
      }
      const data = await res.json();
      setAnalysis(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analysis");
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    void fetchAnalysis();
  }, [fetchAnalysis]);

  useEffect(() => {
    if (!analysis) return;
    if (poseData || isPoseLoading) return;

    let cancelled = false;
    const loadPoseData = async () => {
      setIsPoseLoading(true);
      setPoseDataError(null);
      try {
        const response = await fetch(`/api/analysis/${analysis.id}/pose`);
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? `Failed to fetch pose data (${response.status})`);
        }
        const payload = (await response.json()) as PoseEstimateResponse;
        if (!cancelled) {
          setPoseData(payload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setPoseDataError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to fetch pose data"
          );
        }
      } finally {
        if (!cancelled) {
          setIsPoseLoading(false);
        }
      }
    };
    void loadPoseData();

    return () => {
      cancelled = true;
    };
  }, [analysis, poseData, isPoseLoading]);

  const handleDelete = useCallback(async () => {
    if (!analysis || !user) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/analysis/${analysis.id}`, {
        method: "DELETE",
        headers: buildMockAuthHeaders(user),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to delete analysis");
      }
      showToast("Analysis deleted successfully", "success");
      setIsDeleteModalOpen(false);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to delete analysis", "error");
      setIsDeleting(false);
    }
  }, [analysis, user, showToast, router]);

  const overlayStatusText = useOverlayStatusText(
    isOverlayEnabled,
    isPoseLoading,
    poseDataError,
    poseData
  );

  if (!videoId) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card>
          <CardContent className="py-8">
            <p className="text-[var(--text-secondary)]">No video selected.</p>
            <Link href="/upload" className="mt-4 inline-block">
              <Button>Upload a Video</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center py-24">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          Loading analysis results…
        </p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card className="border-[var(--danger)]/50">
          <CardContent className="py-8">
            <p className="text-[var(--danger)]">{error ?? "Analysis not found"}</p>
            <div className="mt-4 flex gap-2">
              <Button onClick={fetchAnalysis}>Retry</Button>
              <Link href="/upload">
                <Button variant="secondary">Upload Another</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (analysis.status === "UNSUPPORTED_CONTENT") {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Link href="/dashboard" className="hover:text-[var(--primary)]">
            Home
          </Link>
          <span>/</span>
          <span className="text-[var(--text-primary)]">Analysis</span>
        </div>

        <Card>
          <CardContent className="py-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--warning)]/15">
              <svg className="h-8 w-8 text-[var(--warning)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.5 4.5l10 10-5 5-10-10 5-5z M4.5 19.5l3-3"
                />
              </svg>
            </div>

            <h2 className="text-xl font-semibold text-[var(--text-primary)]">No batting detected</h2>

            <p className="mx-auto mt-3 max-w-md text-sm text-[var(--text-secondary)]">
              {analysis.rejectionReason ??
                "This video doesn't appear to show batting technique. Koda analyses batting shots only — please upload a clip of a batting stroke or practice session."}
            </p>

            {analysis.activityType &&
              analysis.activityType !== "BATTING" &&
              analysis.activityType !== "UNCLEAR" && (
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  Detected activity:{" "}
                  <span className="font-medium capitalize">{analysis.activityType.toLowerCase()}</span>
                  {analysis.activityConfidence != null &&
                    ` (${Math.round(analysis.activityConfidence * 100)}% confidence)`}
                </p>
              )}

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/upload">
                <Button>Upload a Batting Video</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="secondary">Back to Dashboard</Button>
              </Link>
            </div>

            <p className="mt-6 text-xs text-[var(--text-secondary)]">
              Bowling analysis is coming soon. If you believe this is an error, try re-uploading with a clearer
              angle showing the batter.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overall = analysis.gradeOverall ?? 0;
  const gradeLetter = analysis.gradeLetter ?? gradeFromScore(overall);
  const metrics = [
    { label: "Backlift", value: analysis.scoreBacklift ?? 0 },
    { label: "Weight Transfer", value: analysis.scoreWeightTransfer ?? 0 },
    { label: "Head Position", value: analysis.scoreHeadPosition ?? 0 },
    { label: "Follow-Through", value: analysis.scoreFollowThrough ?? 0 },
    { label: "Timing", value: analysis.scoreTiming ?? 0 },
  ].filter((m) => m.value > 0);

  const tips = parseCoachingTips(analysis.coachingTips);
  const defaultTips: CoachingTip[] = tips.length > 0 ? tips : [
    { title: "Excellent Front Foot Movement", body: "Your weight transfer onto the front foot was well timed.", type: "strength" },
    { title: "Watch Your Head Position", body: "Try to keep your head more still over the ball for better balance.", type: "improvement" },
    { title: "Practice Recommendation", body: "Focus on drills that emphasize keeping the head still during front-foot drives.", type: "recommendation" },
  ];

  const tags = deriveTags(analysis);
  const radarData = deriveRadarData(analysis);
  const defaultRadar: RadarDataPoint[] = radarData.length > 0 ? radarData : [
    { dimension: "Head Position", value: analysis.scoreHeadPosition ?? 76 },
    { dimension: "Weight Transfer", value: analysis.scoreWeightTransfer ?? 88 },
    { dimension: "Backlift", value: analysis.scoreBacklift ?? 92 },
    { dimension: "Shot Selection", value: analysis.scoreShotSelection ?? 85 },
    { dimension: "Footwork", value: analysis.scoreFootwork ?? 82 },
    { dimension: "Balance", value: analysis.scoreBalance ?? 90 },
    { dimension: "Timing", value: analysis.scoreTiming ?? 85 },
    { dimension: "Follow-Through", value: analysis.scoreFollowThrough ?? 90 },
  ];

  const shotLabel = analysis.shotType
    ? `${formatShotType(analysis.shotType)} — ${Math.round((analysis.shotConfidence ?? 0) * 100)}% confidence`
    : "Shot classified";

  const resolution = analysis.video?.resolutionWidth && analysis.video?.resolutionHeight
    ? `${analysis.video.resolutionWidth}p`
    : "1080p";
  const previewSrc = `/api/videos/${analysis.videoId}/stream`;

  return (
    <div className="mx-auto max-w-7xl">
      <ToastContainer toasts={toasts} onClose={closeToast} />
      
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Link href="/dashboard" className="hover:text-[var(--primary)]">Home</Link>
          <span>/</span>
          <Link href="/progress" className="hover:text-[var(--primary)]">Analysis</Link>
          <span>/</span>
          <span className="text-[var(--text-primary)]">Shot Review</span>
        </div>
        <Button
          variant="secondary"
          onClick={() => setIsDeleteModalOpen(true)}
          className="text-[var(--danger)] hover:bg-[var(--danger)]/10"
        >
          Delete Analysis
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Shot Analysis Results
        </h1>
        <p className="mt-1 text-[var(--text-secondary)]">
          Analyzed on {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {role === "coach" && (
        <div className="mb-6 rounded-lg border border-[var(--warning)]/50 bg-[var(--warning)]/10 px-4 py-3">
          <p className="text-sm text-[var(--text-primary)]">
            <strong>Coach view:</strong> You are viewing this player&apos;s analysis. Add timestamped annotations via the annotation panel.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-0">
              <div className="relative aspect-video w-full bg-black">
                {analysis.video ? (
                  <video
                    ref={videoRef}
                    src={previewSrc}
                    controls
                    className="h-full w-full object-contain"
                    preload="metadata"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[var(--surface-secondary)]">
                    <p className="text-[var(--text-secondary)]">Video preview unavailable</p>
                  </div>
                )}
                <VideoSkeletonOverlay
                  videoRef={videoRef}
                  poseData={poseData}
                  enabled={isOverlayEnabled && !poseDataError}
                  showBbox
                />
                <div className="absolute right-3 top-3 flex items-center gap-2 rounded-lg bg-black/60 px-3 py-2">
                  <span className="text-xs text-white">Skeleton + Bbox</span>
                  <button
                    type="button"
                    className={`relative h-5 w-10 rounded-full transition-colors ${
                      isOverlayEnabled ? "bg-emerald-500" : "bg-[var(--surface-secondary)]"
                    }`}
                    role="switch"
                    aria-checked={isOverlayEnabled}
                    aria-label="Toggle skeleton overlay"
                    onClick={() => setIsOverlayEnabled((current) => !current)}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                        isOverlayEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 p-4">
                <span className="rounded-full bg-[var(--success)]/20 px-3 py-1 text-xs font-medium text-[var(--success)]">
                  {shotLabel}
                </span>
                <span className="rounded-full bg-[var(--surface-secondary)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                  {analysis.video?.durationSeconds ? `${analysis.video.durationSeconds}s` : "0.2s"}
                </span>
                <span className="rounded-full bg-[var(--surface-secondary)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                  {resolution}
                </span>
                {overlayStatusText ? (
                  <span className="rounded-full bg-[var(--surface-secondary)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                    {overlayStatusText}
                  </span>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <CoachingTipsPanel tips={defaultTips} />
          <TagStrip tags={tags} />
          <TechniqueRadarChart data={defaultRadar} />
        </div>

        <div className="space-y-6">
          <ShotGradeCard
            gradeLetter={gradeLetter}
            starRating={starRatingFromScore(overall)}
            metrics={metrics.length > 0 ? metrics : [
              { label: "Backlift", value: 92 },
              { label: "Weight Transfer", value: 88 },
              { label: "Head Position", value: 76 },
              { label: "Follow-Through", value: 90 },
              { label: "Timing", value: 85 },
            ]}
            overallScore={overall || 86.2}
          />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/upload">
          <Button variant="secondary">Analyse Another Shot</Button>
        </Link>
        <Link href="/progress">
          <Button variant="secondary">View Progress</Button>
        </Link>
        <Link href="/dashboard">
          <Button>Start Training Drill</Button>
        </Link>
      </div>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-[var(--surface)] p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Delete Analysis
            </h3>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Are you sure you want to delete this shot analysis? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                className="bg-[var(--danger)] hover:bg-[var(--danger)]/90"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
