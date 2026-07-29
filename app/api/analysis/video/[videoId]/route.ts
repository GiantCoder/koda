import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { canAccessVideo } from "@/src/lib/videos/access";
import { parseVideoTags } from "@/app/api/videos/[id]/schema";
import { z } from "zod";

const videoIdParamSchema = z.object({
  videoId: z.string().uuid(),
});

function buildMockAnalysis(videoId: string) {
  const numericSeed = Array.from(videoId).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0
  );
  const scoreBase = 72 + (numericSeed % 18);
  const scoreHeadPosition = Math.max(60, Math.min(96, scoreBase - 4));
  const scoreWeightTransfer = Math.max(60, Math.min(96, scoreBase + 3));
  const scoreBacklift = Math.max(60, Math.min(96, scoreBase + 2));
  const scoreFollowThrough = Math.max(60, Math.min(96, scoreBase + 1));
  const scoreTiming = Math.max(60, Math.min(96, scoreBase));
  const scoreBalance = Math.max(60, Math.min(96, scoreBase - 1));
  const scoreFootwork = Math.max(60, Math.min(96, scoreBase - 2));
  const scoreShotSelection = Math.max(60, Math.min(96, scoreBase + 1));
  const gradeOverall = Math.round(
    (
      scoreHeadPosition +
      scoreWeightTransfer +
      scoreBacklift +
      scoreFollowThrough +
      scoreTiming +
      scoreBalance +
      scoreFootwork +
      scoreShotSelection
    ) / 8
  );

  return {
    id: `analysis_${videoId}`,
    videoId,
    status: "COMPLETE",
    shotType: "COVER_DRIVE",
    shotConfidence: 0.86,
    gradeOverall,
    gradeLetter: gradeOverall >= 85 ? "A" : gradeOverall >= 75 ? "B+" : "B",
    scoreBacklift,
    scoreWeightTransfer,
    scoreHeadPosition,
    scoreFollowThrough,
    scoreTiming,
    scoreBalance,
    scoreFootwork,
    scoreShotSelection,
    coachingTips: [
      {
        type: "strength",
        title: "Strong setup and balance",
        body: "Your head and shoulder alignment stays stable through contact.",
      },
      {
        type: "improvement",
        title: "Front-foot timing",
        body: "Plant the front foot a fraction earlier to improve control.",
      },
      {
        type: "recommendation",
        title: "Next session drill",
        body: "Practice 3 sets of 12 cover drives focusing on early stride and soft hands.",
      },
    ],
    video: {
      cdnUrl: null,
      filename: "Sample upload.mp4",
      durationSeconds: 12.4,
      resolutionWidth: 1920,
      resolutionHeight: 1080,
      tags: [],
      assignedPlayer: null,
    },
  };
}

function toJsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, currentValue) =>
      typeof currentValue === "bigint" ? Number(currentValue) : currentValue
    )
  ) as T;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const routeParams = await params;
  const rawVideoId = routeParams.videoId;

  // Mock upload flow currently issues ids like `vid_<timestamp>_<suffix>`.
  // Return synthetic analysis so upload -> processing -> results works in local demo mode.
  if (rawVideoId.startsWith("vid_")) {
    return NextResponse.json(buildMockAnalysis(rawVideoId));
  }

  const user = await getAuthUser(request);

  const paramResult = videoIdParamSchema.safeParse(routeParams);
  if (!paramResult.success) {
    return NextResponse.json(
      { error: "Invalid video ID", details: paramResult.error.flatten() },
      { status: 400 }
    );
  }

  const { videoId } = paramResult.data;

  const video = await prisma.video.findFirst({
    where: { id: videoId, isDeleted: false },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          role: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!video) {
    return NextResponse.json(
      { error: user ? "Video not found" : "Unauthorized" },
      { status: user ? 404 : 401 }
    );
  }

  if (user) {
    if (!(await canAccessVideo(user, video.userId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const analysis = await prisma.analysis.findUnique({
    where: { videoId },
  });

  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found for this video" }, { status: 404 });
  }

  const isPlayerAssignee = video.user.role === "PLAYER";

  return NextResponse.json(
    toJsonSafe({
      ...analysis,
      video: {
      id: video.id,
      filename: video.filename,
      cdnUrl: video.cdnUrl,
      durationSeconds: video.durationSeconds,
      resolutionWidth: video.resolutionWidth,
      resolutionHeight: video.resolutionHeight,
      tags: parseVideoTags(video.tags),
      assignedPlayer: isPlayerAssignee
        ? {
            id: video.user.id,
            displayName: video.user.displayName,
            avatarUrl: video.user.avatarUrl,
          }
        : null,
    },
  })
  );
}
