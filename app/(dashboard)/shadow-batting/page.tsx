"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { useMockAuth } from "@/app/hooks/useMockAuth";
import { buildMockAuthHeaders } from "@/app/lib/mock-auth-headers";

const SHOT_TYPES = [
  { value: "COVER_DRIVE", label: "Cover Drive" },
  { value: "PULL", label: "Pull Shot" },
  { value: "CUT", label: "Cut Shot" },
  { value: "HOOK", label: "Hook Shot" },
  { value: "DEFENSIVE", label: "Defensive" },
  { value: "STRAIGHT_DRIVE", label: "Straight Drive" },
  { value: "OFF_DRIVE", label: "Off Drive" },
  { value: "ON_DRIVE", label: "On Drive" },
  { value: "SWEEP", label: "Sweep" },
  { value: "REVERSE_SWEEP", label: "Reverse Sweep" },
  { value: "LATE_CUT", label: "Late Cut" },
  { value: "FLICK", label: "Flick" },
  { value: "GLANCE", label: "Glance" },
  { value: "SCOOP", label: "Scoop" },
  { value: "FORWARD_DEFENCE", label: "Forward Defence" },
  { value: "BACK_FOOT_DEFENCE", label: "Back Foot Defence" },
  { value: "LEG_GLANCE", label: "Leg Glance" },
  { value: "SQUARE_CUT", label: "Square Cut" },
  { value: "UPPER_CUT", label: "Upper Cut" },
  { value: "LOFTED_DRIVE", label: "Lofted Drive" },
  { value: "PADDLE_SWEEP", label: "Paddle Sweep" },
  { value: "RAMP", label: "Ramp" },
  { value: "CHECK_DRIVE", label: "Check Drive" },
];

const DURATIONS = [5, 10, 15, 30, 45, 60];

const PREFERRED_RECORDING_MIME_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4",
];

const DISPLAY_SCORE_METRICS = [
  { key: "balance", abbr: "BAL", label: "Balance" },
  { key: "weightTransfer", abbr: "WGT", label: "Weight transfer" },
  { key: "backlift", abbr: "BKL", label: "Backlift" },
  { key: "headPosition", abbr: "HDP", label: "Head position" },
  { key: "followThrough", abbr: "FTH", label: "Follow through" },
  { key: "footwork", abbr: "FTW", label: "Footwork" },
] as const;

const SHADOW_BATTING_STORAGE_KEY = "shadow-batting-clips-v1";
const SHADOW_BATTING_PREFS_KEY = "shadow-batting-preferences-v1";

type AnalyzedClip = {
  id: string;
  serverVideoId?: string;
  localUrl: string;
  createdAt: number;
  shotType: string;
  duration: number;
  prepTimer: number;
  coachingFeedback?: string;
  scores?: Record<string, number>;
  grade?: string;
  status: "processing" | "complete" | "failed";
  errorMessage?: string;
};

function CameraIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-7 0h8"
      />
    </svg>
  );
}

export default function ShadowBattingPage() {
  const { user } = useMockAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyzedClipsRef = useRef<AnalyzedClip[]>([]);
  const recordingFinalizedRef = useRef(false);
  const isFirstPersistRunRef = useRef(true);

  const [hasPermission, setHasPermission] = useState(false);
  const [permissionError, setPermissionError] = useState("");
  const [selectedShotType, setSelectedShotType] = useState("COVER_DRIVE");
  const [shotSearchTerm, setShotSearchTerm] = useState("");
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [prepTimerSeconds, setPrepTimerSeconds] = useState(3);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [analysisResult, setAnalysisResult] = useState<{
    coachingFeedback: string;
    scores: Record<string, number>;
    grade: string;
  } | null>(null);
  const [analyzedClips, setAnalyzedClips] = useState<AnalyzedClip[]>([]);
  const isFirefox =
    typeof navigator !== "undefined" && /firefox/i.test(navigator.userAgent);

  const getPersistedVideoUrl = useCallback((videoId: string) => {
    return `/api/videos/${videoId}/stream`;
  }, []);

  const filteredShotTypes = useMemo(() => {
    const query = shotSearchTerm.trim().toLowerCase();
    if (!query) return SHOT_TYPES;
    return SHOT_TYPES.filter(
      (shot) =>
        shot.label.toLowerCase().includes(query) ||
        shot.value.toLowerCase().includes(query.replace(/\s+/g, "_"))
    );
  }, [shotSearchTerm]);

  const completeClips = useMemo(
    () => analyzedClips.filter((clip) => clip.status === "complete" && clip.scores),
    [analyzedClips]
  );

  const practiceCount = completeClips.length;

  const metricAverages = useMemo(() => {
    const metrics = DISPLAY_SCORE_METRICS.map((metric) => {
      const values = completeClips
        .map((clip) => Number(clip.scores?.[metric.key]))
        .filter((value) => Number.isFinite(value) && value > 0);
      if (values.length === 0) {
        return { ...metric, average: 0 };
      }
      const average = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
      return { ...metric, average };
    });
    return metrics;
  }, [completeClips]);

  const averageScore = useMemo(() => {
    const values = metricAverages.map((metric) => metric.average).filter((value) => value > 0);
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }, [metricAverages]);

  const strongestMetric = useMemo(() => {
    const candidates = metricAverages.filter((metric) => metric.average > 0);
    if (candidates.length === 0) return null;
    return [...candidates].sort((a, b) => b.average - a.average)[0];
  }, [metricAverages]);

  const weakestMetric = useMemo(() => {
    const candidates = metricAverages.filter((metric) => metric.average > 0);
    if (candidates.length === 0) return null;
    return [...candidates].sort((a, b) => a.average - b.average)[0];
  }, [metricAverages]);

  // Initialize webcam
  useEffect(() => {
    let cancelled = false;

    async function initWebcam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasPermission(true);
        setPermissionError("");
      } catch (err) {
        if (cancelled) return;
        console.error("Webcam access error:", err);
        setPermissionError(
          err instanceof Error && err.name === "NotAllowedError"
            ? "Camera permission denied. Please allow camera access and refresh the page."
            : "Failed to access camera. Please check your camera is connected and not in use."
        );
      }
    }

    void initWebcam();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    analyzedClipsRef.current = analyzedClips;
  }, [analyzedClips]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SHADOW_BATTING_PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        selectedShotType?: string;
        selectedDuration?: number;
        prepTimerSeconds?: number;
      };

      if (
        parsed.selectedShotType &&
        SHOT_TYPES.some((shot) => shot.value === parsed.selectedShotType)
      ) {
        setSelectedShotType(parsed.selectedShotType);
      }

      if (
        typeof parsed.selectedDuration === "number" &&
        DURATIONS.includes(parsed.selectedDuration)
      ) {
        setSelectedDuration(parsed.selectedDuration);
      }

      if (
        typeof parsed.prepTimerSeconds === "number" &&
        parsed.prepTimerSeconds >= 0 &&
        parsed.prepTimerSeconds <= 30
      ) {
        setPrepTimerSeconds(parsed.prepTimerSeconds);
      }
    } catch {
      // ignore invalid persisted preferences
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      SHADOW_BATTING_PREFS_KEY,
      JSON.stringify({
        selectedShotType,
        selectedDuration,
        prepTimerSeconds,
      })
    );
  }, [prepTimerSeconds, selectedDuration, selectedShotType]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SHADOW_BATTING_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AnalyzedClip[];
      const restored = parsed
        .filter((clip) => clip.status === "complete" && clip.serverVideoId)
        .map((clip) => ({
          ...clip,
          localUrl: getPersistedVideoUrl(String(clip.serverVideoId)),
        }));
      setAnalyzedClips(restored);
      if (restored.length > 0) {
        const latestClip = restored[0];
        if (latestClip.coachingFeedback && latestClip.scores && latestClip.grade) {
          setAnalysisResult({
            coachingFeedback: latestClip.coachingFeedback,
            scores: latestClip.scores,
            grade: latestClip.grade,
          });
        }
      }
    } catch {
      // ignore invalid persisted data
    }
  }, [getPersistedVideoUrl]);

  useEffect(() => {
    // Skip first run so we don't overwrite localStorage with [] before restore has populated state
    if (isFirstPersistRunRef.current) {
      isFirstPersistRunRef.current = false;
      return;
    }
    const persistableClips = analyzedClips
      .filter((clip) => clip.status === "complete" && clip.serverVideoId)
      .map((clip) => ({
        ...clip,
        localUrl: "",
      }));
    localStorage.setItem(SHADOW_BATTING_STORAGE_KEY, JSON.stringify(persistableClips));
  }, [analyzedClips]);

  useEffect(() => {
    return () => {
      analyzedClipsRef.current.forEach((clip) => {
        if (clip.localUrl.startsWith("blob:")) {
          URL.revokeObjectURL(clip.localUrl);
        }
      });
    };
  }, []);

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return;
    }

    // Firefox can behave poorly when requestData is called immediately pre-stop.
    if (!isFirefox) {
      try {
        recorder.requestData();
      } catch {
        // Ignore when requestData is not available in current state/browser.
      }
    }

    recorder.stop();
    setIsRecording(false);

    // Safety net: if onstop does not fire reliably, finalize from collected chunks.
    setTimeout(() => {
      if (!recordingFinalizedRef.current) {
        finalizeCurrentRecording(recorder.mimeType);
      }
      if (!recordingFinalizedRef.current && chunksRef.current.length === 0) {
        setUploadError("No video data captured. Please try recording again.");
      }
    }, isFirefox ? 4000 : 1200);
  }

  function resolveRecordingMimeType(): string | undefined {
    if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
      return undefined;
    }
    const firefoxPreferredTypes = [
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    const preferredTypes = isFirefox
      ? firefoxPreferredTypes
      : PREFERRED_RECORDING_MIME_TYPES;
    return preferredTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
  }

  function getBlobExtension(blob: Blob): string {
    if (blob.type.includes("mp4")) return "mp4";
    if (blob.type.includes("webm")) return "webm";
    return "webm";
  }

  const uploadAndAnalyzeBlob = useCallback(
    async (blob: Blob, localClipId: string) => {
      setIsUploading(true);
      setUploadError("");

      try {
        const formData = new FormData();
        const extension = getBlobExtension(blob);
        const filename = `shadow-batting-${selectedShotType}-${Date.now()}.${extension}`;
        formData.append("file", blob, filename);
        formData.append("shotType", selectedShotType);
        formData.append("duration", String(selectedDuration));

        const res = await fetch("/api/shadow-batting/upload", {
          method: "POST",
          headers: buildMockAuthHeaders(user),
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Upload failed");
        }

        const data = await res.json();
        const nextResult = {
          coachingFeedback:
            data.coachingFeedback ||
            "Great job! Keep practicing your technique.",
          scores: data.scores || {},
          grade: data.grade || "B+",
        };

        setAnalysisResult(nextResult);
        setAnalyzedClips((prev) => [
          ...prev.map((clip) =>
            clip.id === localClipId
              ? {
                  ...clip,
                  serverVideoId: String(data.id ?? ""),
                  localUrl: data.id ? getPersistedVideoUrl(String(data.id)) : clip.localUrl,
                  coachingFeedback: nextResult.coachingFeedback,
                  scores: nextResult.scores,
                  grade: nextResult.grade,
                  status: "complete",
                  errorMessage: undefined,
                }
              : clip
          ),
        ]);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setUploadError(message);
        setAnalyzedClips((prev) =>
          prev.map((clip) =>
            clip.id === localClipId
              ? {
                  ...clip,
                  status: "failed",
                  errorMessage: message,
                }
              : clip
          )
        );
      } finally {
        setIsUploading(false);
      }
    },
    [getPersistedVideoUrl, selectedDuration, selectedShotType, user]
  );

  const finalizeCurrentRecording = useCallback(
    (mimeTypeHint?: string) => {
      if (recordingFinalizedRef.current) return;

      if (chunksRef.current.length === 0) {
        return;
      }

      recordingFinalizedRef.current = true;
      setUploadError("");

      const blob = new Blob(chunksRef.current, {
        type: mimeTypeHint || "video/webm",
      });
      setRecordedBlob(blob);

      const localClipId = `local-${Date.now()}`;
      const localUrl = URL.createObjectURL(blob);
      setAnalyzedClips((prev) => [
        {
          id: localClipId,
          localUrl,
          createdAt: Date.now(),
          shotType: selectedShotType,
          duration: selectedDuration,
          prepTimer: prepTimerSeconds,
          status: "processing",
        },
        ...prev,
      ]);

      void uploadAndAnalyzeBlob(blob, localClipId);
    },
    [prepTimerSeconds, selectedDuration, selectedShotType, uploadAndAnalyzeBlob]
  );

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    try {
      chunksRef.current = [];
      recordingFinalizedRef.current = false;
      const supportedMimeType = resolveRecordingMimeType();
      const recorder = supportedMimeType
        ? new MediaRecorder(streamRef.current, { mimeType: supportedMimeType })
        : new MediaRecorder(streamRef.current);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setUploadError("Recording failed in browser. Please retry.");
      };

      recorder.onstop = () => {
        finalizeCurrentRecording(recorder.mimeType || supportedMimeType);
      };

      // Emit periodic chunks to improve compatibility with browsers
      // that are inconsistent about delivering data only on stop.
      if (isFirefox) {
        recorder.start();
      } else {
        recorder.start(250);
      }
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Recording error:", err);
      setUploadError("Failed to start recording. Please try again.");
    }
  }, [finalizeCurrentRecording, isFirefox]);

  // Countdown timer
  useEffect(() => {
    if (!isCountingDown) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsCountingDown(false);
      startRecording();
    }
  }, [countdown, isCountingDown, startRecording]);

  // Recording timer
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      setElapsedTime((prev) => {
        const next = prev + 1;
        if (next >= selectedDuration) {
          stopRecording();
          return selectedDuration;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, selectedDuration]);

  const startCountdown = useCallback(() => {
    if (prepTimerSeconds <= 0) {
      setElapsedTime(0);
      setRecordedBlob(null);
      setAnalysisResult(null);
      setUploadError("");
      startRecording();
      return;
    }

    setCountdown(prepTimerSeconds);
    setIsCountingDown(true);
    setElapsedTime(0);
    setRecordedBlob(null);
    setAnalysisResult(null);
    setUploadError("");
  }, [prepTimerSeconds, startRecording]);

  const handleRetryAnalysis = useCallback(() => {
    if (!recordedBlob) return;
    const localClipId = `local-${Date.now()}`;
    const localUrl = URL.createObjectURL(recordedBlob);
    setAnalyzedClips((prev) => [
      {
        id: localClipId,
        localUrl,
        createdAt: Date.now(),
        shotType: selectedShotType,
        duration: selectedDuration,
        prepTimer: prepTimerSeconds,
        status: "processing",
      },
      ...prev,
    ]);
    void uploadAndAnalyzeBlob(recordedBlob, localClipId);
  }, [
    prepTimerSeconds,
    recordedBlob,
    selectedDuration,
    selectedShotType,
    uploadAndAnalyzeBlob,
  ]);

  const handlePracticeAgain = useCallback(() => {
    setRecordedBlob(null);
    setAnalysisResult(null);
    setElapsedTime(0);
    setUploadError("");
  }, []);

  const handleDeleteClip = useCallback((clipId: string) => {
    setAnalyzedClips((previousClips) => {
      const targetClip = previousClips.find((clip) => clip.id === clipId);
      if (targetClip?.localUrl.startsWith("blob:")) {
        URL.revokeObjectURL(targetClip.localUrl);
      }
      return previousClips.filter((clip) => clip.id !== clipId);
    });
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getScoreToneClass = (score: number): string => {
    if (score >= 80) return "bg-emerald-500/12 text-emerald-700";
    if (score >= 70) return "bg-[var(--primary)]/12 text-[var(--primary)]";
    return "bg-amber-500/12 text-amber-700";
  };

  if (permissionError) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Shadow Batting</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Practice your batting technique with AI-powered feedback
          </p>
        </div>

        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--danger)]/10">
                <CameraIcon />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
                Camera Access Required
              </h2>
              <p className="mt-2 max-w-md text-[var(--text-secondary)]">{permissionError}</p>
              <Button
                onClick={() => window.location.reload()}
                className="mt-6 bg-[var(--primary)] hover:bg-[var(--primary-hover)]"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Shadow Batting</h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Practice your batting technique with AI-powered feedback
        </p>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          How it works: 1) Pick your shot and duration, 2) Start timer, 3) Perform movement after
          countdown, 4) Review your clip feedback below.
        </p>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-[var(--text-secondary)]">Average Grade</p>
            <p className="mt-1 text-2xl font-bold text-[var(--primary)]">
              {averageScore > 0 ? `${averageScore}%` : "--"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-[var(--text-secondary)]">Practice Count</p>
            <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{practiceCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-[var(--text-secondary)]">Top Strength</p>
            <p className="mt-1 text-sm font-semibold text-emerald-700">
              {strongestMetric ? `${strongestMetric.abbr} ${strongestMetric.average}` : "--"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-1">
              <p className="text-xs text-[var(--text-secondary)]">Main Weakness</p>
              <span
                title="This highlights the lowest scoring core batting mechanic. Improving this first often gives the biggest jump in consistency, control, and overall shot quality."
                className="cursor-help text-[11px] text-[var(--text-secondary)]"
              >
                ?
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-amber-700">
              {weakestMetric ? `${weakestMetric.abbr} ${weakestMetric.average}` : "--"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>Live Preview</CardHeader>
            <CardContent>
              <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />

                {/* Countdown overlay */}
                {isCountingDown && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <div className="text-9xl font-bold text-white">{countdown}</div>
                  </div>
                )}

                {/* Recording indicator */}
                {isRecording && (
                  <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-red-600 px-4 py-2">
                    <div className="h-3 w-3 animate-pulse rounded-full bg-white" />
                    <span className="text-sm font-semibold text-white">
                      REC {formatTime(elapsedTime)} / {formatTime(selectedDuration)}
                    </span>
                  </div>
                )}

                {/* Recorded preview */}
                {recordedBlob && !isRecording && !isCountingDown && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <div className="text-center">
                      <CheckCircleIcon />
                      <p className="mt-2 text-lg font-semibold text-white">
                        Recording Complete
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="mt-4 rounded-lg border border-[var(--danger)] bg-[var(--danger)]/10 p-3">
                  <p className="text-sm text-[var(--danger)]">{uploadError}</p>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-[var(--text-secondary)]">
                  {!hasPermission && "Initializing camera..."}
                  {hasPermission && !isRecording && !recordedBlob && "Ready to record"}
                  {isRecording && "Recording in progress..."}
                  {recordedBlob && !isUploading && !uploadError && "Analysis complete"}
                  {recordedBlob && !isUploading && uploadError && "Analysis failed - retry available"}
                  {isUploading && "Analyzing your technique..."}
                </div>

                <div className="flex gap-3">
                  {!isRecording && !isCountingDown && !recordedBlob && (
                    <Button
                      onClick={startCountdown}
                      disabled={!hasPermission}
                      className="gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)]"
                    >
                      <PlayIcon />
                      Start Timer
                    </Button>
                  )}

                  {isRecording && (
                    <Button
                      onClick={stopRecording}
                      variant="secondary"
                      className="gap-2"
                    >
                      <StopIcon />
                      Stop Recording
                    </Button>
                  )}

                  {recordedBlob && !isUploading && (
                    <>
                      <Button
                        onClick={handlePracticeAgain}
                        variant="secondary"
                      >
                        Retake
                      </Button>
                      {uploadError && (
                        <Button
                          onClick={handleRetryAnalysis}
                          className="gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)]"
                        >
                          Retry Analysis
                        </Button>
                      )}
                    </>
                  )}

                  {isUploading && (
                    <Button disabled className="gap-2">
                      Analyzing...
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>Shot Type</CardHeader>
            <CardContent>
              <input
                value={shotSearchTerm}
                onChange={(event) => setShotSearchTerm(event.target.value)}
                placeholder="Search shot type..."
                disabled={isRecording || isCountingDown}
                className="mb-3 w-full rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
              <select
                value={selectedShotType}
                onChange={(e) => setSelectedShotType(e.target.value)}
                disabled={isRecording || isCountingDown}
                className="w-full rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface)] px-4 py-2 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                {filteredShotTypes.length > 0 ? (
                  filteredShotTypes.map((shot) => (
                    <option key={shot.value} value={shot.value}>
                      {shot.label}
                    </option>
                  ))
                ) : (
                  <option value={selectedShotType}>No matches found</option>
                )}
              </select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>Prep Timer</CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Time before recording starts</span>
                  <span className="font-semibold text-[var(--text-primary)]">{prepTimerSeconds}s</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={30}
                  step={1}
                  value={prepTimerSeconds}
                  onChange={(e) => setPrepTimerSeconds(Number(e.target.value))}
                  disabled={isRecording || isCountingDown || isUploading}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[var(--surface-secondary)]"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>Duration</CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {DURATIONS.map((duration) => (
                  <button
                    key={duration}
                    onClick={() => setSelectedDuration(duration)}
                    disabled={isRecording || isCountingDown}
                    className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                      selectedDuration === duration
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                        : "border-[var(--surface-secondary)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--primary)]"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {duration}s
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {analysisResult && (
        <Card className="mt-6">
          <CardHeader>Latest Analysis</CardHeader>
          <CardContent>
            <div className="rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface-secondary)]/30 p-6">
              <div className="mb-3 text-2xl font-bold text-[var(--primary)]">
                Grade: {analysisResult.grade}
              </div>
              <p className="text-[var(--text-secondary)]">{analysisResult.coachingFeedback}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {analyzedClips.length > 0 && (
        <Card className="mt-6">
          <CardHeader>Session Clips</CardHeader>
          <CardContent>
            <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
              {analyzedClips.map((clip) => (
                <article
                  key={clip.id}
                  className="w-[320px] min-w-[320px] rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface)] p-3"
                >
                  <video
                    src={clip.localUrl}
                    controls
                    className="aspect-video w-full rounded-md bg-black object-cover"
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {clip.shotType.replace(/_/g, " ")}
                    </p>
                    <div className="flex items-center gap-2">
                      {clip.status === "complete" && clip.grade && (
                        <span className="rounded-full bg-[var(--primary)]/10 px-2 py-1 text-xs font-semibold text-[var(--primary)]">
                          Grade {clip.grade}
                        </span>
                      )}
                      {clip.status === "processing" && (
                        <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-xs font-semibold text-yellow-700">
                          Processing
                        </span>
                      )}
                      {clip.status === "failed" && (
                        <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-700">
                          Failed
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteClip(clip.id)}
                        className="rounded-md p-1 text-[var(--text-secondary)] transition-all duration-200 hover:bg-[var(--surface-secondary)] hover:text-[var(--danger)]"
                        aria-label="Delete clip"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                  {clip.status === "complete" && clip.scores && (
                    <div className="mt-2 overflow-x-auto">
                      <div className="flex min-w-max items-center gap-1 whitespace-nowrap text-[10px] font-semibold">
                        {DISPLAY_SCORE_METRICS.map((metric) => {
                          const score = Number(clip.scores?.[metric.key] ?? 0);
                          return (
                            <span
                              key={`${clip.id}-${metric.key}`}
                              className={`rounded px-1.5 py-0.5 ${getScoreToneClass(score)}`}
                              title={`${metric.label}: ${score}`}
                            >
                              {metric.abbr} {score}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {clip.status === "complete" && clip.coachingFeedback && (
                    <p className="mt-2 line-clamp-3 text-sm text-[var(--text-secondary)]">
                      {clip.coachingFeedback}
                    </p>
                  )}
                  {clip.status === "processing" && (
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      Uploading and analyzing clip...
                    </p>
                  )}
                  {clip.status === "failed" && (
                    <p className="mt-2 text-sm text-red-700">
                      {clip.errorMessage ?? "Analysis failed"}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    Prep {clip.prepTimer}s • Duration {clip.duration}s
                  </p>
                </article>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
