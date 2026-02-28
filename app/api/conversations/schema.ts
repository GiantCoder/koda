import { z } from "zod";

/** POST /api/conversations - create conversation */
export const createConversationSchema = z.object({
  participantIds: z.array(z.string().uuid()).min(1).max(10),
  subject: z.string().max(500).optional(),
});

/** POST /api/conversations/:id/messages - send message */
export const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

/** Pagination query params */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
