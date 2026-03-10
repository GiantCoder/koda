"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface SavedClipCardProps {
  id: string;
  videoId: string;
  filename: string;
  cdnUrl?: string | null;
  durationSeconds?: number | null;
  savedAt: string;
  notes?: string | null;
  analysis?: {
    shotType?: string | null;
    gradeLetter?: string | null;
    gradeOverall?: number | null;
  } | null;
  onRemove?: () => void;
}

export function SavedClipCard({
  id,
  videoId,
  filename,
  cdnUrl,
  durationSeconds,
  savedAt,
  notes,
  analysis,
  onRemove,
}: SavedClipCardProps) {
  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatShotType = (shotType?: string | null) => {
    if (!shotType) return null;
    return shotType
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <div className="group rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface-primary)] transition-all hover:border-[var(--primary)]">
      <Link href={`/analysis/${videoId}`}>
        <div className="aspect-video w-full overflow-hidden rounded-t-lg bg-[var(--surface-secondary)]">
          {cdnUrl ? (
            <video
              src={cdnUrl}
              className="h-full w-full object-cover"
              muted
              playsInline
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <svg
                className="h-12 w-12 text-[var(--text-tertiary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
          {durationSeconds && (
            <div className="absolute bottom-2 right-2 rounded bg-black/75 px-2 py-1 text-xs text-white">
              {formatDuration(durationSeconds)}
            </div>
          )}
        </div>
      </Link>

      <div className="p-4">
        <div className="mb-2 flex items-start justify-between">
          <Link href={`/analysis/${videoId}`}>
            <h4 className="line-clamp-1 font-medium text-[var(--text-primary)] group-hover:text-[var(--primary)]">
              {filename}
            </h4>
          </Link>
          {onRemove && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onRemove();
              }}
              className="ml-2 flex-shrink-0 rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-secondary)] hover:text-[var(--error)]"
              title="Remove from collection"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>

        {notes && (
          <p className="mb-2 line-clamp-2 text-sm text-[var(--text-secondary)]">{notes}</p>
        )}

        <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
          <div className="flex items-center gap-2">
            {analysis?.shotType && (
              <span className="rounded-full bg-[var(--surface-secondary)] px-2 py-1">
                {formatShotType(analysis.shotType)}
              </span>
            )}
            {analysis?.gradeLetter && (
              <span className="rounded-full bg-[var(--primary)]/10 px-2 py-1 text-[var(--primary)]">
                Grade {analysis.gradeLetter}
              </span>
            )}
          </div>
          <span>Saved {formatDistanceToNow(new Date(savedAt), { addSuffix: true })}</span>
        </div>
      </div>
    </div>
  );
}
