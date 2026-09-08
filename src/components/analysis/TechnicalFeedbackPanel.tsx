"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  formatDimensionLabel,
  type TechniqueFeedbackItem,
} from "@/src/types/technical-feedback";

export interface FrameStill {
  index: number;
  timestampMs: number;
  url: string;
}

interface TechnicalFeedbackPanelProps {
  items: TechniqueFeedbackItem[];
  analysisId?: string | null;
  onSeek?: (timestampSeconds: number) => void;
}

function formatClock(seconds: number): string {
  const total = Math.max(0, seconds);
  const mins = Math.floor(total / 60);
  const secs = Math.floor(total % 60);
  const tenths = Math.floor((total % 1) * 10);
  return `${mins}:${String(secs).padStart(2, "0")}.${tenths}`;
}

function scoreColor(score: number): string {
  if (score >= 85) return "var(--success)";
  if (score >= 65) return "var(--warning)";
  return "var(--text-secondary)";
}

function confidenceBadgeClass(confidence: TechniqueFeedbackItem["confidence"]): string {
  if (confidence === "high") return "bg-[var(--success)]/15 text-[var(--success)]";
  if (confidence === "medium") return "bg-[var(--warning)]/15 text-[var(--warning)]";
  return "bg-[var(--surface-secondary)] text-[var(--text-secondary)]";
}

function nearestFrame(
  frames: FrameStill[],
  timestampSeconds: number,
  toleranceSeconds = 0.75
): FrameStill | null {
  if (frames.length === 0) return null;
  const targetMs = timestampSeconds * 1000;
  let best: FrameStill | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const frame of frames) {
    const delta = Math.abs(frame.timestampMs - targetMs);
    if (delta < bestDelta) {
      best = frame;
      bestDelta = delta;
    }
  }
  if (!best || bestDelta > toleranceSeconds * 1000) return null;
  return best;
}

export default function TechnicalFeedbackPanel({
  items,
  analysisId,
  onSeek,
}: TechnicalFeedbackPanelProps) {
  const [frames, setFrames] = useState<FrameStill[]>([]);

  useEffect(() => {
    if (!analysisId) {
      setFrames([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/analysis/${analysisId}/frames`);
        if (!res.ok) {
          if (!cancelled) setFrames([]);
          return;
        }
        const data = (await res.json()) as { frames?: FrameStill[] };
        if (!cancelled) setFrames(data.frames ?? []);
      } catch {
        if (!cancelled) setFrames([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  const rows = useMemo(() => items.filter(Boolean), [items]);

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-[var(--surface-secondary)] bg-[var(--surface)] p-4">
      <header className="mb-4">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Technical feedback
        </h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Grounded notes per technique dimension. Tap a timestamp to jump the video.
        </p>
      </header>

      <ul className="space-y-4">
        {rows.map((item) => {
          const still =
            item.timestampSeconds != null
              ? nearestFrame(frames, item.timestampSeconds)
              : null;

          return (
            <li
              key={item.dimension}
              className="rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface-secondary)]/40 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {formatDimensionLabel(item.dimension)}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    Evidence: {item.evidence}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${confidenceBadgeClass(item.confidence)}`}
                  >
                    {item.confidence}
                  </span>
                  <span
                    className="text-sm font-bold tabular-nums"
                    style={{ color: scoreColor(item.score) }}
                  >
                    {item.score}
                  </span>
                </div>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(0, Math.min(100, item.score))}%`,
                    backgroundColor: scoreColor(item.score),
                  }}
                />
              </div>

              <div className="mt-3 flex gap-3">
                {still ? (
                  <img
                    src={still.url}
                    alt={`Frame near ${formatClock(item.timestampSeconds ?? 0)}`}
                    className="h-16 w-24 shrink-0 rounded object-cover"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--text-primary)]">{item.diagnosis}</p>
                  {item.timestampSeconds != null ? (
                    <button
                      type="button"
                      onClick={() => onSeek?.(item.timestampSeconds!)}
                      className="mt-2 inline-flex items-center rounded-md bg-[var(--primary)]/10 px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/20"
                      aria-label={`Seek video to ${formatClock(item.timestampSeconds)}`}
                    >
                      {formatClock(item.timestampSeconds)}
                    </button>
                  ) : (
                    <span className="mt-2 inline-flex items-center rounded-md bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text-secondary)]">
                      No grounded timestamp
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 border-t border-[var(--surface-secondary)] pt-2">
                <p className="text-sm text-[var(--text-secondary)]">
                  <span className="font-medium text-[var(--text-primary)]">Drill: </span>
                  {item.drill}
                </p>
                <p className="mt-1 text-[11px] italic text-[var(--text-secondary)]">
                  General drill suggestion — not yet verified against a coach-reviewed library.
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
