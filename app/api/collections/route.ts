import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { createCollectionSchema } from "./schema";

/** GET /api/collections - List user's collections with clip counts */
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const collections = await prisma.collection.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { savedClips: true },
      },
      savedClips: {
        take: 3,
        orderBy: { savedAt: "desc" },
        include: {
          video: {
            select: {
              id: true,
              filename: true,
              cdnUrl: true,
              uploadedAt: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    collections: collections.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      isPublic: c.isPublic,
      clipCount: c._count.savedClips,
      thumbnails: c.savedClips.map((clip) => ({
        videoId: clip.video.id,
        filename: clip.video.filename,
        cdnUrl: clip.video.cdnUrl,
      })),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
  });
}

/** POST /api/collections - Create a new collection */
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const validation = createCollectionSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid input", details: validation.error.errors },
      { status: 400 }
    );
  }

  const { name, description, isPublic } = validation.data;

  const collection = await prisma.collection.create({
    data: {
      userId: user.id,
      name,
      description: description ?? null,
      isPublic: isPublic ?? false,
    },
  });

  return NextResponse.json(
    {
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        isPublic: collection.isPublic,
        createdAt: collection.createdAt.toISOString(),
        updatedAt: collection.updatedAt.toISOString(),
      },
    },
    { status: 201 }
  );
}
