/**
 * Shared entry point for creating a Notification row. Both existing
 * call sites (messages route, player-card route) create the row directly
 * with `prisma.notification.create` -- refactored here in Phase 8 so a
 * push notification (see push.ts) rides along automatically with every
 * Notification, present and future, rather than needing every call site
 * to remember to also call sendPushToUser(). New ANALYSIS_COMPLETE call
 * site added in workers/analysisWorker.ts uses this too.
 */
import { NotificationType, type Prisma } from "@prisma/client";
import { prisma } from "@/prisma/client";
import { sendPushToUser } from "./push";

export interface NotifyUserInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Prisma.InputJsonValue;
}

export async function notifyUser(input: NotifyUserInput): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl,
      metadata: input.metadata,
    },
  });

  // Best-effort, never blocks/fails the caller -- see sendPushToUser.
  await sendPushToUser(input.userId, {
    title: input.title,
    body: input.message,
    data: input.actionUrl ? { actionUrl: input.actionUrl } : undefined,
  });
}
