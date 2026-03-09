import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { z } from "zod";

const idParamSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const parsedParams = idParamSchema.safeParse(await params);
  
  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid clip ID" },
      { status: 400 }
    );
  }

  const { id } = parsedParams.data;

  try {
    const video = await prisma.video.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
        analysis: true,
      },
    });

    if (!video) {
      return NextResponse.json(
        { error: "Clip not found" },
        { status: 404 }
      );
    }

    if (!video.analysis || video.analysis.status !== "COMPLETE") {
      return NextResponse.json(
        { error: "Analysis not available for this clip" },
        { status: 404 }
      );
    }

    // Get related clips (same shot type)
    const relatedClips = await prisma.video.findMany({
      where: {
        id: { not: id },
        isDeleted: false,
      },
      include: {
        user: {
          select: {
            displayName: true,
          },
        },
        analysis: true,
      },
      take: 4,
      orderBy: { uploadedAt: "desc" },
    }).then((videos) => 
      videos.filter((v) => v.analysis && v.analysis.status === "COMPLETE" && v.analysis.shotType === video.analysis?.shotType)
    );

    const formattedClip = {
      id: video.id,
      title: video.filename,
      description: `Textbook ${video.analysis.shotType?.replace(/_/g, " ").toLowerCase()} with excellent timing and balance`,
      videoUrl: `/api/videos/${video.id}/stream`,
      thumbnail: `/api/videos/${video.id}/thumbnail`,
      duration: video.durationSeconds,
      grade: video.analysis.gradeLetter || "N/A",
      gradeScore: video.analysis.gradeOverall || 0,
      shotType: video.analysis.shotType || "UNKNOWN",
      shotConfidence: video.analysis.shotConfidence || 0,
      views: 124,
      likes: 37,
      uploadedBy: video.user.displayName,
      uploadedById: video.user.id,
      uploadedByAvatar: null,
      uploadedAt: video.uploadedAt.toISOString(),
      analysis: {
        scores: {
          stanceBalance: video.analysis.scoreBalance || 0,
          batPathFollowThrough: video.analysis.scoreFollowThrough || 0,
        },
        coachingTips: video.analysis.coachingTips || [],
      },
      relatedClips: relatedClips.map((clip) => ({
        id: clip.id,
        title: clip.filename,
        thumbnail: `/api/videos/${clip.id}/thumbnail`,
        duration: clip.durationSeconds,
        shotType: clip.analysis?.shotType || "UNKNOWN",
        uploadedBy: clip.user.displayName,
      })),
    };

    return NextResponse.json(formattedClip);
  } catch (error) {
    console.error("Error fetching clip details:", error);
    return NextResponse.json(
      { error: "Failed to fetch clip details" },
      { status: 500 }
    );
  }
}
