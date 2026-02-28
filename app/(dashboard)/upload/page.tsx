"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { VideoDropZone } from "@/app/components/video/VideoDropZone";
import { PreUploadChecklist } from "@/app/components/video/PreUploadChecklist";
import { BestCameraAngleCard } from "@/app/components/video/BestCameraAngleCard";
import { RecentUploadsList, type RecentUpload } from "@/app/components/video/RecentUploadsList";

const MOCK_RECENT_UPLOADS: RecentUpload[] = [
  { id: "vid_demo_1", filename: "cover_drive_practice.mp4", status: "analyzed", timestamp: "2 hours ago" },
  { id: "vid_demo_2", filename: "straight_drive_session.mp4", status: "analyzed", timestamp: "Yesterday" },
];

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [validationError, setValidationError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canStartAnalysis =
    file !== null &&
    title.trim().length > 0 &&
    !isUploading &&
    !validationError;

  const handleUploadAndStartAnalysis = useCallback(async () => {
    if (!file || !title.trim()) return;

    setSubmitError(null);
    setIsUploading(true);
    setUploadProgress(0);

    // Simulate chunked upload progress
    const steps = [10, 25, 50, 75, 90, 100];
    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 300));
      setUploadProgress(steps[i]);
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title.trim());
    if (description.trim()) formData.append("description", description.trim());

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
  }, [file, title, description, router]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Upload Video for Analysis
        </h1>
        <p className="mt-1 text-[var(--text-secondary)]">
          Upload your cricket batting video to get detailed technique analysis and
          personalized feedback.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>Video</CardHeader>
            <CardContent className="space-y-4">
              <VideoDropZone
                file={file}
                onFileSelect={setFile}
                onValidationError={setValidationError}
                uploadProgress={uploadProgress}
                isUploading={isUploading}
                disabled={false}
              />
              {validationError && (
                <p className="text-sm text-[var(--danger)]" role="alert">
                  {validationError}
                </p>
              )}
            </CardContent>
          </Card>

          {file && (
            <Card>
              <CardHeader>Details</CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Title *"
                  placeholder="e.g. Cover drive practice"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isUploading}
                  error={!title.trim() && file ? "Title is required" : undefined}
                />
                <Input
                  label="Description (optional)"
                  placeholder="Add notes about this session"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isUploading}
                />
              </CardContent>
            </Card>
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

          {file && (
            <div className="flex justify-end">
              <Button
                onClick={handleUploadAndStartAnalysis}
                disabled={!canStartAnalysis}
                className="gap-2"
              >
                {isUploading ? "Uploading…" : "Upload & Start Analysis"}
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <PreUploadChecklist />
          <BestCameraAngleCard />
          <RecentUploadsList uploads={MOCK_RECENT_UPLOADS} />
        </div>
      </div>
    </div>
  );
}
