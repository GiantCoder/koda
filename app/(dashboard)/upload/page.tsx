"use client";

import React, { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Select } from "@/app/components/ui/Select";
import { PreUploadChecklist } from "@/app/components/video/PreUploadChecklist";
import { BestCameraAngleCard } from "@/app/components/video/BestCameraAngleCard";
import { RecentUploadsList, type RecentUpload } from "@/app/components/video/RecentUploadsList";
import { UploadShotHintsModal } from "@/app/components/video/UploadShotHintsModal";
import { Progress } from "@/app/components/ui/Progress";
import { useMockAuth } from "@/app/hooks/useMockAuth";
import { buildMockAuthHeaders } from "@/app/lib/mock-auth-headers";
import {
  validateVideoFile,
  formatFileSize,
  ACCEPTED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
} from "@/app/lib/video-validators";
import { STAGE_LABELS } from "@/app/lib/uploads-display";

interface RecentVideoApiItem {
  id: string;
  filename: string;
  uploadedAt: string;
  processingState: "analyzed" | "processing" | "failed" | "unsupported";
  analysis: {
    status: string;
    gradeLetter?: string | null;
  } | null;
}

function toRelativeTimestamp(value: string): string {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Just now";
  }

  const diffMs = Date.now() - parsedDate.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return parsedDate.toLocaleDateString("en-GB");
}

function mapVideoToRecentUpload(video: RecentVideoApiItem): RecentUpload {
  return {
    id: video.id,
    filename: video.filename,
    status: video.processingState,
    timestamp: toRelativeTimestamp(video.uploadedAt),
    processingLabel: video.analysis?.status ? STAGE_LABELS[video.analysis.status] : "Queued",
    gradeLetter: video.analysis?.gradeLetter ?? null,
  };
}

function CloudUploadIcon() {
  return (
    <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

export default function UploadPage() {
  const searchParams = useSearchParams();
  const { user, role } = useMockAuth();
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [assignablePlayers, setAssignablePlayers] = useState<Array<{ id: string; displayName: string }>>([]);
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([]);
  const [isRecentUploadsLoading, setIsRecentUploadsLoading] = useState(true);
  const [recentUploadsError, setRecentUploadsError] = useState<string | null>(null);
  const [shotHintsModalOpen, setShotHintsModalOpen] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [uploadActivity, setUploadActivity] = useState<"batting" | "other">("batting");

  React.useEffect(() => {
    let cancelled = false;
    async function loadPlayers() {
      if (role !== "coach" && role !== "parent") {
        return;
      }
      try {
        const res = await fetch("/api/team/players", {
          headers: buildMockAuthHeaders(user),
        });
        if (!res.ok) return;
        const data = await res.json();
        const players = Array.isArray(data.players)
          ? data.players
              .filter((player: any): player is { id: string; displayName: string } =>
                Boolean(player && typeof player.id === "string" && typeof player.displayName === "string")
              )
          : [];
        if (cancelled) return;
        setAssignablePlayers(players);
        const preselectedAssignee = searchParams.get("assignee");
        if (preselectedAssignee && players.some((player: { id: string; displayName: string }) => player.id === preselectedAssignee)) {
          setAssigneeUserId(preselectedAssignee);
          return;
        }
        if (role === "parent" && players.length === 1) {
          setAssigneeUserId(players[0].id);
        }
      } catch {
        // Keep upload flow functional even if player list endpoint is unavailable.
      }
    }
    void loadPlayers();
    return () => {
      cancelled = true;
    };
  }, [role, user, searchParams]);

  const loadRecentUploads = useCallback(async () => {
    if (!user) {
      setRecentUploads([]);
      setIsRecentUploadsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/videos?limit=8", {
        headers: buildMockAuthHeaders(user),
      });
      if (!res.ok) {
        throw new Error(`Failed to load recent uploads (${res.status})`);
      }
      const data = (await res.json()) as { videos?: RecentVideoApiItem[] };
      const uploads = Array.isArray(data.videos)
        ? data.videos.map(mapVideoToRecentUpload)
        : [];
      setRecentUploads(uploads);
      setRecentUploadsError(null);
    } catch (error) {
      setRecentUploadsError(error instanceof Error ? error.message : "Failed to load recent uploads");
    } finally {
      setIsRecentUploadsLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    void loadRecentUploads();
  }, [loadRecentUploads]);

  React.useEffect(() => {
    if (recentUploads.length === 0 || !recentUploads.some((upload) => upload.status === "processing")) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadRecentUploads();
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [recentUploads, loadRecentUploads]);

  const handleValidation = useCallback(
    (f: File) => {
      const result = validateVideoFile(f);
      if (!result.valid) {
        setValidationError(result.error ?? "Invalid file");
        return false;
      }
      setValidationError("");
      return true;
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (isUploading) return;
      const dropped = e.dataTransfer.files[0];
      if (!dropped) return;
      if (handleValidation(dropped)) {
        setFile(dropped);
      }
    },
    [isUploading, handleValidation]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (!selected) return;
      if (handleValidation(selected)) {
        setFile(selected);
      }
      e.target.value = "";
    },
    [handleValidation]
  );

  const handleBrowse = useCallback(() => {
    if (isUploading) return;
    document.getElementById("video-file-input")?.click();
  }, [isUploading]);

  const handleClearFile = useCallback(() => {
    if (isUploading) return;
    setFile(null);
    setValidationError("");
    setSubmitError(null);
  }, [isUploading]);

  const assigneeOptions = assignablePlayers.map((player) => ({
    value: player.id,
    label: player.displayName,
  }));
  const needsParentSelection = role === "parent" && assignablePlayers.length > 1 && !assigneeUserId;
  const preventUpload = uploadActivity === "other" || needsParentSelection;

  const uploadVideoWithProgress = useCallback(
    (formData: FormData): Promise<{ id: string }> =>
      new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/video/upload");
        const headers = buildMockAuthHeaders(user);
        Object.entries(headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const pct = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(Math.min(99, pct));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText) as { id: string });
            } catch {
              reject(new Error("Invalid upload response"));
            }
            return;
          }
          try {
            const data = JSON.parse(xhr.responseText) as { error?: string };
            reject(new Error(data.error ?? "Upload failed"));
          } catch {
            reject(new Error("Upload failed"));
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(formData);
      }),
    [user]
  );

  const runUploadAfterShotHints = useCallback(
    async (declaredShotCount: number, hints: string[]) => {
      if (!file) return;

      setShotHintsModalOpen(false);
      setSubmitError(null);
      setUploadSuccessMessage(null);
      setIsUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);
      formData.append("declaredShotCount", String(declaredShotCount));
      formData.append("playerDeclaredShotHints", JSON.stringify(hints));
      if (assigneeUserId) {
        formData.append("assigneeUserId", assigneeUserId);
      }

      try {
        const data = await uploadVideoWithProgress(formData);
        setUploadProgress(100);

        const optimisticRecentUpload: RecentUpload = {
          id: data.id,
          filename: file.name,
          status: "processing",
          timestamp: "Just now",
          processingLabel: "Queued",
        };
        setRecentUploads((currentUploads) => [
          optimisticRecentUpload,
          ...currentUploads.filter((upload) => upload.id !== data.id),
        ]);
        setFile(null);
        setUploadSuccessMessage(
          "Upload complete. Analysis is running in the background — check Recent Uploads for status."
        );
        void loadRecentUploads();
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [file, assigneeUserId, loadRecentUploads, uploadVideoWithProgress]
  );

  const openShotHintsModal = useCallback(() => {
    if (!file || isUploading || preventUpload) return;
    setShotHintsModalOpen(true);
  }, [file, isUploading, preventUpload]);

  const formatChips = ["MP4", "MOV", "AVI", `MAX ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Upload Video for Analysis
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Upload your cricket batting video to get detailed technique analysis and personalized feedback.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>Video Upload</CardHeader>
            <PreUploadChecklist />
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface-secondary)]/40 p-4">
                <p className="mb-3 text-sm font-medium text-[var(--text-primary)]">What are you practising?</p>
                <div className="flex gap-3">
                  {(["batting", "other"] as const).map((activity) => (
                    <button
                      key={activity}
                      type="button"
                      onClick={() => setUploadActivity(activity)}
                      className={`flex-1 rounded-lg border-2 py-3 text-sm font-medium transition-colors ${
                        uploadActivity === activity
                          ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                          : "border-[var(--surface-secondary)] text-[var(--text-secondary)] hover:border-[var(--primary)]/50"
                      }`}
                    >
                      {activity === "batting" ? "Batting" : "Other (bowling, fielding…)"}
                    </button>
                  ))}
                </div>
                {uploadActivity === "other" && (
                  <p className="mt-3 rounded-md bg-[var(--warning)]/10 px-3 py-2 text-xs text-[var(--warning)]">
                    Koda currently analyses batting technique only. Bowling and fielding analysis is coming soon.
                  </p>
                )}
              </div>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative flex min-h-[280px] flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                  isDragging
                    ? "border-[var(--primary)] bg-[var(--primary)]/5"
                    : "border-[var(--surface-secondary)] bg-[var(--surface-secondary)]/30"
                } ${isUploading ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                role="button"
                tabIndex={0}
                onClick={handleBrowse}
                onKeyDown={(e) => e.key === "Enter" && handleBrowse()}
                aria-label="Drop your video here or click to browse files"
              >
                <input
                  id="video-file-input"
                  type="file"
                  accept={ACCEPTED_EXTENSIONS.map((e) => `*${e}`).join(",")}
                  className="sr-only"
                  onChange={handleFileInput}
                  disabled={isUploading}
                />

                {!file ? (
                  <>
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--primary)]">
                      <CloudUploadIcon />
                    </div>
                    <p className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
                      Drop your video here
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      or click to browse files
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      {formatChips.map((chip) => (
                        <span
                          key={chip}
                          className="rounded-md border border-[var(--surface-secondary)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex w-full flex-col items-center px-8">
                    <p className="text-center text-lg font-medium text-[var(--text-primary)]">
                      {file.name}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {formatFileSize(file.size)}
                    </p>
                    {isUploading && (
                      <div className="mt-6 w-full max-w-md">
                        <Progress value={uploadProgress} showLabel />
                      </div>
                    )}
                    {!isUploading && (
                      <Button
                        variant="ghost"
                        className="mt-4 text-[var(--danger)] hover:bg-[var(--danger)]/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearFile();
                        }}
                        aria-label="Remove selected video"
                      >
                        Remove file
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {validationError && (
                <p className="text-sm text-[var(--danger)]" role="alert">
                  {validationError}
                </p>
              )}

              {(role === "coach" || role === "parent") && assignablePlayers.length > 0 && (
                <div className="rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface-secondary)]/40 p-3">
                  {role === "parent" && assignablePlayers.length === 1 ? (
                    <p className="text-sm text-[var(--text-secondary)]">
                      This upload will be assigned to <span className="font-medium text-[var(--text-primary)]">{assignablePlayers[0].displayName}</span>.
                    </p>
                  ) : (
                    <Select
                      label={role === "coach" ? "Assign to player (optional)" : "Assign to child player"}
                      options={assigneeOptions}
                      value={assigneeUserId}
                      onChange={(e) => setAssigneeUserId(e.target.value)}
                      error={needsParentSelection ? "Please choose which child this video is for." : undefined}
                    />
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <LockIcon />
                  <span>Secure encryption</span>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    className="gap-2"
                    disabled={isUploading}
                  >
                    <CameraIcon />
                    Record
                  </Button>
                  <Button
                    onClick={file ? openShotHintsModal : handleBrowse}
                    disabled={isUploading || preventUpload}
                    className="gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)]"
                  >
                    {isUploading ? "Uploading…" : file ? "Upload & Analyze" : "Choose File"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {uploadSuccessMessage && (
            <div
              className="rounded-lg border border-[var(--success)]/50 bg-[var(--success)]/10 p-4"
              role="status"
            >
              <p className="text-sm text-[var(--text-primary)]">{uploadSuccessMessage}</p>
              <Button
                variant="secondary"
                className="mt-2"
                onClick={() => setUploadSuccessMessage(null)}
              >
                Dismiss
              </Button>
            </div>
          )}

          {submitError && (
            <div
              className="rounded-lg border border-[var(--danger)] bg-[var(--danger)]/10 p-4"
              role="alert"
            >
              <p className="text-sm text-[var(--danger)]">{submitError}</p>
              <Button
                variant="secondary"
                className="mt-2"
                onClick={() => setSubmitError(null)}
              >
                Dismiss
              </Button>
            </div>
          )}

          <UploadShotHintsModal
            isOpen={shotHintsModalOpen}
            onClose={() => setShotHintsModalOpen(false)}
            onConfirm={(declaredShotCount, hints) => {
              void runUploadAfterShotHints(declaredShotCount, hints);
            }}
          />
        </div>

        <div className="space-y-6">
          <BestCameraAngleCard />
          <RecentUploadsList
            uploads={recentUploads}
            user={user}
            onUploadsChanged={() => void loadRecentUploads()}
            emptyMessage={
              isRecentUploadsLoading
                ? "Loading recent uploads..."
                : recentUploadsError ?? "No recent uploads"
            }
          />
        </div>
      </div>
    </div>
  );
}
