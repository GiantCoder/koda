import { z } from "zod";
import { NotificationType } from "@prisma/client";

export const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1).max(255),
  message: z.string().min(1),
  actionUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const updateNotificationSchema = z.object({
  isRead: z.boolean().optional(),
});
