import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { assertCanViewProgress } from "@/lib/progress-rbac";
import { z } from "zod";

const userIdParamSchema = z.object({
  userId: z.string().uuid(),
});

/**
 * GET /api/progress/:userId
 * Returns player progress stats for charting/cards.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paramResult = userIdParamSchema.safeParse(await params);
  if (!paramResult.success) {
    return NextResponse.json(
      { error: "Invalid user ID", details: paramResult.error.flatten() },
      { status: 400 }
    );
  }

  const { userId: targetUserId } = paramResult.data;

  const allowed = await assertCanViewProgress(
    user.id,
    user.role,
    targetUserId
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const analyses = await prisma.analysis.findMany({
    where: {
      status: "COMPLETE",
      video: { userId: targetUserId, isDeleted: false },
    },
    select: {
      id: true,
      gradeOverall: true,
      gradeLetter: true,
      shotType: true,
      completedAt: true,
      createdAt: true,
    },
    orderBy: { completedAt: "desc" },
  });

  const totalSessions = analyses.length;
  const grades = analyses
    .map((a) => a.gradeOverall)
    .filter((g): g is number => g != null);
  const avgGrade =
    grades.length > 0
      ? grades.reduce((sum, g) => sum + g, 0) / grades.length
      : null;

  const shotCounts = analyses.reduce<Record<string, number>>((acc, a) => {
    const key = a.shotType ?? "UNKNOWN";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const bestShot =
    Object.keys(shotCounts).length > 0
      ? Object.entries(shotCounts).sort(([, a], [, b]) => b - a)[0][0]
      : null;

  return NextResponse.json({
    userId: targetUserId,
    totalSessions,
    avgGrade: avgGrade != null ? Math.round(avgGrade * 10) / 10 : null,
    gradeLetter:
      avgGrade != null
        ? gradeFromNumber(avgGrade)
        : null,
    bestShot,
    recentSessions: analyses.slice(0, 5).map((a) => ({
      id: a.id,
      grade: a.gradeOverall,
      gradeLetter: a.gradeLetter,
      shotType: a.shotType,
      completedAt: a.completedAt,
    })),
  });
}

function gradeFromNumber(n: number): string {
  if (n >= 9) return "A+";
  if (n >= 8.5) return "A";
  if (n >= 8) return "A-";
  if (n >= 7.5) return "B+";
  if (n >= 7) return "B";
  if (n >= 6.5) return "B-";
  if (n >= 6) return "C+";
  if (n >= 5.5) return "C";
  if (n >= 5) return "C-";
  return "D";
}
