"use client";

import React, { FormEvent, useEffect, useState } from "react";

export interface Annotation {
  id: string;
  timestampMs: number;
  content: string;
  isPrivate?: boolean;
}

export interface AnnotationPanelProps {
  annotations: Annotation[];
  role: "coach" | "player" | "parent";
  selectedTimestampMs: number | null;
  onSubmit: (input: {
    timestampMs: number;
    content: string;
    isPrivate: boolean;
  }) => Promise<void>;
  /** Fallback timestamp (ms) when no gallery frame is selected — typically video currentTime. */
  getCurrentPlaybackMs?: () => number;
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function sortByTimestamp(annotations: Annotation[]): Annotation[] {
  return [...annotations].sort((a, b) => a.timestampMs - b.timestampMs);
}

export default function AnnotationPanel({
  annotations,
  role,
  selectedTimestampMs,
  onSubmit,
  getCurrentPlaybackMs,
}: AnnotationPanelProps) {
  const [content, setContent] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [manualTimestamp, setManualTimestamp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pinnedTimestamp = selectedTimestampMs;

  useEffect(() => {
    if (pinnedTimestamp != null) {
      setManualTimestamp("");
    }
  }, [pinnedTimestamp]);

  const sorted = sortByTimestamp(annotations);
  const isCoach = role === "coach";

  const resolveTimestampMs = (): number | null => {
    if (pinnedTimestamp != null) return pinnedTimestamp;
    if (manualTimestamp.trim() !== "") {
      const parsed = Number(manualTimestamp);
      if (!Number.isFinite(parsed) || parsed < 0) return null;
      return Math.round(parsed);
    }
    return Math.max(0, Math.round(getCurrentPlaybackMs?.() ?? 0));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = content.trim();
    if (!trimmed) {
      setError("Comment cannot be empty");
      return;
    }
    const timestampMs = resolveTimestampMs();
    if (timestampMs == null) {
      setError("Enter a valid timestamp in milliseconds");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ timestampMs, content: trimmed, isPrivate });
      setContent("");
      setIsPrivate(false);
      setManualTimestamp("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <aside className="rounded-xl border border-[var(--surface-secondary)] bg-[var(--surface)] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
        Annotations
      </h3>

      {sorted.length === 0 ? (
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          No annotations yet.
        </p>
      ) : (
        <ul className="mb-4 space-y-2 text-sm">
          {sorted.map((annotation) => (
            <li
              key={annotation.id}
              className="rounded-md bg-[var(--surface-secondary)] p-2"
            >
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span>{formatTimestamp(annotation.timestampMs)}</span>
                {annotation.isPrivate ? (
                  <span className="rounded bg-[var(--warning)]/20 px-1.5 py-0.5 text-[var(--warning)]">
                    Private
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-[var(--text-primary)]">{annotation.content}</p>
            </li>
          ))}
        </ul>
      )}

      {isCoach ? (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3 border-t border-[var(--surface-secondary)] pt-3">
          {pinnedTimestamp != null ? (
            <p className="text-xs font-medium text-[var(--text-secondary)]">
              Commenting on {formatTimestamp(pinnedTimestamp)}
            </p>
          ) : (
            <label className="block text-xs text-[var(--text-secondary)]">
              Timestamp (ms) — leave blank to use current playback position
              <input
                type="number"
                min={0}
                step={1}
                value={manualTimestamp}
                onChange={(e) => setManualTimestamp(e.target.value)}
                placeholder={String(Math.round(getCurrentPlaybackMs?.() ?? 0))}
                className="mt-1 w-full rounded-md border border-[var(--surface-secondary)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </label>
          )}

          <label className="block text-xs text-[var(--text-secondary)]">
            Comment
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              placeholder="Add a coach note…"
              className="mt-1 w-full rounded-md border border-[var(--surface-secondary)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
              data-testid="annotation-content"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              data-testid="annotation-private"
            />
            Private (only visible to you)
          </label>

          {error ? (
            <p className="text-xs text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            data-testid="annotation-submit"
          >
            {submitting ? "Saving…" : "Add comment"}
          </button>
        </form>
      ) : null}
    </aside>
  );
}
