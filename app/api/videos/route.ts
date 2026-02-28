import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const videos = await prisma.video.findMany({
    where: { userId: user.id, isDeleted: false },
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      filename: true,
      originalFormat: true,
      fileSizeBytes: true,
      durationSeconds: true,
      resolutionWidth: true,
      resolutionHeight: true,
      uploadedAt: true,
      cdnUrl: true,
    },
  });

  return NextResponse.json({
    videos: videos.map((v) => ({
      ...v,
      fileSizeBytes: BigInt.prototype.toString.call(v.fileSizeBytes),
    })),
  });
}
