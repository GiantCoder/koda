import { uploadToStorage } from "@/src/lib/storage";

export interface FrameManifestEntry {
  index: number;
  timestampMs: number;
  storageKey: string;
}

/**
 * Upload already-extracted frames to storage and return a manifest.
 * Storage layout mirrors pose data: frames/{analysisId}/frame-{index}.jpg
 */
export async function persistAnalysisFrames(
  analysisId: string,
  framesBase64: string[],
  sampleFps: number
): Promise<FrameManifestEntry[]> {
  const manifest: FrameManifestEntry[] = [];
  for (let index = 0; index < framesBase64.length; index++) {
    const storageKey = `frames/${analysisId}/frame-${String(index).padStart(4, "0")}.jpg`;
    const buffer = Buffer.from(framesBase64[index], "base64");
    await uploadToStorage(storageKey, buffer, "image/jpeg");
    const timestampMs = Math.round((index / sampleFps) * 1000);
    manifest.push({ index, timestampMs, storageKey });
  }
  return manifest;
}
