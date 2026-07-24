export type UploadProcessingState = "analyzed" | "processing" | "failed" | "unsupported";

export const STAGE_LABELS: Record<string, string> = {
  QUEUED: "Queued",
  EXTRACTING_FRAMES: "Extracting frames",
  ACTIVITY_CLASSIFICATION: "Checking video content",
  POSE_ANALYSIS: "Pose analysis",
  SHOT_CLASSIFICATION: "Shot classification",
  GENERATING_FEEDBACK: "Generating feedback",
  COMPLETE: "Complete",
  FAILED: "Failed",
  UNSUPPORTED_CONTENT: "Not supported",
};

export function processingStateFromAnalysisStatus(
  status: string | null | undefined
): UploadProcessingState {
  if (status === "COMPLETE") return "analyzed";
  if (status === "UNSUPPORTED_CONTENT") return "unsupported";
  if (status === "FAILED") return "failed";
  return "processing";
}

export function formatUploadStatusLabel(
  state: UploadProcessingState,
  analysisStatus?: string | null
): string {
  if (state === "analyzed") return "Analyzed";
  if (state === "unsupported") return "Not batting";
  if (state === "failed") return "Failed";
  if (analysisStatus && STAGE_LABELS[analysisStatus]) {
    return "Processing (" + STAGE_LABELS[analysisStatus] + ")";
  }
  return "Processing";
}

export function toRelativeTimestamp(value: string): string {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "Just now";

  const diffMs = Date.now() - parsedDate.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return String(diffMinutes) + "m ago";

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return String(diffHours) + "h ago";

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return String(diffDays) + "d ago";
  return parsedDate.toLocaleDateString("en-GB");
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "-";
  if (seconds < 60) return String(Math.round(seconds)) + "s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return String(m) + ":" + String(s).padStart(2, "0");
}

export function formatFileSize(bytes: string | number | bigint | null | undefined): string {
  if (bytes == null) return "-";
  const n = typeof bytes === "bigint" ? Number(bytes) : Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "-";
  if (n < 1024) return String(n) + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / (1024 * 1024)).toFixed(1) + " MB";
}

export function formatResolution(
  width: number | null | undefined,
  height: number | null | undefined
): string {
  if (!width || !height) return "-";
  return String(width) + "x" + String(height);
}

export function uploadHref(videoId: string, state: UploadProcessingState): string {
  if (state === "analyzed" || state === "unsupported") return "/analysis/" + videoId;
  return "/analysis/" + videoId + "/processing";
}
