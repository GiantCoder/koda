import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { addClipSchema } from "../../schema";

/** POST /api/collections/[id]/clips - Add a clip to collection */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: collectionId } = await params;

  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: { userId: true },
  });

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  if (collection.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const validation = addClipSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid input", details: validation.error.errors },
      { status: 400 }
    );
  }

  const { videoId, notes } = validation.data;

  // Verify video exists and user has access
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { userId: true },
  });

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  // Check if clip already exists in collection
  const existing = await prisma.savedClip.findUnique({
    where: {
      collectionId_videoId: {
        collectionId,
        videoId,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Clip already in collection" },
      { status: 409 }
    );
  }

  const savedClip = await prisma.savedClip.create({
    data: {
      collectionId,
      videoId,
      notes: notes ?? null,
    },
    include: {
      video: {
        select: {
          id: true,
          filename: true,
          cdnUrl: true,
          durationSeconds: true,
          uploadedAt: true,
        },
      },
    },
  });

  // Update collection's updatedAt timestamp
  await prisma.collection.update({
    where: { id: collectionId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json(
    {
      clip: {
        id: savedClip.id,
        videoId: savedClip.video.id,
        filename: savedClip.video.filename,
        cdnUrl: savedClip.video.cdnUrl,
        durationSeconds: savedClip.video.durationSeconds,
        uploadedAt: savedClip.video.uploadedAt.toISOString(),
        savedAt: savedClip.savedAt.toISOString(),
        notes: savedClip.notes,
      },
    },
    { status: 201 }
  );
}
