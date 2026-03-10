import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";

function canManageShares(role: string): boolean {
  return role === "COACH" || role === "ADMIN";
}

/** DELETE /api/collections/[id]/shares/[userId] - Remove a user share from collection */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: collectionId, userId } = await params;
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

  await prisma.collectionShare.deleteMany({
    where: {
      collectionId,
      userId,
    },
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
