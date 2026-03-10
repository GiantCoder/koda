import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { prisma } from "@/prisma/client";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  if (!q.trim()) {
    return NextResponse.json({ messages: [], query: q });
  }

  const participantConversations = await prisma.conversationParticipant.findMany({
    where: { userId: user.id },
    select: { conversationId: true },
  });
  const conversationIds = participantConversations.map((entry) => entry.conversationId);
  if (!conversationIds.length) {
    return NextResponse.json({ messages: [], query: q });
  }

  const messages = await prisma.message.findMany({
    where: {
      conversationId: { in: conversationIds },
      isDeleted: false,
      content: { contains: q },
    },
    orderBy: { sentAt: "desc" },
    take: 50,
    include: {
      sender: { select: { id: true, displayName: true, role: true } },
    },
  });

  return NextResponse.json({
    query: q,
    messages: messages.map((message) => ({
      id: message.id,
      conversationId: message.conversationId,
      content: message.content,
      sentAt: message.sentAt,
      sender: message.sender,
    })),
  });
}
