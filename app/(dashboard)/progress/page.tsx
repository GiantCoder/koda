"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
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
  shotDistribution: { shotType: string; count: number; percentage: number; color: string }[];
  recentSessions: {
    id: string;
    title: string;
    grade: number;
    shotsCount: number;
    durationHours: string;
    performanceLabel: string;
    performanceColor: string;
    timestamp: string;
    iconColor: string;
  }[];
  achievements: { id: string; name: string; icon: string; color: string }[];
  coachComments: { id: string; coachName: string; avatar: string | null; comment: string; timestamp: string }[];
}

function BarChartIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
    </svg>
  );
}

function AwardIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z" clipRule="evenodd" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}

export default function ProgressPage() {
  const { user, role } = useMockAuth();
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-[var(--text-secondary)]">Total Sessions</p>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1e3a3a]">
              <BarChartIcon className="text-[#52B788]" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{stats.totalSessions}</p>
          <p className="mt-1 text-sm text-[var(--success)]">{stats.deltaSessions}</p>
        </div>

        <div className="rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-[var(--text-secondary)]">Avg Grade</p>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2a3a5a]">
              <StarIcon className="text-[#60A5FA]" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{stats.avgGrade ?? "—"}</p>
          <p className="mt-1 text-sm text-[var(--success)]">{stats.deltaGrade}</p>
        </div>

        <div className="rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-[var(--text-secondary)]">Best Shot</p>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4a3a1a]">
              <TrophyIcon className="text-[#FBBF24]" />
            </div>
          </div>
          <p className="text-xl font-bold text-[var(--text-primary)]">{stats.bestShot ?? "—"}</p>
          <p className="mt-1 text-sm text-[var(--success)]">{stats.bestShotAvg ?? ""}</p>
        </div>

        <div className="rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-[var(--text-secondary)]">Achievements</p>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#3a2a4a]">
              <AwardIcon className="text-[#A78BFA]" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{stats.achievementsCount}</p>
          <p className="mt-1 text-sm text-[var(--success)]">{stats.deltaAchievements}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>Shot Quality Trend</CardHeader>
            <CardContent>
              {trendData.length > 0 ? (
                <div className="h-64">
                  <svg viewBox="0 0 600 200" className="h-full w-full">
                    <defs>
                      <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#52B788" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#52B788" stopOpacity="1" />
                      </linearGradient>
                    </defs>
                    
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <line
                        key={i}
                        x1="40"
                        y1={30 + i * 28}
                        x2="580"
                        y2={30 + i * 28}
                        stroke="var(--surface-secondary)"
                        strokeWidth="1"
                        opacity="0.3"
                      />
                    ))}
                    
                    {trendData.map((point, i) => {
                      const x = 60 + (i * 480) / (trendData.length - 1 || 1);
                      const y = 170 - ((point.grade - 5) / 5) * 140;
                      return (
                        <g key={point.sessionId}>
                          <text
                            x={x}
                            y="195"
                            textAnchor="middle"
                            fill="var(--text-secondary)"
                            fontSize="11"
                          >
                            {new Date(point.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </text>
                        </g>
                      );
                    })}
                    
                    <polyline
                      points={trendData
                        .map((point, i) => {
                          const x = 60 + (i * 480) / (trendData.length - 1 || 1);
                          const y = 170 - ((point.grade - 5) / 5) * 140;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                      fill="none"
                      stroke="url(#lineGradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    
                    {trendData.map((point, i) => {
                      const x = 60 + (i * 480) / (trendData.length - 1 || 1);
                      const y = 170 - ((point.grade - 5) / 5) * 140;
                      return (
                        <circle
                          key={`dot-${point.sessionId}`}
                          cx={x}
                          cy={y}
                          r="4"
                          fill="#52B788"
                        />
                      );
                    })}
                  </svg>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center text-[var(--text-secondary)]">
                  No trend data yet. Complete some analyses to see your progress.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
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
                      className="flex items-start gap-4 rounded-lg bg-[var(--surface-secondary)]/50 p-4 transition-colors hover:bg-[var(--surface-secondary)]"
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: s.iconColor || "#2a3a5a" }}
                      >
                        <CheckCircleIcon className="text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[var(--text-primary)]">{s.title}</p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          Grade: {s.grade.toFixed(1)} • {s.shotsCount} shots • {s.durationHours} hours
                        </p>
                        <div className="mt-2 flex items-center gap-1">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: s.performanceColor === "success" ? "#10B981" : "#F59E0B" }}
                          />
                          <span className="text-xs text-[var(--text-secondary)]">{s.performanceLabel}</span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-[var(--text-secondary)]">
                        {s.timestamp}
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
                <div className="space-y-6">
                  <div className="relative mx-auto h-48 w-48">
                    <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
                      {shotDistribution.reduce((acc, shot, i) => {
                        const prevTotal = shotDistribution.slice(0, i).reduce((sum, s) => sum + s.percentage, 0);
                        const startAngle = (prevTotal / 100) * 360;
                        const endAngle = ((prevTotal + shot.percentage) / 100) * 360;
                        const largeArc = shot.percentage > 50 ? 1 : 0;
                        
                        const startX = 100 + 70 * Math.cos((startAngle * Math.PI) / 180);
                        const startY = 100 + 70 * Math.sin((startAngle * Math.PI) / 180);
                        const endX = 100 + 70 * Math.cos((endAngle * Math.PI) / 180);
                        const endY = 100 + 70 * Math.sin((endAngle * Math.PI) / 180);
                        
                        acc.push(
                          <path
                            key={shot.shotType}
                            d={`M 100 100 L ${startX} ${startY} A 70 70 0 ${largeArc} 1 ${endX} ${endY} Z`}
                            fill={shot.color}
                          />
                        );
                        return acc;
                      }, [] as React.ReactNode[])}
                      
                      <circle cx="100" cy="100" r="45" fill="var(--surface)" />
                    </svg>
                  </div>
                  
                  <div className="space-y-2">
                    {shotDistribution.map((shot) => (
                      <div key={shot.shotType} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-sm"
                            style={{ backgroundColor: shot.color }}
                          />
                          <span className="text-[var(--text-primary)]">{shot.shotType}</span>
                        </div>
                        <span className="font-medium text-[var(--text-primary)]">{shot.percentage}%</span>
                      </div>
                    ))}
                  </div>
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
                {achievements.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-col items-center gap-2"
                  >
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-full"
                      style={{ backgroundColor: a.color }}
                    >
                      <span className="text-2xl">{a.icon}</span>
                    </div>
                    <p className="text-center text-xs font-medium text-[var(--text-primary)]">
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
                <div className="space-y-4">
                  {coachComments.map((c) => (
                    <div key={c.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        {c.avatar ? (
                          <Image
                            src={c.avatar}
                            alt={c.coachName}
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-sm font-semibold text-[var(--primary)]">
                            {c.coachName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{c.coachName}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{c.timestamp}</p>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{c.comment}</p>
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
