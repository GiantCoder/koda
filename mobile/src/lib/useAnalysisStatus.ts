/**
 * Polling-only mobile counterpart to app/lib/useAnalysisStatus.ts. Web
 * supports SSE with a polling fallback; React Native has no native
 * EventSource, and the roadmap already called for polling as the v1
 * approach here, so this only implements that half. GET
 * /api/analysis/[id]/status accepts either an analysis id or a video id
 * (it tries both) -- this is called with the video id, since that's what
 * the processing screen navigates in with and it's also what the video
 * preview/stream URL needs.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/api/client";
import type { AnalysisStage } from "./analysisStages";

export interface AnalysisStatus {
  id: string;
  stage: AnalysisStage;
  progress: number;
  estimatedSecondsRemaining?: number;
  error?: string | null;
  activityType?: string | null;
}

interface UseAnalysisStatusOptions {
  videoId: string | null;
  enabled?: boolean;
  pollIntervalMs?: number;
  onComplete?: (status: AnalysisStatus) => void;
  onError?: (error: Error) => void;
}

export function useAnalysisStatus({
  videoId,
  enabled = true,
  pollIntervalMs = 3000,
  onComplete,
  onError,
}: UseAnalysisStatusOptions) {
  const [status, setStatus] = useState<AnalysisStatus | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  });

  const fetchStatus = useCallback(async (): Promise<AnalysisStatus | null> => {
    if (!videoId) return null;
    try {
      const data = await apiFetch<Partial<AnalysisStatus>>(`/api/analysis/${videoId}/status`);
      const next: AnalysisStatus = {
        id: data.id ?? videoId,
        stage: data.stage ?? "upload_complete",
        progress: data.progress ?? 0,
        estimatedSecondsRemaining: data.estimatedSecondsRemaining,
        error: data.error,
        activityType: data.activityType ?? null,
      };
      setStatus(next);
      setError(null);
      if (next.stage === "complete") onCompleteRef.current?.(next);
      if (next.stage === "failed" && next.error) onErrorRef.current?.(new Error(next.error));
      return next;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      onErrorRef.current?.(e);
      return null;
    }
  }, [videoId]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (!videoId || !enabled) return;
    void fetchStatus();
    pollTimerRef.current = setInterval(() => {
      void fetchStatus().then((s) => {
        if (s?.stage === "complete" || s?.stage === "failed") {
          stopPolling();
        }
      });
    }, pollIntervalMs);
  }, [videoId, enabled, pollIntervalMs, fetchStatus, stopPolling]);

  useEffect(() => {
    if (!videoId || !enabled) {
      setStatus(null);
      setError(null);
      return;
    }
    startPolling();
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, enabled]);

  const retry = useCallback(() => {
    setError(null);
    void fetchStatus();
    stopPolling();
    startPolling();
  }, [fetchStatus, stopPolling, startPolling]);

  return { status, error, retry, refetch: fetchStatus };
}
