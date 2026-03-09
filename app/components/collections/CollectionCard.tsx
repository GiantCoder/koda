"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface CollectionCardProps {
  id: string;
  name: string;
  description?: string | null;
  clipCount: number;
  thumbnails: Array<{
    videoId: string;
    filename: string;
    cdnUrl?: string | null;
  }>;
  updatedAt: string;
}

export function CollectionCard({
  id,
  name,
  description,
  clipCount,
  thumbnails,
  updatedAt,
}: CollectionCardProps) {
  return (
    <Link href={`/saved/collections/${id}`}>
      <div className="group rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface-primary)] p-4 transition-all hover:border-[var(--primary)] hover:shadow-lg">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary)]">
              {name}
            </h3>
            {description && (
              <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Thumbnail previews */}
        <div className="mb-3 flex gap-2">
          {thumbnails.length > 0 ? (
            thumbnails.slice(0, 3).map((thumb, idx) => (
              <div
                key={thumb.videoId}
                className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-[var(--surface-secondary)]"
              >
                {thumb.cdnUrl ? (
                  <video
                    src={thumb.cdnUrl}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <svg
                      className="h-6 w-6 text-[var(--text-tertiary)]"
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
              </div>
            ))
          ) : (
            <div className="flex h-16 w-full items-center justify-center rounded-md border-2 border-dashed border-[var(--surface-secondary)]">
              <p className="text-xs text-[var(--text-tertiary)]">No clips yet</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1 text-[var(--text-secondary)]">
            <svg
              className="h-4 w-4"
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
            {clipCount} {clipCount === 1 ? "clip" : "clips"}
          </span>
          <span className="text-[var(--text-tertiary)]">
            Updated {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
          </span>
        </div>
      </div>
    </Link>
  );
}
