"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
];

const DURATIONS = [15, 30, 45, 60];

function CameraIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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

export default function ShadowBattingPage() {
  const router = useRouter();
  const { user } = useMockAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasPermission, setHasPermission] = useState(false);
  const [permissionError, setPermissionError] = useState("");
  const [selectedShotType, setSelectedShotType] = useState("COVER_DRIVE");
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(3);
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
  }, [isCountingDown, countdown]);

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
    setCountdown(3);
    setIsCountingDown(true);
    setElapsedTime(0);
    setRecordedBlob(null);
    setAnalysisResult(null);
    setUploadError("");
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    try {
      chunksRef.current = [];
      const recorder = new MediaRecorder(streamRef.current, {
        mimeType: "video/webm;codecs=vp8,opus",
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setRecordedBlob(blob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Recording error:", err);
      setUploadError("Failed to start recording. Please try again.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const handleUploadAndAnalyze = useCallback(async () => {
    if (!recordedBlob) return;

    setIsUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      const filename = `shadow-batting-${selectedShotType}-${Date.now()}.webm`;
      formData.append("file", recordedBlob, filename);
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
      
      // Set analysis results
      setAnalysisResult({
        coachingFeedback: data.coachingFeedback || "Great job! Keep practicing your technique.",
        scores: data.scores || {},
        grade: data.grade || "B+",
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }, [recordedBlob, selectedShotType, selectedDuration, user]);

  const handlePracticeAgain = useCallback(() => {
    setRecordedBlob(null);
    setAnalysisResult(null);
    setElapsedTime(0);
    setUploadError("");
  }, []);

  const handleViewFullAnalysis = useCallback(() => {
    // Navigate to the analysis page if we have a video ID
    // For now, just reset to practice again
    handlePracticeAgain();
  }, [handlePracticeAgain]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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

  if (analysisResult) {
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
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--success)]/10 text-[var(--success)]">
                <CheckCircleIcon />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">
                Analysis Complete!
              </h2>
              <div className="mt-2 text-4xl font-bold text-[var(--primary)]">
                Grade: {analysisResult.grade}
              </div>

              <div className="mt-8 w-full max-w-2xl rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface-secondary)]/30 p-6 text-left">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  Coaching Feedback
                </h3>
                <p className="mt-2 text-[var(--text-secondary)]">
                  {analysisResult.coachingFeedback}
                </p>

                {Object.keys(analysisResult.scores).length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                      Technique Scores
                    </h4>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {Object.entries(analysisResult.scores).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between rounded-md border border-[var(--surface-secondary)] bg-[var(--surface)] px-3 py-2"
                        >
                          <span className="text-sm capitalize text-[var(--text-secondary)]">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                          <span className="text-sm font-semibold text-[var(--text-primary)]">
                            {value}/100
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                <Button
                  onClick={handlePracticeAgain}
                  variant="secondary"
                  className="gap-2"
                >
                  <TargetIcon />
                  Practice Again
                </Button>
                <Button
                  onClick={handleViewFullAnalysis}
                  className="gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)]"
                >
                  View Full Analysis
                </Button>
              </div>
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
                  {recordedBlob && !isUploading && "Ready to analyze"}
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
                      <Button
                        onClick={handleUploadAndAnalyze}
                        className="gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)]"
                      >
                        Analyze
                      </Button>
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
              <select
                value={selectedShotType}
                onChange={(e) => setSelectedShotType(e.target.value)}
                disabled={isRecording || isCountingDown}
                className="w-full rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface)] px-4 py-2 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                {SHOT_TYPES.map((shot) => (
                  <option key={shot.value} value={shot.value}>
                    {shot.label}
                  </option>
                ))}
              </select>
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

          <Card>
            <CardHeader>How It Works</CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm text-[var(--text-secondary)]">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-semibold text-white">
                    1
                  </span>
                  <span>Select your shot type and duration</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-semibold text-white">
                    2
                  </span>
                  <span>Click "Start Timer" and get ready</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-semibold text-white">
                    3
                  </span>
                  <span>Perform your shadow batting after countdown</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-semibold text-white">
                    4
                  </span>
                  <span>Get instant AI feedback and scores</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
