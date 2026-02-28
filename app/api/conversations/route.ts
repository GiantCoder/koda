import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { createConversationSchema } from "./schema";
import { MessageVisibility } from "@prisma/client";
import { getMessageVisibilityForRecipient, getParentVisibilityMetadata } from "@/lib/messaging-safeguarding";

/**
 * GET /api/conversations
 * List conversations for the authenticated user.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const participants = await prisma.conversationParticipant.findMany({
    where: { userId: user.id },
    include: {
      conversation: {
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  email: true,
                  dateOfBirth: true,
                  role: true,
                },
              },
            },
          },
          messages: {
            where: { isDeleted: false },
            orderBy: { sentAt: "desc" },
            take: 1,
            select: {
              id: true,
              content: true,
              sentAt: true,
              visibility: true,
              senderId: true,
            },
          },
        },
      },
    },
  });

  const conversations = participants.map((p) => {
    const conv = p.conversation;
    const otherParticipants = conv.participants.filter((x) => x.userId !== user.id);
    const lastMessage = conv.messages[0];
    const recipient = otherParticipants[0]?.user;
    const parentMeta = getParentVisibilityMetadata(
      recipient ?? null,
      lastMessage?.visibility ?? MessageVisibility.STANDARD
    );

    return {
      id: conv.id,
      subject: conv.subject,
      createdAt: conv.createdAt,
      lastReadAt: p.lastReadAt,
      participants: conv.participants.map((x) => ({
        id: x.user.id,
        displayName: x.user.displayName,
        role: x.user.role,
      })),
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            content: lastMessage.content,
            sentAt: lastMessage.sentAt,
            senderId: lastMessage.senderId,
            visibility: lastMessage.visibility,
            parentVisibility: parentMeta,
          }
        : null,
      parentVisibility: parentMeta,
    };
  });

  return NextResponse.json({ conversations });
}

/**
 * POST /api/conversations
 * Create a new conversation. Safeguarding: if any participant is under 18,
 * messages are marked PARENT_VISIBLE.
 */
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

  const parsed = createConversationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { participantIds, subject } = parsed.data;
  const allParticipantIds = [user.id, ...participantIds.filter((id) => id !== user.id)];
  const uniqueIds = [...new Set(allParticipantIds)];

  if (uniqueIds.length < 2) {
    return NextResponse.json(
      { error: "At least one other participant is required" },
      { status: 400 }
    );
  }

  const otherUsers = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, dateOfBirth: true },
  });

  const recipientIds = uniqueIds.filter((id) => id !== user.id);
  const anyMinorRecipient = recipientIds.some((rid) => {
    const u = otherUsers.find((x) => x.id === rid);
    return u && getMessageVisibilityForRecipient(u) === MessageVisibility.PARENT_VISIBLE;
  });
  const visibility = anyMinorRecipient ? MessageVisibility.PARENT_VISIBLE : MessageVisibility.STANDARD;
  const firstRecipient = recipientIds.length > 0
    ? otherUsers.find((u) => u.id === recipientIds[0])
    : null;

  const conversation = await prisma.conversation.create({
    data: {
      subject: subject ?? null,
      participants: {
        create: uniqueIds.map((userId) => ({
          userId,
        })),
      },
    },
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, displayName: true, role: true },
          },
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: visibility === MessageVisibility.PARENT_VISIBLE ? "conversation_created_minor" : "conversation_created",
      entityType: "Conversation",
      entityId: conversation.id,
      metadata: { participantIds: uniqueIds, visibility },
    },
  });

  const parentMeta = getParentVisibilityMetadata(firstRecipient ?? null, visibility);

  return NextResponse.json({
    id: conversation.id,
    subject: conversation.subject,
    createdAt: conversation.createdAt,
    participants: conversation.participants.map((p) => ({
      id: p.user.id,
      displayName: p.user.displayName,
      role: p.user.role,
    })),
    parentVisibility: parentMeta,
  });
}
