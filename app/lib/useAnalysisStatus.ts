"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AnalysisStage =
  | "upload_complete"
  | "extracting_frames"
  | "activity_classification"
  | "pose_analysis"
  | "shot_classification"
  | "generating_feedback"
  | "complete"
  | "failed";

export interface AnalysisStatus {
  id: string;
  stage: AnalysisStage;
  progress: number;
  estimatedSecondsRemaining?: number;
  error?: string;
}

const STAGE_ORDER: AnalysisStage[] = [
  "upload_complete",
  "extracting_frames",
  "activity_classification",
  "pose_analysis",
  "shot_classification",
  "generating_feedback",
  "complete",
];

export function getStageIndex(stage: AnalysisStage): number {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx >= 0 ? idx : 0;
}

export function getStageLabel(stage: AnalysisStage): string {
  const labels: Record<AnalysisStage, string> = {
    upload_complete: "Upload Complete",
    extracting_frames: "Extracting Frames",
    activity_classification: "Checking Video Content",
    pose_analysis: "Pose Analysis (MediaPipe)",
    shot_classification: "Shot Classification",
    generating_feedback: "Generating Coaching Feedback",
    complete: "Complete",
    failed: "Failed",
  };
  return labels[stage];
}

type Transport = "sse" | "polling";

interface UseAnalysisStatusOptions {
  videoId: string | null;
  enabled?: boolean;
  pollIntervalMs?: number;
  sseEndpoint?: string;
  onComplete?: (status: AnalysisStatus) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for subscribing to analysis pipeline status.
 * Supports SSE (primary) with polling fallback.
 * Ready for backend integration: set sseEndpoint to `/api/analysis/[id]/stream`.
 */
export function useAnalysisStatus({
  videoId,
  enabled = true,
  pollIntervalMs = 3000,
  sseEndpoint,
  onComplete,
  onError,
}: UseAnalysisStatusOptions) {
  const [status, setStatus] = useState<AnalysisStatus | null>(null);
  const [transport, setTransport] = useState<Transport | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  // Keep callback refs up to date
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  });

  const fetchStatus = useCallback(async () => {
    if (!videoId) return null;
    try {
      const res = await fetch(`/api/analysis/${videoId}/status`);
      if (!res.ok) throw new Error(`Status fetch failed: ${res.status}`);
      const data = await res.json();
      const next: AnalysisStatus = {
        id: data.id ?? videoId,
        stage: data.stage ?? "upload_complete",
        progress: data.progress ?? 0,
        estimatedSecondsRemaining: data.estimatedSecondsRemaining,
        error: data.error,
      };
      setStatus(next);
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

  const startPolling = useCallback(() => {
    if (!videoId || !enabled) return;
    setTransport("polling");
    void fetchStatus();
    pollTimerRef.current = setInterval(() => {
      void fetchStatus().then((s) => {
        if (s?.stage === "complete" || s?.stage === "failed") {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        }
      });
    }, pollIntervalMs);
  }, [videoId, enabled, pollIntervalMs, fetchStatus]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const connectSSE = useCallback(() => {
    if (!videoId || !enabled || !sseEndpoint) return;
    const url = sseEndpoint.replace("[id]", videoId);
    const es = new EventSource(url);
    eventSourceRef.current = es;
    setTransport("sse");

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as Partial<AnalysisStatus>;
        const next: AnalysisStatus = {
          id: data.id ?? videoId,
          stage: data.stage ?? "upload_complete",
          progress: data.progress ?? 0,
          estimatedSecondsRemaining: data.estimatedSecondsRemaining,
          error: data.error,
        };
        setStatus(next);
        if (next.stage === "complete") {
          onCompleteRef.current?.(next);
          es.close();
          eventSourceRef.current = null;
        }
        if (next.stage === "failed" && next.error) {
          onErrorRef.current?.(new Error(next.error));
          es.close();
          eventSourceRef.current = null;
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setTransport(null);
      // Fallback to polling
      startPolling();
    };
  }, [videoId, enabled, sseEndpoint, startPolling]);

  useEffect(() => {
    if (!videoId || !enabled) {
      setStatus(null);
      setError(null);
      return;
    }

    if (sseEndpoint) {
      connectSSE();
    } else {
      startPolling();
    }

    return () => {
      stopPolling();
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [videoId, enabled, sseEndpoint, connectSSE, startPolling, stopPolling]);

  const retry = useCallback(() => {
    setError(null);
    void fetchStatus();
    if (transport === "polling" || !sseEndpoint) {
      stopPolling();
      startPolling();
    }
  }, [fetchStatus, transport, sseEndpoint, stopPolling, startPolling]);

  return {
    status,
    error,
    transport,
    retry,
    refetch: fetchStatus,
  };
}
