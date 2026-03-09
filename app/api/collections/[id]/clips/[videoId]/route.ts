import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";

/** DELETE /api/collections/[id]/clips/[videoId] - Remove clip from collection */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; videoId: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: collectionId, videoId } = await params;

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

  const savedClip = await prisma.savedClip.findUnique({
    where: {
      collectionId_videoId: {
        collectionId,
        videoId,
      },
    },
  });

  if (!savedClip) {
    return NextResponse.json({ error: "Clip not found in collection" }, { status: 404 });
  }

  await prisma.savedClip.delete({
    where: {
      collectionId_videoId: {
        collectionId,
        videoId,
      },
    },
  });

  // Update collection's updatedAt timestamp
  await prisma.collection.update({
    where: { id: collectionId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
