"use client";

import React, { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Select } from "@/app/components/ui/Select";
import { PreUploadChecklist } from "@/app/components/video/PreUploadChecklist";
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
import { stageLabelForAnalysis } from "@/app/lib/uploads-display";

interface RecentVideoApiItem {
  id: string;
  filename: string;
  uploadedAt: string;
  processingState: "analyzed" | "processing" | "failed" | "unsupported";
  analysis: {
    status: string;
    gradeLetter?: string | null;
    activityType?: string | null;
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
    processingLabel: stageLabelForAnalysis(
      video.analysis?.status,
      video.analysis?.activityType
    ),
    gradeLetter: video.analysis?.gradeLetter ?? null,
    activityType: video.analysis?.activityType ?? null,
  };
}

function CloudUploadIcon({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

function BulkUploadIcon({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4-4m0 0l4 4m-4-4v12"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 8h.01M12 8h.01M17 8h.01"
      />
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

const MAX_BULK_FILES = 20;

export default function UploadPage() {
  const searchParams = useSearchParams();
  const { user, role } = useMockAuth();
  const [file, setFile] = useState<File | null>(null);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [validationError, setValidationError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isBulkDragging, setIsBulkDragging] = useState(false);
  const [assignablePlayers, setAssignablePlayers] = useState<Array<{ id: string; displayName: string }>>([]);
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([]);
  const [isRecentUploadsLoading, setIsRecentUploadsLoading] = useState(true);
  const [recentUploadsError, setRecentUploadsError] = useState<string | null>(null);
  const [shotHintsModalOpen, setShotHintsModalOpen] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [uploadActivity, setUploadActivity] = useState<"batting" | "bowling" | "other">("batting");
  const bowlingEnabled = process.env.NEXT_PUBLIC_KODA_ENABLE_BOWLING_ANALYSIS === "true";
  const activityOptions = bowlingEnabled
    ? (["batting", "bowling", "other"] as const)
    : (["batting", "other"] as const);

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

  const applyBulkFiles = useCallback(
    (incoming: FileList | File[]) => {
      const list = Array.from(incoming);
      if (list.length === 0) return;

      if (list.length > MAX_BULK_FILES) {
        setValidationError(`You can upload up to ${MAX_BULK_FILES} videos at once`);
        return;
      }

      const valid: File[] = [];
      for (const candidate of list) {
        const result = validateVideoFile(candidate);
        if (!result.valid) {
          setValidationError(`${candidate.name}: ${result.error ?? "Invalid file"}`);
          return;
        }
        valid.push(candidate);
      }

      setValidationError("");
      setFile(null);
      setBulkFiles(valid);
      setSubmitError(null);
      setUploadSuccessMessage(null);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (isUploading) return;
      const dropped = e.dataTransfer.files[0];
      if (!dropped) return;
      if (handleValidation(dropped)) {
        setBulkFiles([]);
        setFile(dropped);
      }
    },
    [isUploading, handleValidation]
  );

  const handleBulkDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsBulkDragging(false);
      if (isUploading) return;
      applyBulkFiles(e.dataTransfer.files);
    },
    [isUploading, applyBulkFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleBulkDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsBulkDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleBulkDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsBulkDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (!selected) return;
      if (handleValidation(selected)) {
        setBulkFiles([]);
        setFile(selected);
      }
      e.target.value = "";
    },
    [handleValidation]
  );

  const handleBulkFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) return;
      applyBulkFiles(e.target.files);
      e.target.value = "";
    },
    [applyBulkFiles]
  );

  const handleBrowse = useCallback(() => {
    if (isUploading) return;
    document.getElementById("video-file-input")?.click();
  }, [isUploading]);

  const handleBulkBrowse = useCallback(() => {
    if (isUploading) return;
    document.getElementById("video-bulk-file-input")?.click();
  }, [isUploading]);

  const handleClearFile = useCallback(() => {
    if (isUploading) return;
    setFile(null);
    setValidationError("");
    setSubmitError(null);
  }, [isUploading]);

  const handleClearBulkFiles = useCallback(() => {
    if (isUploading) return;
    setBulkFiles([]);
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
    if (uploadActivity === "bowling") {
      void runUploadAfterShotHints(1, ["UNKNOWN"]);
      return;
    }
    setShotHintsModalOpen(true);
  }, [file, isUploading, preventUpload, uploadActivity, runUploadAfterShotHints]);

  const runBulkUpload = useCallback(async () => {
    if (bulkFiles.length === 0 || isUploading || preventUpload) return;

    setSubmitError(null);
    setUploadSuccessMessage(null);
    setIsUploading(true);
    setUploadProgress(0);
    setBulkProgress({ current: 0, total: bulkFiles.length });

    const uploadedIds: string[] = [];
    const failures: string[] = [];

    try {
      for (let index = 0; index < bulkFiles.length; index += 1) {
        const currentFile = bulkFiles[index];
        setBulkProgress({ current: index + 1, total: bulkFiles.length });
        setUploadProgress(0);

        const formData = new FormData();
        formData.append("file", currentFile);
        formData.append("title", currentFile.name);
        formData.append("declaredShotCount", "1");
        formData.append("playerDeclaredShotHints", JSON.stringify(["UNKNOWN"]));
        if (assigneeUserId) {
          formData.append("assigneeUserId", assigneeUserId);
        }

        try {
          const data = await uploadVideoWithProgress(formData);
          uploadedIds.push(data.id);
          setRecentUploads((currentUploads) => [
            {
              id: data.id,
              filename: currentFile.name,
              status: "processing",
              timestamp: "Just now",
              processingLabel: "Queued",
            },
            ...currentUploads.filter((upload) => upload.id !== data.id),
          ]);
        } catch (err) {
          failures.push(
            `${currentFile.name}: ${err instanceof Error ? err.message : "Upload failed"}`
          );
        }
      }

      if (uploadedIds.length > 0) {
        setBulkFiles([]);
        setUploadSuccessMessage(
          failures.length === 0
            ? `${uploadedIds.length} video${uploadedIds.length === 1 ? "" : "s"} uploaded. Analysis is running in the background — check Recent Uploads for status.`
            : `${uploadedIds.length} uploaded, ${failures.length} failed. ${failures[0]}`
        );
        void loadRecentUploads();
      }

      if (failures.length > 0 && uploadedIds.length === 0) {
        setSubmitError(failures.join(" · "));
      } else if (failures.length > 0 && uploadedIds.length > 0) {
        setSubmitError(`${failures.length} file${failures.length === 1 ? "" : "s"} failed: ${failures.join(" · ")}`);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setBulkProgress(null);
    }
  }, [
    bulkFiles,
    isUploading,
    preventUpload,
    assigneeUserId,
    uploadVideoWithProgress,
    loadRecentUploads,
  ]);

  const formatChips = ["MP4", "MOV", "AVI", `MAX ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`];
  const categoryLabel =
    uploadActivity === "batting"
      ? "batting"
      : uploadActivity === "bowling"
        ? "bowling"
        : "fielding / keeping";
  const anyBusy = isUploading;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Upload Video for Analysis
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          {bowlingEnabled
            ? "Upload your cricket batting or bowling video to get detailed technique analysis and personalized feedback."
            : "Upload your cricket batting video to get detailed technique analysis and personalized feedback."}
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
                  {activityOptions.map((activity) => (
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
                      {activity === "batting"
                        ? "Batting"
                        : activity === "bowling"
                          ? "Bowling"
                          : bowlingEnabled
                            ? "Fielding (coming soon)"
                            : "Other (bowling, fielding…)"}
                    </button>
                  ))}
                </div>
                {uploadActivity === "other" && (
                  <p className="mt-3 rounded-md bg-[var(--warning)]/10 px-3 py-2 text-xs text-[var(--warning)]">
                    {bowlingEnabled
                      ? "Fielding analysis is coming soon. Please upload a batting or bowling clip for now."
                      : "Koda currently analyses batting technique only. Bowling and fielding analysis is coming soon."}
                  </p>
                )}
              </div>

              <div
                className={`relative min-h-[280px] overflow-hidden rounded-lg border-2 border-dashed transition-colors ${
                  isDragging || isBulkDragging
                    ? "border-[var(--primary)] bg-[var(--primary)]/5"
                    : "border-[var(--surface-secondary)] bg-[var(--surface-secondary)]/30"
                } ${anyBusy ? "opacity-60" : ""}`}
              >
                <div className="grid h-full min-h-[280px] md:grid-cols-2">
                  {/* Single upload */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`relative flex flex-col items-center justify-center px-6 py-8 ${
                      anyBusy ? "cursor-not-allowed" : "cursor-pointer"
                    } ${isDragging ? "bg-[var(--primary)]/5" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={handleBrowse}
                    onKeyDown={(e) => e.key === "Enter" && handleBrowse()}
                    aria-label="Drop a single video here or click to browse files"
                  >
                    <input
                      id="video-file-input"
                      type="file"
                      accept={ACCEPTED_EXTENSIONS.map((e) => `*${e}`).join(",")}
                      className="sr-only"
                      onChange={handleFileInput}
                      disabled={anyBusy}
                    />

                    {!file ? (
                      <>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                          Single upload
                        </p>
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)] text-white">
                          <CloudUploadIcon className="h-8 w-8" />
                        </div>
                        <p className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
                          Drop your video here
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          or click to browse files
                        </p>
                        <div className="mt-5 flex flex-wrap justify-center gap-2">
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
                      <div className="flex w-full flex-col items-center px-2">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                          Single upload
                        </p>
                        <p className="text-center text-base font-medium text-[var(--text-primary)]">
                          {file.name}
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {formatFileSize(file.size)}
                        </p>
                        {isUploading && !bulkProgress && (
                          <div className="mt-4 w-full max-w-xs">
                            <Progress value={uploadProgress} showLabel />
                          </div>
                        )}
                        {!anyBusy && (
                          <Button
                            variant="ghost"
                            className="mt-3 text-[var(--danger)] hover:bg-[var(--danger)]/10"
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

                  {/* Bulk upload — dotted divider via border */}
                  <div
                    onDrop={handleBulkDrop}
                    onDragOver={handleBulkDragOver}
                    onDragLeave={handleBulkDragLeave}
                    className={`relative flex flex-col items-center justify-center border-t border-dotted border-[var(--text-secondary)]/40 px-6 py-8 md:border-l md:border-t-0 ${
                      anyBusy ? "cursor-not-allowed" : "cursor-pointer"
                    } ${isBulkDragging ? "bg-[var(--primary)]/5" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={handleBulkBrowse}
                    onKeyDown={(e) => e.key === "Enter" && handleBulkBrowse()}
                    aria-label="Drop multiple videos here or click to browse files for bulk upload"
                  >
                    <input
                      id="video-bulk-file-input"
                      type="file"
                      multiple
                      accept={ACCEPTED_EXTENSIONS.map((e) => `*${e}`).join(",")}
                      className="sr-only"
                      onChange={handleBulkFileInput}
                      disabled={anyBusy}
                    />

                    {bulkFiles.length === 0 ? (
                      <>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                          Bulk upload
                        </p>
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--primary)] bg-[var(--surface)] text-[var(--primary)]">
                          <BulkUploadIcon className="h-8 w-8" />
                        </div>
                        <p className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
                          Drop multiple videos
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          or click to select up to {MAX_BULK_FILES} files
                        </p>
                        <p className="mt-4 max-w-xs text-center text-xs leading-relaxed text-[var(--text-secondary)]">
                          Please only upload videos in the same category
                          (batting/bowling/fielding/keeping). Selected tab:{" "}
                          <span className="font-medium text-[var(--text-primary)]">{categoryLabel}</span>.
                        </p>
                      </>
                    ) : (
                      <div
                        className="flex w-full flex-col items-center px-2"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                          Bulk upload
                        </p>
                        <p className="text-center text-base font-medium text-[var(--text-primary)]">
                          {bulkFiles.length} video{bulkFiles.length === 1 ? "" : "s"} selected
                        </p>
                        <ul className="mt-3 max-h-28 w-full max-w-sm space-y-1 overflow-y-auto text-left text-xs text-[var(--text-secondary)]">
                          {bulkFiles.map((bulkFile) => (
                            <li
                              key={`${bulkFile.name}-${bulkFile.size}-${bulkFile.lastModified}`}
                              className="truncate rounded bg-[var(--surface)] px-2 py-1"
                            >
                              {bulkFile.name}{" "}
                              <span className="opacity-70">({formatFileSize(bulkFile.size)})</span>
                            </li>
                          ))}
                        </ul>
                        {bulkProgress && (
                          <div className="mt-4 w-full max-w-xs">
                            <p className="mb-1 text-center text-xs text-[var(--text-secondary)]">
                              Uploading {bulkProgress.current} of {bulkProgress.total}
                            </p>
                            <Progress value={uploadProgress} showLabel />
                          </div>
                        )}
                        <p className="mt-3 max-w-xs text-center text-xs leading-relaxed text-[var(--text-secondary)]">
                          Please only upload videos in the same category
                          (batting/bowling/fielding/keeping). Selected tab:{" "}
                          <span className="font-medium text-[var(--text-primary)]">{categoryLabel}</span>.
                        </p>
                        {!anyBusy && (
                          <div className="mt-3 flex flex-wrap justify-center gap-2">
                            <Button
                              variant="ghost"
                              className="text-[var(--danger)] hover:bg-[var(--danger)]/10"
                              onClick={handleClearBulkFiles}
                            >
                              Clear
                            </Button>
                            <Button
                              onClick={() => void runBulkUpload()}
                              disabled={preventUpload}
                              className="bg-[var(--primary)] hover:bg-[var(--primary-hover)]"
                            >
                              Upload {bulkFiles.length} video{bulkFiles.length === 1 ? "" : "s"}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
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
                    disabled={anyBusy}
                  >
                    <CameraIcon />
                    Record
                  </Button>
                  <Button
                    onClick={
                      bulkFiles.length > 0
                        ? () => void runBulkUpload()
                        : file
                          ? openShotHintsModal
                          : handleBrowse
                    }
                    disabled={
                      anyBusy ||
                      ((Boolean(file) || bulkFiles.length > 0) && preventUpload)
                    }
                    className="gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)]"
                  >
                    {anyBusy
                      ? bulkProgress
                        ? `Uploading ${bulkProgress.current}/${bulkProgress.total}…`
                        : "Uploading…"
                      : bulkFiles.length > 0
                        ? `Upload ${bulkFiles.length} video${bulkFiles.length === 1 ? "" : "s"}`
                        : file
                          ? "Upload & Analyze"
                          : "Choose File"}
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
