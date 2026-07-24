import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { canAccessVideo } from "@/src/lib/videos/access";

const bodySchema = z.object({
  videoIds: z.array(z.string().uuid()).min(1).max(100),
});

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const videos = await prisma.video.findMany({
    where: { id: { in: parsed.data.videoIds }, isDeleted: false },
    select: { id: true, userId: true },
  });

  const allowedIds: string[] = [];
  for (const video of videos) {
    if (await canAccessVideo(user, video.userId)) {
      allowedIds.push(video.id);
    }
  }

  if (allowedIds.length === 0) {
    return NextResponse.json(
      { error: "No videos found or access denied" },
      { status: 404 }
    );
  }

  await prisma.video.updateMany({
    where: { id: { in: allowedIds } },
    data: { isDeleted: true, deletedAt: new Date() },
  });

  return NextResponse.json({
    deletedCount: allowedIds.length,
    skippedCount: parsed.data.videoIds.length - allowedIds.length,
  });
}
