import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Queue } from "bullmq";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { canAccessVideo } from "@/src/lib/videos/access";

const idParamSchema = z.object({
  id: z.string().uuid(),
});

const bodySchema = z.object({
  forceActivity: z.enum(["BATTING", "BOWLING"]),
});

const analysisQueue = new Queue("analysis", {
  connection: { url: process.env.REDIS_URL ?? "redis://localhost:6379" },
});

/**
 * Re-queue an existing analysis, forcing a pipeline branch.
 * - BATTING: bowling/nets clip was actually a batter (e.g. ball-thrower + batter)
 * - BOWLING: batting clip was actually a bowling delivery
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paramResult = idParamSchema.safeParse(await params);
  if (!paramResult.success) {
    return NextResponse.json({ error: "Invalid analysis ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = bodySchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const analysis = await prisma.analysis.findUnique({
    where: { id: paramResult.data.id },
    include: {
      video: { select: { id: true, userId: true, isDeleted: true } },
    },
  });

  if (!analysis || analysis.video.isDeleted) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  if (!(await canAccessVideo(user, analysis.video.userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const inProgress = new Set([
    "QUEUED",
    "EXTRACTING_FRAMES",
    "ACTIVITY_CLASSIFICATION",
    "POSE_ANALYSIS",
    "SHOT_CLASSIFICATION",
    "GENERATING_FEEDBACK",
  ]);
  if (inProgress.has(analysis.status)) {
    return NextResponse.json(
      { error: "Analysis is already processing", status: analysis.status },
      { status: 409 }
    );
  }

  // Reset result fields so the UI doesn't show stale bowling/batting scores mid-run.
  const updated = await prisma.analysis.update({
    where: { id: analysis.id },
    data: {
      status: "QUEUED",
      activityOverride: validation.data.forceActivity,
      activityType: validation.data.forceActivity,
      activityConfidence: null,
      rejectionReason: null,
      errorMessage: null,
      startedAt: null,
      completedAt: null,
      processingMs: null,
      shotType: null,
      shotConfidence: null,
      gradeOverall: null,
      gradeLetter: null,
      scoreBacklift: null,
      scoreWeightTransfer: null,
      scoreHeadPosition: null,
      scoreFollowThrough: null,
      scoreTiming: null,
      scoreBalance: null,
      scoreFootwork: null,
      scoreShotSelection: null,
      bowlingArm: null,
      bowlingType: null,
      deliveryType: null,
      deliveryConfidence: null,
      scoreRunUpRhythm: null,
      scoreLoadUp: null,
      scoreBowlingArmAction: null,
      scoreDeliveryStride: null,
      scoreReleasePoint: null,
      scoreAlignment: null,
      coachingTips: null,
      technicalFeedback: null,
      rawGeminiResponse: null,
      poseDataPath: null,
      skeletonOverlayPath: null,
    },
  });

  await analysisQueue.add("analysis.pipeline", {
    videoId: analysis.videoId,
    userId: analysis.video.userId,
    analysisId: analysis.id,
  });

  return NextResponse.json({
    id: updated.id,
    videoId: updated.videoId,
    status: updated.status,
    activityOverride: updated.activityOverride,
    redirectUrl: `/analysis/${updated.videoId}/processing`,
  });
}
