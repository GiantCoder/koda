import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { assertCanViewProgress } from "@/lib/progress-rbac";
import { z } from "zod";

const userIdParamSchema = z.object({
  userId: z.string().uuid(),
});

/**
 * GET /api/progress/:userId/shots
 * Returns shot distribution for doughnut/pie chart.
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
    select: { shotType: true },
  });

  const distribution = analyses.reduce<
    Array<{ shotType: string; count: number; percentage?: number }>
  >((acc, a) => {
    const key = a.shotType ?? "UNKNOWN";
    const existing = acc.find((x) => x.shotType === key);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ shotType: key, count: 1 });
    }
    return acc;
  }, []);

  const total = distribution.reduce((sum, d) => sum + d.count, 0);
  distribution.forEach((d) => {
    d.percentage = total > 0 ? Math.round((d.count / total) * 1000) / 10 : 0;
  });
  distribution.sort((a, b) => b.count - a.count);

  return NextResponse.json({
    userId: targetUserId,
    shots: distribution,
    totalAnalyses: total,
  });
}
