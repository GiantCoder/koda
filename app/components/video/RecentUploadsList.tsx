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

export interface RecentUpload {
  id: string;
  filename: string;
  status: UploadProcessingState;
  timestamp: string;
  processingLabel?: string;
  analysisStatus?: string | null;
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
