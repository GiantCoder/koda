import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  const take = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.floor(limitParam), 1), 100)
    : 20;

  let visibleUserIds: string[] = [user.id];
  if (user.role === "ADMIN") {
    visibleUserIds = [];
  } else if (user.role === "COACH") {
    const squadMembers = await prisma.squadMember.findMany({
      where: { squad: { coachId: user.id } },
      select: { userId: true },
    });
    visibleUserIds = Array.from(new Set([user.id, ...squadMembers.map((member) => member.userId)]));
  } else if (user.role === "PARENT") {
    const linkedChildren = await prisma.guardianLink.findMany({
      where: { parentId: user.id },
      select: { childId: true },
    });
    visibleUserIds = Array.from(new Set([user.id, ...linkedChildren.map((link) => link.childId)]));
  }

  const videos = await prisma.video.findMany({
    where: {
      isDeleted: false,
      ...(user.role === "ADMIN" ? {} : { userId: { in: visibleUserIds } }),
    },
    orderBy: { uploadedAt: "desc" },
    take,
    select: {
      id: true,
      userId: true,
      filename: true,
      originalFormat: true,
      fileSizeBytes: true,
      durationSeconds: true,
      resolutionWidth: true,
      resolutionHeight: true,
      uploadedAt: true,
      cdnUrl: true,
      user: {
        select: {
          displayName: true,
        },
      },
      analysis: {
        select: {
          id: true,
          status: true,
          errorMessage: true,
          updatedAt: true,
        },
      },
    },
  });

  return NextResponse.json({
    videos: videos.map((v) => ({
      id: v.id,
      userId: v.userId,
      filename: v.filename,
      originalFormat: v.originalFormat,
      fileSizeBytes: BigInt.prototype.toString.call(v.fileSizeBytes),
      durationSeconds: v.durationSeconds,
      resolutionWidth: v.resolutionWidth,
      resolutionHeight: v.resolutionHeight,
      uploadedAt: v.uploadedAt,
      cdnUrl: v.cdnUrl,
      assignedUserDisplayName: v.user.displayName,
      analysis: v.analysis
        ? {
            id: v.analysis.id,
            status: v.analysis.status,
            errorMessage: v.analysis.errorMessage,
            updatedAt: v.analysis.updatedAt,
          }
        : null,
      processingState:
        v.analysis?.status === "COMPLETE"
          ? "analyzed"
          : v.analysis?.status === "FAILED"
            ? "failed"
            : "processing",
    })),
  });
}
