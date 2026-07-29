"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

export interface GalleryAnnotation {
  id: string;
  timestampMs: number;
  content: string;
}

export interface FrameGalleryFrame {
  index: number;
  timestampMs: number;
  url: string;
}

interface FrameGalleryProps {
  analysisId: string;
  annotations: GalleryAnnotation[];
  onFrameSelect: (timestampMs: number) => void;
}

const ANNOTATION_TOLERANCE_MS = 500;

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function annotationCountNear(
  annotations: GalleryAnnotation[],
  timestampMs: number
): number {
  return annotations.filter(
    (a) => Math.abs(a.timestampMs - timestampMs) <= ANNOTATION_TOLERANCE_MS
  ).length;
}

export default function FrameGallery({
  analysisId,
  annotations,
  onFrameSelect,
}: FrameGalleryProps) {
  const [frames, setFrames] = useState<FrameGalleryFrame[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setFrames([]);
    setSelectedIndex(null);

    const load = async () => {
      try {
        const res = await fetch(`/api/analysis/${analysisId}/frames`);
        if (res.status === 404) {
          if (!cancelled) setStatus("unavailable");
          return;
        }
        if (!res.ok) {
          if (!cancelled) setStatus("unavailable");
          return;
        }
        const data = (await res.json()) as { frames: FrameGalleryFrame[] };
        if (!cancelled) {
          setFrames(data.frames ?? []);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("unavailable");
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  const selectFrame = useCallback(
    (frame: FrameGalleryFrame) => {
      setSelectedIndex(frame.index);
      onFrameSelect(frame.timestampMs);
    },
    [onFrameSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (frames.length === 0) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();

      const currentPos =
        selectedIndex == null
          ? -1
          : frames.findIndex((f) => f.index === selectedIndex);
      let nextPos: number;
      if (e.key === "ArrowRight") {
        nextPos = currentPos < 0 ? 0 : Math.min(currentPos + 1, frames.length - 1);
      } else {
        nextPos = currentPos < 0 ? frames.length - 1 : Math.max(currentPos - 1, 0);
      }
      selectFrame(frames[nextPos]);
    },
    [frames, selectedIndex, selectFrame]
  );

  if (status === "unavailable") {
    return (
      <section
        className="rounded-xl border border-[var(--surface-secondary)] bg-[var(--surface)] p-4"
        aria-label="Frame gallery"
      >
        <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
          Frame gallery
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Frame gallery isn&apos;t available for this analysis
        </p>
      </section>
    );
  }

  if (status === "loading") {
    return (
      <section
        className="rounded-xl border border-[var(--surface-secondary)] bg-[var(--surface)] p-4"
        aria-label="Frame gallery"
        aria-busy="true"
      >
        <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          Frame gallery
        </h3>
        <div className="flex gap-2 overflow-hidden" data-testid="frame-gallery-skeleton">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-20 w-28 shrink-0 animate-pulse rounded-md bg-[var(--surface-secondary)]"
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      className="rounded-xl border border-[var(--surface-secondary)] bg-[var(--surface)] p-4"
      aria-label="Frame gallery"
    >
      <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
        Frame gallery
      </h3>
      <div
        ref={stripRef}
        className="flex gap-2 overflow-x-auto pb-1 outline-none"
        role="listbox"
        aria-label="Analysis frames"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {frames.map((frame) => {
          const isSelected = selectedIndex === frame.index;
          const badgeCount = annotationCountNear(annotations, frame.timestampMs);
          return (
            <button
              key={frame.index}
              type="button"
              role="option"
              aria-selected={isSelected}
              aria-label={`Frame at ${formatTimestamp(frame.timestampMs)}`}
              className={`relative shrink-0 overflow-hidden rounded-md border-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${
                isSelected
                  ? "border-[var(--primary)]"
                  : "border-transparent hover:border-[var(--text-secondary)]"
              }`}
              onClick={() => selectFrame(frame)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={frame.url}
                alt=""
                className="h-20 w-28 object-cover"
                draggable={false}
              />
              <span className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-center text-[10px] font-medium text-white">
                {formatTimestamp(frame.timestampMs)}
              </span>
              {badgeCount > 0 ? (
                <span
                  className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-semibold text-white"
                  aria-label={`${badgeCount} comment${badgeCount === 1 ? "" : "s"}`}
                >
                  {badgeCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
