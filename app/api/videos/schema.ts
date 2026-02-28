import { z } from "zod";

/** POST /api/videos/upload/init - initialise tus chunked upload session */
export const uploadInitSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  fileSizeBytes: z.number().int().positive("File size must be positive"),
  userId: z.string().uuid().optional(), // optional; server uses auth user if omitted
});

export type UploadInitInput = z.infer<typeof uploadInitSchema>;
