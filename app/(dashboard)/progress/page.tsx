"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { LoadingSpinner } from "@/app/components/common/LoadingSpinner";
import { useMockAuth } from "@/app/hooks/useMockAuth";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PieChart, Pie, Cell } from "recharts";

interface ProgressData {
  stats: {
    totalSessions: number;
    avgGrade: number;
    bestShot: string;
    achievementsCount: number;
    deltaSessions: string;
    deltaGrade: string;
    deltaAchievements: string;
  };
  trendData: { date: string; grade: number }[];
  shotDistribution: { name: string; value: number; color: string }[];
  recentSessions: {
    id: string;
    title: string;
    grade: number;
    shotsCount: number;
    durationHours: number;
    performanceLabel: string;
    timestamp: string;
    iconColor: string;
  }[];
  achievements: { id: string; name: string; icon: string; color: string }[];
  coachComments: { id: string; coachName: string; avatar: string; comment: string; timestamp: string }[];
}

// Mock data matching the design
const MOCK_PROGRESS_DATA: ProgressData = {
  stats: {
    totalSessions: 47,
    avgGrade: 8.4,
    bestShot: "Cover Drive",
    achievementsCount: 12,
    deltaSessions: "+12% this month",
    deltaGrade: "+0.8 improvement",
    deltaAchievements: "+3 this week",
  },
  trendData: [
    { date: "Jan 15", grade: 7.0 },
    { date: "Jan 18", grade: 7.2 },
    { date: "Jan 22", grade: 7.5 },
    { date: "Jan 25", grade: 7.8 },
    { date: "Jan 29", grade: 8.0 },
    { date: "Feb 1", grade: 8.2 },
    { date: "Feb 5", grade: 8.1 },
    { date: "Feb 8", grade: 8.3 },
    { date: "Feb 12", grade: 8.5 },
    { date: "Feb 15", grade: 8.6 },
  ],
  shotDistribution: [
    { name: "Cover Drive", value: 28, color: "#10b981" },
    { name: "Pull Shot", value: 18, color: "#3b82f6" },
    { name: "Cut Shot", value: 15, color: "#f59e0b" },
    { name: "Sweep", value: 12, color: "#ef4444" },
    { name: "Other", value: 9, color: "#6b7280" },
    { name: "Defensive", value: 18, color: "#8b5cf6" },
  ],
  recentSessions: [
    {
      id: "1",
      title: "Cover Drive Practice",
      grade: 9.2,
      shotsCount: 45,
      durationHours: 2,
      performanceLabel: "Excellent performance",
      timestamp: "Today, 4:30 PM",
      iconColor: "#10b981",
    },
    {
      id: "2",
      title: "Pull Shot Training",
      grade: 7.8,
      shotsCount: 38,
      durationHours: 1.5,
      performanceLabel: "Room for improvement",
      timestamp: "Yesterday, 3:00 PM",
      iconColor: "#3b82f6",
    },
    {
      id: "3",
      title: "Defensive Shots",
      grade: 8.5,
      shotsCount: 52,
      durationHours: 2.5,
      performanceLabel: "Great technique",
      timestamp: "2 days ago, 5:15 PM",
      iconColor: "#8b5cf6",
    },
  ],
  achievements: [
    { id: "1", name: "Perfect Session", icon: "👑", color: "#f59e0b" },
    { id: "2", name: "Accuracy Master", icon: "🎯", color: "#10b981" },
    { id: "3", name: "7-Day Streak", icon: "🔥", color: "#3b82f6" },
    { id: "4", name: "Shot Variety", icon: "⭐", color: "#8b5cf6" },
    { id: "5", name: "Speed Demon", icon: "⚡", color: "#ef4444" },
    { id: "6", name: "Milestone 50", icon: "🏆", color: "#8b5cf6" },
  ],
  coachComments: [
    {
      id: "1",
      coachName: "Coach Sarah",
      avatar: "/avatars/cricket/cricket_avatar_01.png",
      comment: "Excellent work on the cover drive today! Your timing has improved significantly. Focus on maintaining that stance consistency.",
      timestamp: "2 hours ago",
    },
    {
      id: "2",
      coachName: "Coach Mike",
      avatar: "/avatars/cricket/cricket_avatar_02.png",
      comment: "Work on your pull shot technique. Remember to get your weight on the back foot and keep your head steady through the shot.",
      timestamp: "1 day ago",
    },
  ],
};

function StatCard({ title, value, delta, icon, iconBg }: { title: string; value: string | number; delta: string; icon: React.ReactNode; iconBg: string }) {
  const isPositive = delta.startsWith("+");
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-[var(--text-secondary)]">{title}</p>
            <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{value}</p>
            <p className={`mt-2 text-sm ${isPositive ? "text-[var(--success)]" : "text-[var(--text-secondary)]"}`}>
              {delta}
            </p>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${iconBg}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SessionIcon({ color }: { color: string }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}20` }}>
      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
    </div>
  );
}

export default function ProgressPage() {
  const { user } = useMockAuth();
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setData(MOCK_PROGRESS_DATA);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-[var(--text-secondary)]">No progress data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Progress Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Track your cricket training journey
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Sessions"
          value={data.stats.totalSessions}
          delta={data.stats.deltaSessions}
          icon={
            <svg className="h-6 w-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          iconBg="bg-[var(--primary)]/10"
        />
        <StatCard
          title="Avg Grade"
          value={data.stats.avgGrade}
          delta={data.stats.deltaGrade}
          icon={
            <svg className="h-6 w-6 text-[var(--primary)]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          }
          iconBg="bg-[var(--primary)]/10"
        />
        <StatCard
          title="Best Shot"
          value={data.stats.bestShot}
          delta="+3 this week"
          icon={
            <svg className="h-6 w-6 text-[var(--warning)]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
            </svg>
          }
          iconBg="bg-[var(--warning)]/10"
        />
        <StatCard
          title="Achievements"
          value={data.stats.achievementsCount}
          delta={data.stats.deltaAchievements}
          icon={
            <svg className="h-6 w-6 text-[var(--primary)]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          }
          iconBg="bg-[var(--primary)]/10"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Shot Quality Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>Shot Quality Trend</CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-secondary)" />
                <XAxis dataKey="date" stroke="var(--text-secondary)" style={{ fontSize: '12px' }} />
                <YAxis stroke="var(--text-secondary)" style={{ fontSize: '12px' }} domain={[5, 10]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--surface-secondary)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                  }}
                />
                <Line type="monotone" dataKey="grade" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Shot Distribution */}
        <Card>
          <CardHeader>Shot Distribution</CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.shotDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name} ${value}%`}
                  labelLine={false}
                >
                  {data.shotDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--surface-secondary)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions & Achievements Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Sessions */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <span>Recent Sessions</span>
            <Link href="/progress" className="text-sm text-[var(--primary)] hover:underline">
              View All
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentSessions.map((session) => (
                <div key={session.id} className="flex items-start gap-4 rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface-secondary)]/40 p-4">
                  <SessionIcon color={session.iconColor} />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-[var(--text-primary)]">{session.title}</h4>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          Grade: {session.grade} • {session.shotsCount} shots • {session.durationHours} hours
                        </p>
                        <p className="mt-1 text-sm text-[var(--success)]">● {session.performanceLabel}</p>
                      </div>
                      <span className="text-sm text-[var(--text-secondary)]">{session.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Achievements & Coach Comments */}
        <div className="space-y-6">
          {/* Recent Achievements */}
          <Card>
            <CardHeader>Recent Achievements</CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {data.achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="flex flex-col items-center justify-center rounded-lg p-4"
                    style={{ backgroundColor: `${achievement.color}20` }}
                  >
                    <span className="text-3xl">{achievement.icon}</span>
                    <span className="mt-2 text-center text-xs text-[var(--text-primary)]">{achievement.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Coach Comments */}
          <Card>
            <CardHeader>Coach Comments</CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.coachComments.map((comment) => (
                  <div key={comment.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 overflow-hidden rounded-full bg-[var(--surface-secondary)]">
                        {comment.avatar && (
                          <img src={comment.avatar} alt={comment.coachName} className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{comment.coachName}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{comment.timestamp}</p>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">{comment.comment}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
