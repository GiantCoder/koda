"use client";

import React, { useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { useAnalysisStatus } from "@/app/lib/useAnalysisStatus";
import { ProcessingTimeline } from "@/app/components/analysis/ProcessingStageCard";

export default function AnalysisProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = typeof params.videoId === "string" ? params.videoId : null;

  const { status, error, retry } = useAnalysisStatus({
    videoId,
    enabled: !!videoId,
    pollIntervalMs: 3000,
    onComplete: (s) => {
      router.push(`/analysis/${s.id}`);
    },
  });

  const handleCancel = useCallback(() => {
    router.push("/upload");
  }, [router]);

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

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Analysis in Progress
        </h1>
        <p className="mt-1 text-[var(--text-secondary)]">
          Your video is being processed. This usually takes a few minutes.
        </p>
      </div>

      <Card>
        <CardHeader>Pipeline Status</CardHeader>
        <CardContent>
          <ProcessingTimeline
            currentStage={displayStatus.stage}
            error={displayStatus.error}
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
                Cancel
              </Button>
              <p className="text-sm text-[var(--text-secondary)]">
                You can leave this page; we&apos;ll notify you when it&apos;s done.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
