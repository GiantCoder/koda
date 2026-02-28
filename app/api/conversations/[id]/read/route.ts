import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { z } from "zod";

const idParamSchema = z.object({ id: z.string().uuid() });

/**
 * PUT /api/conversations/:id/read
 * Mark conversation as read for the authenticated user.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paramResult = idParamSchema.safeParse(await params);
  if (!paramResult.success) {
    return NextResponse.json({ error: "Invalid conversation ID" }, { status: 400 });
  }

  const { id: conversationId } = paramResult.data;

  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: { conversationId, userId: user.id },
    },
  });

  if (!participant) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  await prisma.conversationParticipant.update({
    where: {
      conversationId_userId: { conversationId, userId: user.id },
    },
    data: { lastReadAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
