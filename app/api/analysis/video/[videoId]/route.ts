import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { z } from "zod";

const videoIdParamSchema = z.object({
  videoId: z.string().uuid(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paramResult = videoIdParamSchema.safeParse(await params);
  if (!paramResult.success) {
    return NextResponse.json(
      { error: "Invalid video ID", details: paramResult.error.flatten() },
      { status: 400 }
    );
  }

  const { videoId } = paramResult.data;

  const video = await prisma.video.findFirst({
    where: { id: videoId, userId: user.id, isDeleted: false },
  });

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const analysis = await prisma.analysis.findUnique({
    where: { videoId },
  });

  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found for this video" }, { status: 404 });
  }

  return NextResponse.json(analysis);
}
