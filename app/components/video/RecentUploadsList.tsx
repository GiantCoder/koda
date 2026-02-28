"use client";

import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";

function PlayIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
        clipRule="evenodd"
      />
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
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <CardHeader className="mb-0">Recent Uploads</CardHeader>
        {uploads.length > 0 && (
          <Link
            href="/upload"
            className="text-sm font-medium text-[var(--primary)] hover:underline"
          >
            View All
          </Link>
        )}
      </div>
      <CardContent>
        {uploads.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--surface-secondary)] py-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">{emptyMessage}</p>
            <Link href="/upload" className="mt-2 inline-block">
              <Button variant="ghost" className="text-[var(--primary)]">
                Upload your first video
              </Button>
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {uploads.slice(0, 5).map((upload) => (
              <li
                key={upload.id}
                className="flex items-center justify-between rounded-lg border border-[var(--surface-secondary)] p-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-[var(--cricket-green)]">
                    <PlayIcon />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {upload.filename}
                    </p>
                    <p
                      className={`text-xs ${
                        upload.status === "analyzed"
                          ? "text-[var(--success)]"
                          : upload.status === "failed"
                            ? "text-[var(--danger)]"
                            : "text-[var(--text-secondary)]"
                      }`}
                    >
                      {upload.status === "analyzed"
                        ? "Analyzed"
                        : upload.status === "failed"
                          ? "Failed"
                          : "Processing"}
                      {" • "}
                      {upload.timestamp}
                    </p>
                  </div>
                </div>
                {upload.status === "analyzed" && (
                  <Link
                    href={`/analysis/${upload.id}`}
                    className="shrink-0 rounded p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--primary)]"
                    aria-label={`View analysis for ${upload.filename}`}
                  >
                    <ExternalLinkIcon />
                  </Link>
                )}
                {upload.status === "processing" && (
                  <Link
                    href={`/analysis/${upload.id}/processing`}
                    className="shrink-0 rounded p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--primary)]"
                    aria-label={`View processing for ${upload.filename}`}
                  >
                    <ExternalLinkIcon />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
