"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { PreUploadChecklist } from "@/app/components/video/PreUploadChecklist";
import { BestCameraAngleCard } from "@/app/components/video/BestCameraAngleCard";
import { RecentUploadsList, type RecentUpload } from "@/app/components/video/RecentUploadsList";
import { Progress } from "@/app/components/ui/Progress";
import {
  validateVideoFile,
  formatFileSize,
  ACCEPTED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
} from "@/app/lib/video-validators";

const MOCK_RECENT_UPLOADS: RecentUpload[] = [
  { id: "vid_demo_1", filename: "cover_drive_practice.mp4", status: "analyzed", timestamp: "2 hours ago" },
  { id: "vid_demo_2", filename: "straight_drive_session.mp4", status: "analyzed", timestamp: "Yesterday" },
];

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
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  const handleUploadAndStartAnalysis = useCallback(async () => {
    if (!file) return;

    setSubmitError(null);
    setIsUploading(true);
    setUploadProgress(0);

    const steps = [10, 25, 50, 75, 90, 100];
    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 300));
      setUploadProgress(steps[i]);
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name);

    try {
      const res = await fetch("/api/video/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Upload failed");
      }

      const data = await res.json();
      router.push(`/analysis/${data.id}/processing`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Upload failed");
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [file, router]);

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
            <CardContent className="space-y-4">
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
                  </div>
                )}
              </div>

              {validationError && (
                <p className="text-sm text-[var(--danger)]" role="alert">
                  {validationError}
                </p>
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
                    onClick={file ? handleUploadAndStartAnalysis : handleBrowse}
                    disabled={isUploading}
                    className="gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)]"
                  >
                    {isUploading ? "Uploading…" : file ? "Upload & Analyze" : "Choose File"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

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

          <PreUploadChecklist />
        </div>

        <div className="space-y-6">
          <BestCameraAngleCard />
          <RecentUploadsList uploads={MOCK_RECENT_UPLOADS} />
        </div>
      </div>
    </div>
  );
}
