import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { sendMessageSchema, paginationSchema } from "../../schema";
import { MessageVisibility } from "@prisma/client";
import { getMessageVisibilityForRecipient, getParentVisibilityMetadata } from "@/lib/messaging-safeguarding";
import { z } from "zod";
import { redis } from "@/src/lib/redis";
import { notifyUser } from "@/lib/notifications";

const idParamSchema = z.object({ id: z.string().uuid() });

/**
 * GET /api/conversations/:id/messages
 * Get messages for a conversation (paginated). User must be a participant.
 */
export async function GET(
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

  const { searchParams } = new URL(request.url);
  const pagination = paginationSchema.safeParse({
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
  });
  const { limit, offset } = pagination.success ? pagination.data : { limit: 20, offset: 0 };

  const { id: conversationId } = paramResult.data;

  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: { conversationId, userId: user.id },
    },
  });

  if (!participant) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId, isDeleted: false },
      orderBy: { sentAt: "desc" },
      skip: offset,
      take: limit,
      include: {
        sender: {
          select: { id: true, displayName: true, role: true },
        },
      },
    }),
    prisma.message.count({ where: { conversationId, isDeleted: false } }),
  ]);

  const otherParticipant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId: { not: user.id } },
    include: { user: { select: { dateOfBirth: true } } },
  });
  const recipient = otherParticipant?.user ?? null;

  const items = messages.map((m) => {
    const parentMeta = getParentVisibilityMetadata(recipient, m.visibility);
    return {
      id: m.id,
      content: m.content,
      senderId: m.sender.id,
      senderDisplayName: m.sender.displayName,
      sentAt: m.sentAt,
      visibility: m.visibility,
      parentVisibility: parentMeta,
    };
  });

  return NextResponse.json({
    messages: items,
    pagination: { limit, offset, total },
  });
}

/**
 * POST /api/conversations/:id/messages
 * Send a message. Safeguarding: if recipient is under 18, visibility = PARENT_VISIBLE.
 */
export async function POST(
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id: conversationId } = paramResult.data;
  const { content } = parsed.data;

  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: { conversationId, userId: user.id },
    },
  });

  if (!participant) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const otherParticipants = await prisma.conversationParticipant.findMany({
    where: { conversationId, userId: { not: user.id } },
    include: { user: { select: { dateOfBirth: true } } },
  });
  const anyMinorRecipient = otherParticipants.some((p) =>
    getMessageVisibilityForRecipient(p.user) === MessageVisibility.PARENT_VISIBLE
  );
  const visibility = anyMinorRecipient ? MessageVisibility.PARENT_VISIBLE : MessageVisibility.STANDARD;
  const firstRecipient = otherParticipants[0]?.user ?? null;

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: user.id,
      content,
      visibility,
    },
    include: {
      sender: {
        select: { id: true, displayName: true, role: true },
      },
    },
  });

  const parentMeta = getParentVisibilityMetadata(firstRecipient, visibility);

  await redis.publish(
    `conversation:${conversationId}`,
    JSON.stringify({
      type: "message_created",
      conversationId,
      message: {
        id: message.id,
        content: message.content,
        senderId: message.sender.id,
        senderDisplayName: message.sender.displayName,
        sentAt: message.sentAt,
        visibility: message.visibility,
      },
    })
  );

  // Mobile Phase 5 addition: sending a message never created a Notification
  // row for the recipient(s) before this -- NEW_MESSAGE was a dead enum
  // value with nothing generating it, so the (real, working) notifications
  // list would stay permanently silent for messaging. Small additive change,
  // same spirit as earlier phases' small additive backend changes.
  await Promise.all(
    otherParticipants.map((p) =>
      notifyUser({
        userId: p.userId,
        type: "NEW_MESSAGE",
        title: `New message from ${message.sender.displayName}`,
        message: content.length > 140 ? `${content.slice(0, 140)}…` : content,
        actionUrl: `/messages/${conversationId}`,
        metadata: { conversationId, messageId: message.id },
      })
    )
  );

  return NextResponse.json({
    id: message.id,
    content: message.content,
    senderId: message.sender.id,
    senderDisplayName: message.sender.displayName,
    sentAt: message.sentAt,
    visibility: message.visibility,
    parentVisibility: parentMeta,
  });
}
