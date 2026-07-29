"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Select } from "@/app/components/ui/Select";
import { ToastContainer } from "@/app/components/ui/Toast";
import { useToast } from "@/app/hooks/useToast";
import { useMockAuth } from "@/app/hooks/useMockAuth";
import { buildMockAuthHeaders } from "@/app/lib/mock-auth-headers";
import { toRelativeTimestamp } from "@/app/lib/uploads-display";
import { AvatarGalleryModal } from "@/app/components/avatar/AvatarGalleryModal";
import PlayerCardDisplay from "@/app/components/player-card/PlayerCardDisplay";
import type { PlayerCardDto } from "@/types/player-card";
import {
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  LineChart,
} from "recharts";
import { LoadingSpinner } from "@/app/components/common/LoadingSpinner";

type VideoCategory = "batting" | "bowling" | "fielding" | "keeping";

const CATEGORY_META: Record<
  VideoCategory,
  { label: string; color: string; dataKey: VideoCategory }
> = {
  batting: { label: "Batting", color: "#10b981", dataKey: "batting" },
  bowling: { label: "Bowling", color: "#f59e0b", dataKey: "bowling" },
  fielding: { label: "Fielding", color: "#3b82f6", dataKey: "fielding" },
  keeping: { label: "Keeping", color: "#a855f7", dataKey: "keeping" },
};

function gradeFromScore(score: number): string {
  if (score >= 85) return "A";
  if (score >= 75) return "B+";
  if (score >= 65) return "B";
  if (score >= 55) return "C+";
  return "C";
}

function gradeBadgeClass(gradeLetter: string | null | undefined): string {
  if (!gradeLetter) return "bg-[var(--surface-secondary)] text-[var(--text-secondary)]";
  if (gradeLetter.startsWith("A")) return "bg-[var(--success)]/20 text-[var(--success)]";
  if (gradeLetter.startsWith("B"))
    return "bg-amber-500/20 text-amber-700 dark:text-amber-300";
  return "bg-[var(--surface-secondary)] text-[var(--text-secondary)]";
}

function initialsFallback(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "P";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0]?.toUpperCase() ?? "P";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0]?.toUpperCase() ?? "" : "";
  return `${first}${last}`.slice(0, 2);
}

interface AnalysedVideoRow {
  id: string;
  analysisId: string;
  filename: string;
  uploadedAt: string; // ISO
  thumbnailUrl: string;
  category: VideoCategory;
  gradeLetter: string | null;
  gradeOverall: number | null;
  commentCount: number;
}

type TrendPoint = {
  analysisId: string;
  videoId: string;
  uploadedAt: string; // ISO
  category: VideoCategory;
  gradeLetter: string | null;
  gradeOverall: number | null;
};

export default function PlayerProfilePage() {
  const params = useParams();
  const playerId = typeof params.playerId === "string" ? params.playerId : null;
  const router = useRouter();
  const { user, role } = useMockAuth();
  const { toasts, showToast, closeToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState<{
    id: string;
    displayName: string;
    avatarUrl?: string | null;
  } | null>(null);
  const [card, setCard] = useState<PlayerCardDto | null>(null);
  const [cardLoading, setCardLoading] = useState(false);

  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);

  const [trend, setTrend] = useState<TrendPoint[]>([]);

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | VideoCategory>("all");
  const [videos, setVideos] = useState<AnalysedVideoRow[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);

  useEffect(() => {
    if (!playerId || !user) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/team/players", {
          headers: buildMockAuthHeaders(user),
        });
        if (!res.ok) throw new Error(`Failed to load players (${res.status})`);
        const data = (await res.json()) as { players?: Array<any> };
        const nextPlayer = (data.players ?? []).find((p) => p.id === playerId) ?? null;
        if (!cancelled) setPlayer(nextPlayer);
      } catch (e) {
        if (!cancelled) setPlayer(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [playerId, user]);

  useEffect(() => {
    if (!playerId || !user) return;
    setCardLoading(true);
    void fetch(`/api/team/players/${playerId}/player-card`, {
      headers: buildMockAuthHeaders(user),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load player card (${r.status})`);
        return r.json();
      })
      .then((raw) => setCard(raw as PlayerCardDto))
      .catch(() => setCard(null))
      .finally(() => setCardLoading(false));
  }, [playerId, user]);

  useEffect(() => {
    if (!playerId || !user) return;
    void fetch(`/api/team/players/${playerId}/analysed-videos/trend?limit=200`, {
      headers: buildMockAuthHeaders(user),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load chart (${r.status})`);
        return r.json();
      })
      .then((data) => setTrend((data.points ?? []) as TrendPoint[]))
      .catch(() => setTrend([]));
  }, [playerId, user]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const fetchVideos = useCallback(async () => {
    if (!playerId || !user) return;
    setVideosLoading(true);
    try {
      const sp = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        search,
        category: categoryFilter,
      });
      const res = await fetch(
        `/api/team/players/${playerId}/analysed-videos?${sp.toString()}`,
        { headers: buildMockAuthHeaders(user) }
      );
      if (!res.ok) throw new Error(`Failed to load videos (${res.status})`);
      const data = (await res.json()) as {
        videos: AnalysedVideoRow[];
        pagination: { totalPages: number; total: number };
      };
      setVideos(data.videos ?? []);
      setTotalPages(data.pagination?.totalPages ?? 1);
      setTotal(data.pagination?.total ?? 0);
    } catch (e) {
      setVideos([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setVideosLoading(false);
    }
  }, [playerId, user, page, PAGE_SIZE, search, categoryFilter]);

  useEffect(() => {
    void fetchVideos();
  }, [fetchVideos]);

  const categorySummary = useMemo(() => {
    const categories: VideoCategory[] = ["batting", "bowling", "fielding", "keeping"];
    return Object.fromEntries(
      categories.map((cat) => {
        const grades = trend
          .filter((p) => p.category === cat && typeof p.gradeOverall === "number")
          .map((p) => p.gradeOverall as number);
        if (grades.length === 0) return [cat, null] as const;
        const avg = grades.reduce((sum, g) => sum + g, 0) / grades.length;
        const letter = gradeFromScore(avg);
        return [
          cat,
          {
            avg,
            letter,
          },
        ] as const;
      })
    ) as Partial<Record<VideoCategory, { avg: number; letter: string } | null>>;
  }, [trend]);

  const chartData = useMemo(() => {
    return trend.map((p) => {
      const dateLabel = new Date(p.uploadedAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      });
      const val = typeof p.gradeOverall === "number" ? p.gradeOverall : null;
      return {
        date: dateLabel,
        batting: p.category === "batting" ? val : null,
        bowling: p.category === "bowling" ? val : null,
        fielding: p.category === "fielding" ? val : null,
        keeping: p.category === "keeping" ? val : null,
      };
    });
  }, [trend]);

  const [chartCategory, setChartCategory] = useState<"all" | VideoCategory>("all");
  const [legendsOn, setLegendsOn] = useState(true);

  const visibleCategories: VideoCategory[] =
    chartCategory === "all" ? (["batting", "bowling", "fielding", "keeping"] as const).slice(0) as VideoCategory[] : [chartCategory];

  const canManageAvatar = role === "coach" || role === "admin" || role === "parent";

  const avatarUrl = player?.avatarUrl ?? null;

  return (
    <div className="mx-auto max-w-7xl pb-10 pt-6">
      <ToastContainer toasts={toasts} onClose={closeToast} />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={`${player?.displayName ?? "Player"} avatar`}
                width={96}
                height={96}
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-2xl font-semibold text-[var(--primary)]">
                {initialsFallback(player?.displayName ?? "")}
              </div>
            )}
            {canManageAvatar && (
              <button
                type="button"
                onClick={() => setAvatarModalOpen(true)}
                disabled={avatarSaving}
                className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
                aria-label="Edit avatar"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5l10 10m-10-10L7 9m4-4L3 13m8 6H5v-6"
                  />
                </svg>
              </button>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {player?.displayName ?? "Player"}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Player profile</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>Player Card</CardHeader>
          <CardContent className="flex justify-center">
            {cardLoading ? (
              <div className="flex h-10 items-center">
                <LoadingSpinner />
              </div>
            ) : card ? (
              <div className="w-full">
                <PlayerCardDisplay card={card} aiBgCss={null} compact interactive={false} />
              </div>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">
                No player card available yet.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <span>Overall Grades</span>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {(Object.keys(CATEGORY_META) as VideoCategory[]).map((cat) => {
                  const summary = categorySummary[cat];
                  return (
                    <div key={cat} className="rounded-lg border border-[var(--surface-secondary)] p-3">
                      <div className="text-xs font-medium text-[var(--text-secondary)]">
                        {CATEGORY_META[cat].label}
                      </div>
                      {summary ? (
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${gradeBadgeClass(summary.letter)}`}>
                            {summary.letter}
                          </span>
                          <span className="text-sm text-[var(--text-secondary)]">
                            {summary.avg.toFixed(1)}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-[var(--text-secondary)]">N/A</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--surface-secondary)]">
              <span className="text-sm text-[var(--text-secondary)]">Analysed Videos</span>
              <div className="flex items-center gap-3">
                <div className="w-44">
                  <Select
                    label="Category"
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(e.target.value as "all" | VideoCategory);
                      setPage(1);
                    }}
                    options={[
                      { value: "all", label: "All categories" },
                      { value: "batting", label: "Batting" },
                      { value: "bowling", label: "Bowling" },
                      { value: "fielding", label: "Fielding" },
                      { value: "keeping", label: "Keeping" },
                    ]}
                  />
                </div>
                <div className="min-w-[220px]">
                  <Input
                    label="Search filename"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="e.g. cover drive"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {videosLoading || loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <LoadingSpinner size="lg" />
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">
                    Loading analysed videos...
                  </p>
                </div>
              ) : videos.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-[var(--text-secondary)]">No analysed videos match your filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--surface-secondary)] bg-[var(--surface-secondary)]/30">
                        <th className="px-4 py-3">Thumbnail</th>
                        <th className="px-4 py-3">Filename</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Grade</th>
                        <th className="px-4 py-3"># Comments</th>
                        <th className="px-4 py-3">Uploaded</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {videos.map((video) => (
                        <tr
                          key={video.id}
                          className="border-b border-[var(--surface-secondary)]/60 transition-colors hover:bg-[var(--surface-secondary)]/25"
                        >
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => router.push(`/analysis/${video.id}`)}
                              className="relative block h-14 w-24 overflow-hidden rounded-md bg-black"
                              aria-label={`Open ${video.filename}`}
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
                          <td className="max-w-[240px] px-4 py-3">
                            <button
                              type="button"
                              onClick={() => router.push(`/analysis/${video.id}`)}
                              className="truncate font-medium text-[var(--text-primary)] hover:text-[var(--primary)] hover:underline"
                            >
                              {video.filename}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-[var(--text-secondary)]">
                            {CATEGORY_META[video.category].label}
                          </td>
                          <td className="px-4 py-3">
                            {video.gradeLetter ? (
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${gradeBadgeClass(
                                  video.gradeLetter
                                )}`}
                              >
                                {video.gradeLetter}
                              </span>
                            ) : (
                              <span className="text-[var(--text-secondary)]">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[var(--text-secondary)]">
                            {video.commentCount}
                          </td>
                          <td className="px-4 py-3 text-[var(--text-secondary)]">
                            {toRelativeTimestamp(video.uploadedAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" variant="secondary" onClick={() => router.push(`/analysis/${video.id}`)}>
                              Open
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!videosLoading && !loading && totalPages > 1 && videos.length > 0 && (
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
        </div>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--surface-secondary)]">
            <span>Grades Over Time</span>
            <div className="flex items-center gap-3">
              <div className="w-44">
                <Select
                  label="Chart Category"
                  value={chartCategory}
                  onChange={(e) => setChartCategory(e.target.value as "all" | VideoCategory)}
                  options={[
                    { value: "all", label: "All categories" },
                    { value: "batting", label: "Batting" },
                    { value: "bowling", label: "Bowling" },
                    { value: "fielding", label: "Fielding" },
                    { value: "keeping", label: "Keeping" },
                  ]}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={legendsOn}
                  onChange={(e) => setLegendsOn(e.target.checked)}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                Legends
              </label>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {trend.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-[var(--text-secondary)]">No grade history available yet.</p>
              </div>
            ) : (
              <div className="h-[360px] w-full p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-secondary)" />
                    <XAxis
                      dataKey="date"
                      stroke="var(--text-secondary)"
                      style={{ fontSize: "12px" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis stroke="var(--text-secondary)" style={{ fontSize: "12px" }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--surface)",
                        border: "1px solid var(--surface-secondary)",
                        borderRadius: "8px",
                        color: "var(--text-primary)",
                      }}
                    />
                    {legendsOn ? <Legend /> : null}
                    {visibleCategories.map((cat) => (
                      <Line
                        key={cat}
                        type="monotone"
                        dataKey={CATEGORY_META[cat].dataKey}
                        name={CATEGORY_META[cat].label}
                        stroke={CATEGORY_META[cat].color}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {canManageAvatar && (
        <AvatarGalleryModal
          isOpen={avatarModalOpen}
          onClose={() => setAvatarModalOpen(false)}
          currentAvatarUrl={avatarUrl ?? undefined}
          onSelect={(nextAvatarUrl: string) => {
            if (!playerId || !user) return;
            setAvatarSaving(true);
            void fetch(`/api/team/players/${playerId}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                ...buildMockAuthHeaders(user),
              },
              body: JSON.stringify({ avatarUrl: nextAvatarUrl }),
            })
              .then((r) => {
                if (!r.ok) throw new Error(`Failed to update avatar (${r.status})`);
                return r.json();
              })
              .then(() => {
                setPlayer((prev) => (prev ? { ...prev, avatarUrl: nextAvatarUrl } : prev));
                showToast("Avatar updated", "success");
                setAvatarModalOpen(false);
              })
              .catch((e) => {
                showToast(e instanceof Error ? e.message : "Failed to update avatar", "error");
              })
              .finally(() => setAvatarSaving(false));
          }}
        />
      )}
    </div>
  );
}

