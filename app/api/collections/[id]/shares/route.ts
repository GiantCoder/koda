import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { shareCollectionSchema } from "../../schema";

function canManageShares(role: string): boolean {
  return role === "COACH" || role === "ADMIN";
}

/** GET /api/collections/[id]/shares - List users collection is shared with */
export async function GET(
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

  const isOwner = collection.userId === user.id;
  if (!isOwner && !canManageShares(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const shares = await prisma.collectionShare.findMany({
    where: { collectionId },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({
    shares: shares.map((share) => ({
      userId: share.user.id,
      displayName: share.user.displayName,
      email: share.user.email,
      role: share.user.role,
      createdAt: share.createdAt.toISOString(),
    })),
  });
}

/** POST /api/collections/[id]/shares - Share collection with a specific user */
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

  const isOwner = collection.userId === user.id;
  if (!isOwner && !canManageShares(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const validation = shareCollectionSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid input", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const { userId } = validation.data;
  if (userId === collection.userId) {
    return NextResponse.json(
      { error: "Cannot share collection with the owner." },
      { status: 400 }
    );
  }

  const recipient = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true },
  });
  if (!recipient || !recipient.isActive) {
    return NextResponse.json({ error: "Recipient user not found." }, { status: 404 });
  }

  try {
    await prisma.collectionShare.create({
      data: {
        collectionId,
        userId,
        sharedByUserId: user.id,
      },
    });
  } catch (error) {
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2002") {
      return NextResponse.json({ error: "Collection already shared with this user." }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
