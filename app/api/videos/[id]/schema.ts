import { z } from "zod";

export const patchVideoSchema = z
  .object({
    /** Player to assign the video to. `null` clears assignment (Unassigned). */
    assigneeUserId: z.string().uuid().nullable().optional(),
    /** Replace the full tags list. */
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  })
  .refine((body) => body.assigneeUserId !== undefined || body.tags !== undefined, {
    message: "Provide assigneeUserId and/or tags",
  });

export type PatchVideoInput = z.infer<typeof patchVideoSchema>;

export function parseVideoTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
}
