import type { PoseEstimateResponse } from "./mediapipe-types";

function getBaseUrl(): string {
  const raw = process.env.MEDIAPIPE_SERVICE_URL ?? "http://127.0.0.1:8101";
  return raw.replace(/\/$/, "");
}

export const MEDIAPIPE_FRAMES_PER_BATCH = 14;

/**
 * POST /pose with base64 JPEG frames. Batches if the payload would be huge.
 */
export async function estimatePoseFromFrames(input: {
  framesBase64: string[];
  width: number;
  height: number;
  fps: number;
  /** Correlates MediaPipe batch logs with an analysis job (no PII). */
  analysisId?: string;
}): Promise<PoseEstimateResponse> {
  const maxPerBatch = MEDIAPIPE_FRAMES_PER_BATCH;
  const allLandmarks: PoseEstimateResponse["landmarks"] = [];
  let totalMs = 0;
  let bbox: PoseEstimateResponse["batsman_bbox"];
  let batchIndex = 0;

  for (let offset = 0; offset < input.framesBase64.length; offset += maxPerBatch) {
    const chunk = input.framesBase64.slice(offset, offset + maxPerBatch);
    const body = {
      frames: chunk,
      frameCount: chunk.length,
      videoMetadata: {
        width: input.width || 640,
        height: input.height || 480,
        fps: input.fps || 10,
        cameraDistance: "17-22m",
        cameraAngle: "behind_stumps",
      },
    };

    const serialized = JSON.stringify(body);
    const base64PayloadChars = chunk.reduce((sum, b64) => sum + b64.length, 0);

    if (input.analysisId) {
      console.log(
        JSON.stringify(
          {
            tag: "analysisPipeline.mediapipe.batch",
            analysisId: input.analysisId,
            batchIndex,
            frameOffset: offset,
            framesInBatch: chunk.length,
            approxRequestBodyChars: serialized.length,
            approxBase64CharsInBatch: base64PayloadChars,
            videoMetadata: body.videoMetadata,
          },
          null,
          2
        )
      );
    }

    const res = await fetch(`${getBaseUrl()}/pose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: serialized,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`MediaPipe /pose ${res.status}: ${text || res.statusText}`);
    }

    const json = (await res.json()) as PoseEstimateResponse;
    totalMs += json.processingMs ?? 0;

    if (input.analysisId) {
      console.log(
        JSON.stringify(
          {
            tag: "analysisPipeline.mediapipe.batchResponse",
            analysisId: input.analysisId,
            batchIndex,
            landmarksInBatch: json.landmarks.length,
            processingMsBatch: json.processingMs ?? null,
            batsmanBbox: json.batsman_bbox ?? null,
          },
          null,
          2
        )
      );
    }
    batchIndex += 1;
    if (json.batsman_bbox) {
      bbox = json.batsman_bbox;
    }
    for (const lm of json.landmarks) {
      const globalIdx = offset + lm.frameIndex;
      allLandmarks.push({
        ...lm,
        frameIndex: globalIdx,
        timestamp: Math.round((globalIdx / Math.max(input.fps, 0.01)) * 1000) / 1000,
      });
    }
  }

  if (allLandmarks.length === 0) {
    throw new Error("MediaPipe returned no pose landmarks");
  }

  return {
    landmarks: allLandmarks,
    batsman_bbox: bbox,
    processingMs: totalMs,
  };
}
