import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { canViewUser } from "@/lib/rbac";
import { downloadFromStorage } from "@/src/lib/storage";
import type { PoseEstimateResponse } from "@/src/lib/analysis/mediapipe-types";

const idParamSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paramResult = idParamSchema.safeParse(await params);
  if (!paramResult.success) {
    return NextResponse.json(
      { error: "Invalid analysis ID", details: paramResult.error.flatten() },
      { status: 400 }
    );
  }

  const { id } = paramResult.data;
  const analysis = await prisma.analysis.findUnique({
    where: { id },
    include: {
      video: { select: { userId: true } },
    },
  });

  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  if (!canViewUser(user.id, user.role, analysis.video.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!analysis.poseDataPath) {
    return NextResponse.json({ error: "Pose data unavailable" }, { status: 404 });
  }

  try {
    const poseBuffer = await downloadFromStorage(analysis.poseDataPath);
    const parsed = JSON.parse(poseBuffer.toString("utf8")) as PoseEstimateResponse;
    return NextResponse.json(parsed, {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=30",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load pose data" },
      { status: 500 }
    );
  }
}
