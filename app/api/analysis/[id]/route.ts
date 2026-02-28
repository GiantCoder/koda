import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { canViewUser } from "@/lib/rbac";
import { z } from "zod";

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
      video: {
        select: {
          id: true,
          userId: true,
          filename: true,
          durationSeconds: true,
          resolutionWidth: true,
          resolutionHeight: true,
          cdnUrl: true,
        },
      },
    },
  });

  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  const ownerId = analysis.video.userId;
  if (!canViewUser(user.id, user.role, ownerId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { video, ...rest } = analysis;
  return NextResponse.json({
    ...rest,
    videoId: analysis.videoId,
    video: {
      id: video.id,
      filename: video.filename,
      durationSeconds: video.durationSeconds,
      resolutionWidth: video.resolutionWidth,
      resolutionHeight: video.resolutionHeight,
      cdnUrl: video.cdnUrl,
    },
    scores: {
      backlift: rest.scoreBacklift,
      weightTransfer: rest.scoreWeightTransfer,
      headPosition: rest.scoreHeadPosition,
      followThrough: rest.scoreFollowThrough,
      timing: rest.scoreTiming,
      balance: rest.scoreBalance,
      footwork: rest.scoreFootwork,
      shotSelection: rest.scoreShotSelection,
    },
  });
}
