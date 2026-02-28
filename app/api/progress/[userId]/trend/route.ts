import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { assertCanViewProgress } from "@/lib/progress-rbac";
import { z } from "zod";

const userIdParamSchema = z.object({
  userId: z.string().uuid(),
});

/**
 * GET /api/progress/:userId/trend
 * Returns grade trend over time for charting (x: date, y: grade).
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
      gradeOverall: { not: null },
      video: { userId: targetUserId, isDeleted: false },
    },
    select: {
      id: true,
      gradeOverall: true,
      completedAt: true,
      createdAt: true,
    },
    orderBy: { completedAt: "asc" },
  });

  const trend = analyses
    .filter((a) => a.gradeOverall != null)
    .map((a) => ({
      date: (a.completedAt ?? a.createdAt).toISOString().slice(0, 10),
      grade: a.gradeOverall as number,
      analysisId: a.id,
    }));

  return NextResponse.json({
    userId: targetUserId,
    trend,
  });
}
