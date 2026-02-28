import { z } from "zod";

export const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime", // MOV
  "video/x-msvideo", // AVI
  "video/hevc", // HEVC
  "video/x-matroska", // MKV
];

export const ACCEPTED_EXTENSIONS = [".mp4", ".mov", ".avi", ".hevc", ".mkv"];

export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500MB

export const videoUploadSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(1000).optional(),
  file: z
    .instanceof(File)
    .refine((f) => f.size <= MAX_FILE_SIZE_BYTES, "File must be 500MB or less")
    .refine(
      (f) => ACCEPTED_VIDEO_TYPES.includes(f.type) || ACCEPTED_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext)),
      "Accepted formats: MP4, MOV, AVI, HEVC, MKV"
    ),
});

export type VideoUploadFormData = z.infer<typeof videoUploadSchema>;

export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: "File must be 500MB or less" };
  }
  const hasValidType =
    ACCEPTED_VIDEO_TYPES.includes(file.type) ||
    ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
  if (!hasValidType) {
    return { valid: false, error: "Accepted formats: MP4, MOV, AVI, HEVC, MKV" };
  }
  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
