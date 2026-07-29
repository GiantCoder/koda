"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/app/components/ui/Card";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { ToastContainer } from "@/app/components/ui/Toast";
import { useToast } from "@/app/hooks/useToast";
import { buildMockAuthHeaders } from "@/app/lib/mock-auth-headers";
import type { MockUser } from "@/app/lib/mock-auth";
import { uploadHref, type UploadProcessingState } from "@/app/lib/uploads-display";

function PlayIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
    </svg>
  );
}

function ExternalLinkIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

function TrashIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

/** Cricket bat */
function BatIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M5.5 20.5l3-3M8 18l9.2-9.2a2.2 2.2 0 013.1 3.1L11.1 21.2a2.8 2.8 0 01-2.4.8L5.5 21l.8-3.2A2.8 2.8 0 018 18z"
      />
      <path strokeLinecap="round" strokeWidth={1.75} d="M16.5 7.5l1.8-1.8" />
    </svg>
  );
}

/** Cricket ball */
function BallIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <circle cx="12" cy="12" r="8" strokeWidth={1.75} />
      <path
        strokeLinecap="round"
        strokeWidth={1.75}
        d="M9 5.5c1.2 2.2 1.2 4.8 0 7M15 11.5c-1.2 2.2-1.2 4.8 0 7"
      />
    </svg>
  );
}

/** Catching / fielding hand */
function FieldingIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M8 13V8.5a1.5 1.5 0 013 0V12m0 0V7.5a1.5 1.5 0 013 0V12m0 0V8.5a1.5 1.5 0 013 0V14c0 3-1.8 5.5-5 5.5S9 17 9 14v-1"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M8 13c-1.2-.4-2-.8-2.5-1.5-.8-1.1-.2-2.5 1-2.8.6-.2 1.3 0 1.8.5"
      />
      <circle cx="17.5" cy="6.5" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Wicket-keeping gloves */
function GlovesIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M8 11V7.5a1.5 1.5 0 013 0V11m0 0V6.5a1.5 1.5 0 013 0V11m0 0V7.8a1.5 1.5 0 013 0V13.5c0 3.2-2 5.5-5.5 5.5S7 16.7 7 13.5V12"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M7 12c-1.5-.3-2.5-1.2-2.5-2.4 0-1.3 1-2.1 2.2-2.1.6 0 1.1.2 1.5.6"
      />
      <path strokeLinecap="round" strokeWidth={1.75} d="M9.5 19h5" />
    </svg>
  );
}

export type VideoActivityCategory = "batting" | "bowling" | "fielding" | "keeping";

export interface RecentUpload {
  id: string;
  filename: string;
  status: UploadProcessingState;
  timestamp: string;
  processingLabel?: string;
  analysisStatus?: string | null;
  /** Present when analysis completed with a grade. */
  gradeLetter?: string | null;
  /** Analysis activity gate result, e.g. BATTING | BOWLING | FIELDING. */
  activityType?: string | null;
}

function categoryFromActivity(activityType?: string | null): VideoActivityCategory {
  if (activityType === "BOWLING") return "bowling";
  if (activityType === "FIELDING") return "fielding";
  if (activityType === "KEEPING") return "keeping";
  return "batting";
}

function CategoryIcon({
  category,
  className = "h-4 w-4",
}: {
  category: VideoActivityCategory;
  className?: string;
}) {
  switch (category) {
    case "bowling":
      return <BallIcon className={className} />;
    case "fielding":
      return <FieldingIcon className={className} />;
    case "keeping":
      return <GlovesIcon className={className} />;
    case "batting":
    default:
      return <BatIcon className={className} />;
  }
}

function categoryLabel(category: VideoActivityCategory): string {
  switch (category) {
    case "bowling":
      return "Bowling";
    case "fielding":
      return "Fielding";
    case "keeping":
      return "Keeping";
    default:
      return "Batting";
  }
}

function gradeBadgeClass(letter: string): string {
  const upper = letter.toUpperCase();
  if (upper.startsWith("A")) {
    return "bg-[var(--success)]/20 text-[var(--success)] ring-[var(--success)]/30";
  }
  if (upper.startsWith("B")) {
    return "bg-amber-500/20 text-amber-300 ring-amber-500/30";
  }
  if (upper.startsWith("C")) {
    return "bg-[var(--warning)]/20 text-[var(--warning)] ring-[var(--warning)]/30";
  }
  return "bg-[var(--surface)] text-[var(--text-secondary)] ring-[var(--surface-secondary)]";
}

interface RecentUploadsListProps {
  uploads: RecentUpload[];
  emptyMessage?: string;
  user?: MockUser | null;
  onUploadsChanged?: () => void;
}

export function RecentUploadsList({
  uploads,
  emptyMessage = "No recent uploads",
  user = null,
  onUploadsChanged,
}: RecentUploadsListProps) {
  const router = useRouter();
  const { toasts, showToast, closeToast } = useToast();
  const [pendingDelete, setPendingDelete] = useState<RecentUpload | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/videos/${pendingDelete.id}`, {
        method: "DELETE",
        headers: buildMockAuthHeaders(user),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to delete upload");
      }
      showToast(`"${pendingDelete.filename}" deleted`, "success");
      setPendingDelete(null);
      onUploadsChanged?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Delete failed", "error");
    } finally {
      setIsDeleting(false);
    }
  }, [pendingDelete, user, showToast, onUploadsChanged]);

  return (
    <>
      <ToastContainer toasts={toasts} onClose={closeToast} />
      <Card className="bg-[var(--surface)]">
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-[var(--text-primary)]">Recent Uploads</h3>
            {uploads.length > 0 && (
              <Link
                href="/uploads"
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
                  className="group flex items-center gap-2 rounded-lg bg-[var(--surface-secondary)]/50 p-3 transition-colors hover:bg-[var(--surface-secondary)]"
                >
                  <button
                    type="button"
                    onClick={() => router.push(uploadHref(upload.id, upload.status))}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]">
                      <PlayIcon className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {upload.filename}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {upload.status === "analyzed" && "Analyzed"}
                        {upload.status === "unsupported" && "Not batting"}
                        {upload.status === "failed" && "Failed"}
                        {upload.status === "processing" &&
                          (upload.processingLabel
                            ? `Processing (${upload.processingLabel})`
                            : "Processing")}
                        {" • "}
                        {upload.timestamp}
                      </p>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    {upload.status === "analyzed" && upload.gradeLetter && (
                      <>
                        <span
                          className="mr-0.5 inline-flex text-[var(--text-secondary)]"
                          title={categoryLabel(categoryFromActivity(upload.activityType))}
                          aria-label={categoryLabel(categoryFromActivity(upload.activityType))}
                        >
                          <CategoryIcon
                            category={categoryFromActivity(upload.activityType)}
                            className="h-4 w-4"
                          />
                        </span>
                        <span
                          className={`mr-1 inline-flex min-w-[1.75rem] items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-bold ring-1 ring-inset ${gradeBadgeClass(upload.gradeLetter)}`}
                          aria-label={`Grade ${upload.gradeLetter}`}
                        >
                          {upload.gradeLetter}
                        </span>
                      </>
                    )}
                    {upload.status === "processing" && (
                      <span
                        className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--surface-secondary)] border-t-[var(--primary)]"
                        aria-hidden
                      />
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(uploadHref(upload.id, upload.status));
                      }}
                      className="rounded-lg p-2 text-[var(--text-secondary)] opacity-60 transition-opacity hover:bg-[var(--surface)] hover:text-[var(--primary)] group-hover:opacity-100"
                      aria-label={`Open ${upload.filename}`}
                    >
                      <ExternalLinkIcon />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingDelete(upload);
                      }}
                      className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                      aria-label={`Delete ${upload.filename}`}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete upload?"
        message={
          pendingDelete
            ? `Remove "${pendingDelete.filename}" and its analysis? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (!isDeleting) setPendingDelete(null);
        }}
      />
    </>
  );
}
