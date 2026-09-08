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
        type: "summary",
        title: "B — cover drive",
        description:
          "At 0:58 your weight is still stacked over the back hip — transfer earlier so the head is over the ball at contact.",
      },
    ],
    technicalFeedback: [
      {
        dimension: "backlift",
        score: scoreBacklift,
        diagnosis: "Backlift height looks usable for a cover drive; keep the hands high into the slot.",
        timestampSeconds: 0.4,
        evidence: "rightWrist height pre-stride",
        drill: "Shadow-drive with a pause at the top of the backlift.",
        confidence: "medium",
      },
      {
        dimension: "weightTransfer",
        score: scoreWeightTransfer,
        diagnosis:
          "At 0:58 (front-foot plant), weight is still stacked over the back hip — the drive finishes upright and late.",
        timestampSeconds: 0.58,
        evidence: "hip stack at plant",
        drill: "Step-and-drive focusing on early front-knee flex.",
        confidence: "high",
      },
      {
        dimension: "headPosition",
        score: scoreHeadPosition,
        diagnosis: "Head drifts slightly off the ball line through contact.",
        timestampSeconds: 0.7,
        evidence: "nose vs front ankle",
        drill: "Hold a still head over a tee ball for 10 reps.",
        confidence: "medium",
      },
      {
        dimension: "followThrough",
        score: scoreFollowThrough,
        diagnosis: "Follow-through finishes high and toward cover — good extension after contact.",
        timestampSeconds: 0.9,
        evidence: "wrist path post-contact",
        drill: "Finish with the bat pointing to cover every repetition.",
        confidence: "high",
      },
      {
        dimension: "timing",
        score: scoreTiming,
        diagnosis: "Contact looks a touch early relative to front-foot brace.",
        timestampSeconds: 0.65,
        evidence: "wrist vs plant timing",
        drill: "Use a ball-on-string to practice waiting an extra beat.",
        confidence: "medium",
      },
      {
        dimension: "balance",
        score: scoreBalance,
        diagnosis: "Balance through contact is mostly stable.",
        timestampSeconds: 0.7,
        evidence: "head over base",
        drill: "Hold the finish for two seconds after each drive.",
        confidence: "high",
      },
      {
        dimension: "footwork",
        score: scoreFootwork,
        diagnosis: "Front-foot stride is purposeful; check it lands under the head.",
        timestampSeconds: 0.55,
        evidence: "leftAnkle plant",
        drill: "Cone stride drill: land soft and still before swinging.",
        confidence: "medium",
      },
      {
        dimension: "shotSelection",
        score: scoreShotSelection,
        diagnosis: "Cover drive selection matches a full length — appropriate option.",
        timestampSeconds: null,
        evidence: "shot context",
        drill: "Call the length before playing in throw-downs.",
        confidence: "low",
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
