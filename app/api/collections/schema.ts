import { z } from "zod";

/** POST /api/collections - Create a new collection */
export const createCollectionSchema = z.object({
  name: z.string().min(1, "Collection name is required").max(100, "Name too long"),
  description: z.string().max(500, "Description too long").optional(),
  isPublic: z.boolean().default(false),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

/** PUT /api/collections/[id] - Update a collection */
export const updateCollectionSchema = z.object({
  name: z.string().min(1, "Collection name is required").max(100, "Name too long").optional(),
  description: z.string().max(500, "Description too long").optional().nullable(),
  isPublic: z.boolean().optional(),
});

export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;

/** POST /api/collections/[id]/clips - Add a clip to a collection */
export const addClipSchema = z.object({
  videoId: z.string().uuid("Invalid video ID"),
  notes: z.string().max(500, "Notes too long").optional(),
});

export type AddClipInput = z.infer<typeof addClipSchema>;

/** POST /api/collections/[id]/shares - Share collection with a user */
export const shareCollectionSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

export type ShareCollectionInput = z.infer<typeof shareCollectionSchema>;
