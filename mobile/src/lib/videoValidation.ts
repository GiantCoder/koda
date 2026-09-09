/**
 * Mirrors app/lib/video-validators.ts's constants and validation logic, so
 * mobile rejects the same file types/sizes web does before even attempting
 * an upload. The backend itself doesn't enforce these (same as web -- it's
 * client-side-only validation on both clients), so this is about a fast,
 * friendly error rather than a security boundary.
 */
export const ACCEPTED_EXTENSIONS = [".mp4", ".mov", ".avi", ".hevc", ".mkv"];
export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500MB

export function validateVideoAsset(fileName: string, fileSizeBytes: number | undefined): { valid: boolean; error?: string } {
  if (fileSizeBytes != null && fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: "File must be 500MB or less" };
  }
  const hasValidExtension = ACCEPTED_EXTENSIONS.some((ext) => fileName.toLowerCase().endsWith(ext));
  if (!hasValidExtension) {
    return { valid: false, error: "Accepted formats: MP4, MOV, AVI, HEVC, MKV" };
  }
  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const EXTENSION_MIME_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".hevc": "video/hevc",
  ".mkv": "video/x-matroska",
};

/** expo-image-picker doesn't always report mimeType (camera recordings on
 * some Android devices omit it) -- fall back to guessing from the filename
 * extension so the upload's multipart Content-Type is never empty. */
export function guessMimeType(fileName: string, reportedMimeType?: string | null): string {
  if (reportedMimeType) return reportedMimeType;
  const ext = ACCEPTED_EXTENSIONS.find((e) => fileName.toLowerCase().endsWith(e));
  return ext ? EXTENSION_MIME_TYPES[ext] : "video/mp4";
}

