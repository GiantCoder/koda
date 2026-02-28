"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { StatCard } from "@/app/components/dashboard/StatCard";
import { LoadingSpinner } from "@/app/components/common/LoadingSpinner";
import { useMockAuth } from "@/app/hooks/useMockAuth";

interface ProgressData {
  stats: {
    totalSessions: number;
    avgGrade: string | null;
    bestShot: string | null;
    bestShotAvg: string | null;
    achievementsCount: number;
    deltaSessions: string;
    deltaGrade: string;
    deltaAchievements: string;
  };
  trendData: { date: string; grade: number; sessionId: string }[];
  shotDistribution: { shotType: string; count: number; percentage: number }[];
  recentSessions: {
    id: string;
    title: string;
    grade: number;
    shotsCount: number;
    durationHours: string;
    performanceLabel: string;
    performanceColor: string;
    timestamp: string;
  }[];
  achievements: { id: string; name: string; icon: string }[];
  coachComments: { id: string; coachName: string; avatar: string | null; comment: string; timestamp: string }[];
}

function SessionsIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function GradeIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

function AchievementIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  );
}

function formatDate(ts: string): string {
  try {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return "—";
  }
}

export default function ProgressPage() {
  const { user, role } = useMockAuth();
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"1w" | "1m" | "3m" | "all">("1m");

  const fetchProgress = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/progress");
      if (!res.ok) throw new Error(`Failed to load progress (${res.status})`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load progress");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProgress();
  }, [fetchProgress]);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center py-24">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          Loading your progress…
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card className="border-[var(--danger)]/50">
          <CardContent className="py-8">
            <p className="text-[var(--danger)]">{error ?? "Unable to load progress"}</p>
            <button
              type="button"
              onClick={fetchProgress}
              className="mt-4 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-hover)]"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { stats, trendData, shotDistribution, recentSessions, achievements, coachComments } = data;
  const displayName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Player";

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Player Progress
          </h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            {displayName}
            {role === "parent" && " — Viewing your child"}
          </p>
        </div>
      </div>

      {role === "parent" && (
        <div className="mb-6 rounded-lg border border-[var(--warning)]/50 bg-[var(--warning)]/10 px-4 py-3">
          <p className="text-sm text-[var(--text-primary)]">
            <strong>Parent view:</strong> You are viewing your child&apos;s progress. Coach comments are visible to support their development.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Sessions"
          value={stats.totalSessions}
          icon={<SessionsIcon />}
        />
        <div className="flex items-center gap-3 rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface)] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-secondary)] text-[var(--primary)]">
            <GradeIcon />
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Avg Grade</p>
            <p className="text-xl font-semibold text-[var(--text-primary)]">
              {stats.avgGrade ?? "—"}
            </p>
            <p className="text-xs text-[var(--success)]">{stats.deltaGrade}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface)] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-secondary)] text-[var(--warning)]">
            <TrophyIcon />
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Best Shot</p>
            <p className="text-xl font-semibold text-[var(--text-primary)]">
              {stats.bestShot ?? "—"}
            </p>
            <p className="text-xs text-[var(--success)]">{stats.bestShotAvg ?? ""} avg</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface)] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-secondary)] text-[var(--primary)]">
            <AchievementIcon />
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Achievements</p>
            <p className="text-xl font-semibold text-[var(--text-primary)]">
              {stats.achievementsCount}
            </p>
            <p className="text-xs text-[var(--success)]">{stats.deltaAchievements}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <CardHeader className="mb-0">Shot Quality Trend</CardHeader>
              <div className="flex gap-1">
                {(["1w", "1m", "3m", "all"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={`rounded px-2 py-1 text-xs font-medium ${
                      period === p
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]/80"
                    }`}
                  >
                    {p === "1w" ? "1 week" : p === "1m" ? "1 month" : p === "3m" ? "3 months" : "All"}
                  </button>
                ))}
              </div>
            </div>
            <CardContent>
              {trendData.length > 0 ? (
                <div className="space-y-3">
                  {trendData.map((point) => {
                    const pct = Math.max(
                      0,
                      Math.min(100, ((point.grade - 5) / 5) * 100)
                    );
                    return (
                      <div key={point.sessionId}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-[var(--text-secondary)]">
                            {new Date(point.date).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                          <span className="font-medium text-[var(--text-primary)]">
                            {point.grade.toFixed(1)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--surface-secondary)]">
                          <div
                            className="h-full rounded-full bg-[var(--cricket-green)]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center text-[var(--text-secondary)]">
                  No trend data yet. Complete some analyses to see your progress.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <CardHeader className="mb-0">Recent Sessions</CardHeader>
              <Link href="/dashboard" className="text-sm font-medium text-[var(--primary)] hover:underline">
                View All
              </Link>
            </div>
            <CardContent>
              {recentSessions.length > 0 ? (
                <div className="space-y-3">
                  {recentSessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-4 rounded-lg border border-[var(--surface-secondary)] p-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-secondary)] text-[var(--primary)]">
                        <SessionsIcon />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[var(--text-primary)]">{s.title}</p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          Grade: {s.grade.toFixed(1)} • {s.shotsCount} shots • {s.durationHours}h
                        </p>
                        <p
                          className={`mt-1 text-sm ${
                            s.performanceColor === "success" ? "text-[var(--success)]" : "text-[var(--warning)]"
                          }`}
                        >
                          • {s.performanceLabel}
                        </p>
                      </div>
                      <div className="text-right text-xs text-[var(--text-secondary)]">
                        {formatDate(s.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">
                  No sessions yet. Upload your first video to get started.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>Shot Distribution</CardHeader>
            <CardContent>
              {shotDistribution.length > 0 ? (
                <div className="space-y-3">
                  {shotDistribution.map((shot) => (
                    <div key={shot.shotType}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-[var(--text-primary)]">{shot.shotType}</span>
                        <span className="text-[var(--text-secondary)]">
                          {shot.percentage}% ({shot.count})
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--surface-secondary)]">
                        <div
                          className="h-full rounded-full bg-[var(--primary)]"
                          style={{ width: `${shot.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">
                  No shot distribution data yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>Recent Achievements</CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {achievements.map((a, i) => (
                  <div
                    key={a.id}
                    className="flex flex-col items-center rounded-lg bg-[var(--surface-secondary)] p-3"
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full text-[var(--primary)]"
                      style={{ backgroundColor: "var(--surface)" }}
                    >
                      <AchievementIcon />
                    </div>
                    <p className="mt-2 text-center text-xs font-medium text-[var(--text-primary)]">
                      {a.name}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>Coach Comments</CardHeader>
            <CardContent>
              {coachComments.length > 0 ? (
                <div className="space-y-3">
                  {coachComments.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-lg border border-[var(--surface-secondary)] p-3"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-sm font-semibold text-[var(--primary)]">
                          {c.coachName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{c.coachName}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{c.timestamp}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">{c.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">
                  No coach comments yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
