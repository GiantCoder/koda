import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";

/**
 * GET /api/progress
 * Returns player progress data: stats, trend chart, shot distribution, recent sessions, achievements, coach comments.
 * MVP: aggregates from Analysis + Video. Full impl would use Session, Achievement, CoachComment models.
 */
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const analyses = await prisma.analysis.findMany({
    where: {
      video: { userId: authUser.id, isDeleted: false },
      status: "COMPLETE",
    },
    include: { video: true },
    orderBy: { completedAt: "desc" },
    take: 50,
  });

  const totalSessions = analyses.length;
  const grades = analyses
    .map((a) => a.gradeOverall)
    .filter((g): g is number => g != null);
  const avgGrade = grades.length > 0
    ? grades.reduce((a, b) => a + b, 0) / grades.length
    : null;

  const shotTypeCounts: Record<string, number> = {};
  analyses.forEach((a) => {
    const st = a.shotType ?? "UNKNOWN";
    shotTypeCounts[st] = (shotTypeCounts[st] ?? 0) + 1;
  });

  const shotDistribution = Object.entries(shotTypeCounts).map(([shotType, count]) => ({
    shotType: shotType.replace(/_/g, " "),
    count,
    percentage: totalSessions > 0 ? Math.round((count / totalSessions) * 100) : 0,
  }));

  const bestShotEntry = Object.entries(shotTypeCounts).sort((a, b) => b[1] - a[1])[0];
  const bestShot = bestShotEntry
    ? { name: bestShotEntry[0].replace(/_/g, " "), avg: avgGrade?.toFixed(1) ?? "—" }
    : null;

  const trendData = analyses
    .filter((a) => a.completedAt && a.gradeOverall != null)
    .slice(0, 20)
    .reverse()
    .map((a) => ({
      date: (a.completedAt as Date).toISOString().slice(0, 10),
      grade: a.gradeOverall as number,
      sessionId: a.id,
    }));

  const recentSessions = analyses.slice(0, 5).map((a) => {
    const ts = a.completedAt ?? a.createdAt;
    return {
      id: a.id,
      title: `${(a.shotType ?? "UNKNOWN").replace(/_/g, " ")} Practice`,
      grade: a.gradeOverall ?? 0,
      shotsCount: 1,
      durationHours: a.video?.durationSeconds ? (a.video.durationSeconds / 3600).toFixed(1) : "0",
      performanceLabel: (a.gradeOverall ?? 0) >= 8.5 ? "Excellent performance" : (a.gradeOverall ?? 0) >= 7 ? "Great technique" : "Room for Improvement",
      performanceColor: (a.gradeOverall ?? 0) >= 8.5 ? "success" : (a.gradeOverall ?? 0) >= 7 ? "success" : "warning",
      timestamp: ts ? new Date(ts).toISOString() : new Date().toISOString(),
    };
  });

  const achievements = [
    { id: "1", name: "Perfect Session", icon: "crown" },
    { id: "2", name: "Accuracy Master", icon: "target" },
    { id: "3", name: "7-Day Streak", icon: "flame" },
    { id: "4", name: "Shot Variety", icon: "star" },
    { id: "5", name: "Speed Demon", icon: "bolt" },
    { id: "6", name: "Milestone 50", icon: "trophy" },
  ].slice(0, 6);

  const coachComments = [
    { id: "1", coachName: "Coach Sarah", avatar: null, comment: "Excellent work on the cover drive today! Your timing has improved significantly.", timestamp: "2 hours ago" },
    { id: "2", coachName: "Coach Mike", avatar: null, comment: "Work on your pull shot technique. Remember to get your weight on the back foot.", timestamp: "1 day ago" },
  ];

  return NextResponse.json({
    stats: {
      totalSessions,
      avgGrade: avgGrade?.toFixed(1) ?? null,
      bestShot: bestShot?.name ?? null,
      bestShotAvg: bestShot?.avg ?? null,
      achievementsCount: achievements.length,
      deltaSessions: "+12% this month",
      deltaGrade: "+0.8 improvement",
      deltaAchievements: "+3 this week",
    },
    trendData,
    shotDistribution,
    recentSessions,
    achievements,
    coachComments,
  });
}
