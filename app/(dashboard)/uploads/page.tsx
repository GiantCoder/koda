"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Select } from "@/app/components/ui/Select";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { ToastContainer } from "@/app/components/ui/Toast";
import { LoadingSpinner } from "@/app/components/common/LoadingSpinner";
import { useMockAuth } from "@/app/hooks/useMockAuth";
import { useToast } from "@/app/hooks/useToast";
import { buildMockAuthHeaders } from "@/app/lib/mock-auth-headers";
import {
  STAGE_LABELS,
  formatDuration,
  formatFileSize,
  formatResolution,
  toRelativeTimestamp,
  uploadHref,
  type UploadProcessingState,
} from "@/app/lib/uploads-display";

interface VideoListItem {
  id: string;
  filename: string;
  fileSizeBytes: string;
  durationSeconds: number | null;
  resolutionWidth: number | null;
  resolutionHeight: number | null;
  uploadedAt: string;
  thumbnailUrl: string;
  assignedUserDisplayName: string;
  processingState: UploadProcessingState;
  analysis: {
    id: string;
    status: string;
    shotType: string | null;
    gradeLetter: string | null;
    gradeOverall: number | null;
  } | null;
}

type SortKey = "uploadedAt" | "filename" | "fileSizeBytes" | "durationSeconds";

const PAGE_SIZE = 10;

function formatShotType(s: string | null | undefined): string {
  if (!s) return "—";
  return s
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function SortIndicator({
  active,
  direction,
}: {
  active: boolean;
  direction: "asc" | "desc";
}) {
  if (!active) {
    return <span className="ml-1 text-[var(--text-secondary)] opacity-40">↕</span>;
  }
  return (
    <span className="ml-1 text-[var(--primary)]" aria-hidden>
      {direction === "asc" ? "↑" : "↓"}
    </span>
  );
}

function StatusBadge({ state }: { state: UploadProcessingState }) {
  const styles = {
    analyzed: "bg-[var(--success)]/15 text-[var(--success)]",
    processing: "bg-[var(--primary)]/15 text-[var(--primary)]",
    failed: "bg-[var(--danger)]/15 text-[var(--danger)]",
    unsupported: "bg-[var(--warning)]/15 text-[var(--warning)]",
  }[state];
  const label =
    state === "analyzed"
      ? "Analyzed"
      : state === "failed"
        ? "Failed"
        : state === "unsupported"
          ? "Not batting"
          : "Processing";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}>
      {label}
    </span>
  );
}

export default function UploadsPage() {
  const router = useRouter();
  const { user } = useMockAuth();
  const { toasts, showToast, closeToast } = useToast();

  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [sort, setSort] = useState<SortKey>("uploadedAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchVideos = useCallback(async () => {
    if (!user) {
      setVideos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        sort,
        order,
        status: statusFilter,
      });
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/videos?${params}`, {
        headers: buildMockAuthHeaders(user),
      });
      if (!res.ok) throw new Error(`Failed to load uploads (${res.status})`);
      const data = (await res.json()) as {
        videos?: VideoListItem[];
        pagination?: { page: number; totalPages: number; total: number };
      };
      setVideos(data.videos ?? []);
      setTotalPages(data.pagination?.totalPages ?? 1);
      setTotal(data.pagination?.total ?? 0);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load uploads");
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [user, page, sort, order, statusFilter, search]);

  useEffect(() => {
    void fetchVideos();
  }, [fetchVideos]);

  useEffect(() => {
    if (!videos.some((v) => v.processingState === "processing")) return;
    const intervalId = window.setInterval(() => {
      void fetchVideos();
    }, 4000);
    return () => window.clearInterval(intervalId);
  }, [videos, fetchVideos]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const allOnPageSelected = useMemo(
    () => videos.length > 0 && videos.every((v) => selectedIds.has(v.id)),
    [videos, selectedIds]
  );

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(videos.map((v) => v.id)));
    }
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSort = (key: SortKey) => {
    if (sort === key) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setOrder(key === "filename" ? "asc" : "desc");
    }
    setPage(1);
  };

  const confirmBulkDelete = useCallback(async () => {
    if (!pendingDeleteIds?.length) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/videos/bulk-delete", {
        method: "POST",
        headers: {
          ...buildMockAuthHeaders(user),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ videoIds: pendingDeleteIds }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Bulk delete failed");
      }
      const data = (await res.json()) as { deletedCount?: number };
      showToast(
        `${data.deletedCount ?? pendingDeleteIds.length} upload(s) deleted`,
        "success"
      );
      setPendingDeleteIds(null);
      void fetchVideos();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Delete failed", "error");
    } finally {
      setIsDeleting(false);
    }
  }, [pendingDeleteIds, user, showToast, fetchVideos]);

  const deleteSingle = (id: string) => setPendingDeleteIds([id]);

  const pendingDeleteLabel =
    pendingDeleteIds?.length === 1
      ? videos.find((v) => v.id === pendingDeleteIds[0])?.filename ?? "this upload"
      : `${pendingDeleteIds?.length ?? 0} uploads`;

  return (
    <div className="mx-auto max-w-7xl">
      <ToastContainer toasts={toasts} onClose={closeToast} />

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Uploads</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            All your batting videos — filter, sort, and manage uploads in one place.
          </p>
        </div>
        <Link href="/upload">
          <Button className="bg-[var(--primary)] hover:bg-[var(--primary-hover)]">
            Upload New Video
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="min-w-[200px] flex-1">
            <Input
              label="Search filename"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="e.g. cover drive"
            />
          </div>
          <div className="w-44">
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All statuses" },
                { value: "analyzed", label: "Analyzed" },
                { value: "processing", label: "Processing" },
                { value: "failed", label: "Failed" },
              ]}
            />
          </div>
          {selectedIds.size > 0 && (
            <Button
              variant="secondary"
              className="text-[var(--danger)] hover:bg-[var(--danger)]/10"
              onClick={() => setPendingDeleteIds(Array.from(selectedIds))}
            >
              Delete selected ({selectedIds.size})
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--surface-secondary)]">
          <span className="text-sm text-[var(--text-secondary)]">
            {total} upload{total === 1 ? "" : "s"}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-sm text-[var(--text-secondary)]">Loading uploads…</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-[var(--danger)]">{error}</p>
              <Button className="mt-4" onClick={() => void fetchVideos()}>
                Retry
              </Button>
            </div>
          ) : videos.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-[var(--text-secondary)]">No uploads match your filters.</p>
              <Link href="/upload" className="mt-4 inline-block">
                <Button>Upload a Video</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--surface-secondary)] bg-[var(--surface-secondary)]/30">
                    <th className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all on this page"
                        className="h-4 w-4 rounded border-[var(--surface-secondary)] accent-[var(--primary)]"
                      />
                    </th>
                    <th className="px-4 py-3 font-medium text-[var(--text-secondary)]">
                      Thumbnail
                    </th>
                    <th className="px-4 py-3">
                      <button
                        type="button"
                        className="inline-flex items-center font-medium text-[var(--text-secondary)] hover:text-[var(--primary)]"
                        onClick={() => handleSort("filename")}
                      >
                        Filename
                        <SortIndicator active={sort === "filename"} direction={order} />
                      </button>
                    </th>
                    <th className="px-4 py-3 font-medium text-[var(--text-secondary)]">
                      Status
                    </th>
                    <th className="px-4 py-3">
                      <button
                        type="button"
                        className="inline-flex items-center font-medium text-[var(--text-secondary)] hover:text-[var(--primary)]"
                        onClick={() => handleSort("fileSizeBytes")}
                      >
                        Size
                        <SortIndicator active={sort === "fileSizeBytes"} direction={order} />
                      </button>
                    </th>
                    <th className="px-4 py-3">
                      <button
                        type="button"
                        className="inline-flex items-center font-medium text-[var(--text-secondary)] hover:text-[var(--primary)]"
                        onClick={() => handleSort("durationSeconds")}
                      >
                        Duration
                        <SortIndicator active={sort === "durationSeconds"} direction={order} />
                      </button>
                    </th>
                    <th className="px-4 py-3 font-medium text-[var(--text-secondary)]">
                      Resolution
                    </th>
                    <th className="px-4 py-3 font-medium text-[var(--text-secondary)]">
                      Shot / Grade
                    </th>
                    <th className="px-4 py-3 font-medium text-[var(--text-secondary)]">
                      Player
                    </th>
                    <th className="px-4 py-3">
                      <button
                        type="button"
                        className="inline-flex items-center font-medium text-[var(--text-secondary)] hover:text-[var(--primary)]"
                        onClick={() => handleSort("uploadedAt")}
                      >
                        Uploaded
                        <SortIndicator active={sort === "uploadedAt"} direction={order} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map((video) => {
                    const statusDetail =
                      video.processingState === "processing" && video.analysis?.status
                        ? STAGE_LABELS[video.analysis.status] ?? video.analysis.status
                        : null;
                    return (
                      <tr
                        key={video.id}
                        className="border-b border-[var(--surface-secondary)]/60 transition-colors hover:bg-[var(--surface-secondary)]/25"
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(video.id)}
                            onChange={() => toggleRow(video.id)}
                            aria-label={`Select ${video.filename}`}
                            className="h-4 w-4 rounded accent-[var(--primary)]"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(uploadHref(video.id, video.processingState))
                            }
                            className="relative block h-14 w-24 overflow-hidden rounded-md bg-black"
                          >
                            <video
                              src={`${video.thumbnailUrl}#t=0.1`}
                              muted
                              playsInline
                              preload="metadata"
                              className="h-full w-full object-cover"
                            />
                          </button>
                        </td>
                        <td className="max-w-[200px] px-4 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(uploadHref(video.id, video.processingState))
                            }
                            className="truncate font-medium text-[var(--text-primary)] hover:text-[var(--primary)] hover:underline"
                          >
                            {video.filename}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <StatusBadge state={video.processingState} />
                            {statusDetail ? (
                              <span className="text-xs text-[var(--text-secondary)]">
                                {statusDetail}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                          {formatFileSize(video.fileSizeBytes)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                          {formatDuration(video.durationSeconds)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                          {formatResolution(video.resolutionWidth, video.resolutionHeight)}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                          {video.processingState === "analyzed" ? (
                            <span>
                              {formatShotType(video.analysis?.shotType)}
                              {video.analysis?.gradeLetter
                                ? ` · ${video.analysis.gradeLetter}`
                                : ""}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                          {video.assignedUserDisplayName}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                          <span title={new Date(video.uploadedAt).toLocaleString("en-GB")}>
                            {toRelativeTimestamp(video.uploadedAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                router.push(uploadHref(video.id, video.processingState))
                              }
                            >
                              Open
                            </Button>
                            <button
                              type="button"
                              onClick={() => deleteSingle(video.id)}
                              className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                              aria-label={`Delete ${video.filename}`}
                            >
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
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--surface-secondary)] px-4 py-4">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-[var(--text-secondary)]">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(pendingDeleteIds?.length)}
        title={
          pendingDeleteIds && pendingDeleteIds.length > 1
            ? `Delete ${pendingDeleteIds.length} uploads?`
            : "Delete upload?"
        }
        message={`Remove ${pendingDeleteLabel} and associated analysis? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={() => void confirmBulkDelete()}
        onCancel={() => {
          if (!isDeleting) setPendingDeleteIds(null);
        }}
      />
    </div>
  );
}
