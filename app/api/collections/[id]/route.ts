import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { updateCollectionSchema } from "../schema";

/** GET /api/collections/[id] - Get collection details with all clips */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const collection = await prisma.collection.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
        },
      },
      shares: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      },
      savedClips: {
        orderBy: { savedAt: "desc" },
        include: {
          video: {
            select: {
              id: true,
              filename: true,
              cdnUrl: true,
              durationSeconds: true,
              uploadedAt: true,
              analysis: {
                select: {
                  shotType: true,
                  gradeLetter: true,
                  gradeOverall: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  const canAccessCollection =
    user.role === "COACH" ||
    user.role === "ADMIN" ||
    collection.userId === user.id ||
    collection.shares.some((share) => share.userId === user.id);

  if (!canAccessCollection) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    collection: {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      isPublic: collection.isPublic,
      ownerId: collection.user.id,
      ownerName: collection.user.displayName,
      canEdit: collection.userId === user.id,
      shareCount: collection.shares.length,
      isSharedWithMe: collection.userId !== user.id && collection.shares.some((share) => share.userId === user.id),
      createdAt: collection.createdAt.toISOString(),
      updatedAt: collection.updatedAt.toISOString(),
      clips: collection.savedClips.map((clip) => ({
        id: clip.id,
        videoId: clip.video.id,
        filename: clip.video.filename,
        cdnUrl: clip.video.cdnUrl,
        durationSeconds: clip.video.durationSeconds,
        uploadedAt: clip.video.uploadedAt.toISOString(),
        savedAt: clip.savedAt.toISOString(),
        notes: clip.notes,
        analysis: clip.video.analysis
          ? {
              shotType: clip.video.analysis.shotType,
              gradeLetter: clip.video.analysis.gradeLetter,
              gradeOverall: clip.video.analysis.gradeOverall,
            }
          : null,
      })),
    },
  });
}

/** PUT /api/collections/[id] - Update collection */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const collection = await prisma.collection.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  if (collection.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const validation = updateCollectionSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid input", details: validation.error.errors },
      { status: 400 }
    );
  }

  const updated = await prisma.collection.update({
    where: { id },
    data: validation.data,
  });

  return NextResponse.json({
    collection: {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      isPublic: updated.isPublic,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

/** DELETE /api/collections/[id] - Delete collection */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const collection = await prisma.collection.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  if (collection.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.collection.delete({
    where: { id },
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
