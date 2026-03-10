"use client";

import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";

function PlayIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
    </svg>
  );
}

function ExternalLinkIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

export interface RecentUpload {
  id: string;
  filename: string;
  status: "analyzed" | "processing" | "failed";
  timestamp: string;
  processingLabel?: string;
}

interface RecentUploadsListProps {
  uploads: RecentUpload[];
  emptyMessage?: string;
}

export function RecentUploadsList({
  uploads,
  emptyMessage = "No recent uploads",
}: RecentUploadsListProps) {
  return (
    <Card className="bg-[var(--surface)]">
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-[var(--text-primary)]">Recent Uploads</h3>
          {uploads.length > 0 && (
            <Link
              href="/progress"
              className="text-sm font-medium text-[var(--primary)] hover:underline"
            >
              View All
            </Link>
          )}
        </div>
        
        {uploads.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--surface-secondary)] py-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">{emptyMessage}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {uploads.slice(0, 5).map((upload) => (
              <li
                key={upload.id}
                className="group flex items-center justify-between rounded-lg bg-[var(--surface-secondary)]/50 p-3 transition-colors hover:bg-[var(--surface-secondary)]"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]">
                    <PlayIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {upload.filename}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {upload.status === "analyzed" && "Analyzed"}
                      {upload.status === "failed" && "Failed"}
                      {upload.status === "processing" &&
                        (upload.processingLabel ? `Processing (${upload.processingLabel})` : "Processing")}
                      {" • "}
                      {upload.timestamp}
                    </p>
                  </div>
                </div>
                {upload.status === "analyzed" && (
                  <Link
                    href={`/analysis/${upload.id}`}
                    className="shrink-0 rounded-lg p-2 text-[var(--text-secondary)] opacity-0 transition-opacity hover:bg-[var(--surface)] hover:text-[var(--primary)] group-hover:opacity-100"
                    aria-label={`View analysis for ${upload.filename}`}
                  >
                    <ExternalLinkIcon />
                  </Link>
                )}
                {upload.status === "processing" && (
                  <div className="flex items-center gap-1">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--surface-secondary)] border-t-[var(--primary)]" aria-label="Processing upload" />
                    <Link
                      href={`/analysis/${upload.id}/processing`}
                      className="shrink-0 rounded-lg p-2 text-[var(--text-secondary)] opacity-0 transition-opacity hover:bg-[var(--surface)] hover:text-[var(--primary)] group-hover:opacity-100"
                      aria-label={`View processing for ${upload.filename}`}
                    >
                      <ExternalLinkIcon />
                    </Link>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
