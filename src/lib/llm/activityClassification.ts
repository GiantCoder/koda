import { logGeminiRequest } from "@/src/lib/analysis/pipeline-log";
import { parseJsonObject } from "@/src/lib/llm/json-parse";
import { generateContentTextWithRetryAndFallback } from "./gemini-retry";
import { modelNameForTask } from "./gemini";

export type ActivityType = "BATTING" | "BOWLING" | "FIELDING" | "GYM" | "UNCLEAR";

export interface ActivityClassificationResult {
  activityType: ActivityType;
  /** True when a batter with a bat is visible in any sampled frame (nets, shadow batting, etc.). */
  hasBatterWithBat: boolean;
  confidence: number;
  isBatting: boolean;
  reasons: string[];
  rawResponseText: string;
  /** Activity gate could not parse model output — pipeline continues to shot classification. */
  deferredToShotClassification?: boolean;
}

const ACTIVITY_CONFIDENCE_THRESHOLD = parseFloat(
  process.env.KODA_ACTIVITY_CONFIDENCE_THRESHOLD ?? "0.65"
);

const ACTIVITY_PROMPT = `You are a cricket video content classifier for a batting-technique analysis product.

Your job is to decide whether this clip is suitable for BATTING analysis — i.e. whether a batter with a bat is visible and could be analysed.

Look carefully at ALL frames provided:

1. BATTER PRESENCE (most important):
   - Is a batter visible in ANY frame — at the striker's end, in nets, wearing pads/helmet, holding a bat, or in a batting stance?
   - The batter may be in the background, smaller, or at the far end of the pitch. Still count them.
   - Nets practice often shows BOTH a bowler (foreground) AND a batter (background). If a batter with a bat is visible, set hasBatterWithBat: true even while a bowler is delivering.

2. ACTIVITY TYPE (secondary — for logging only):
   - BOWLING = bowling-only practice with NO batter visible (solo bowler, no batsman in frame)
   - BATTING = batter practising or facing deliveries (includes nets with bowler + batter)
   - FIELDING / GYM / UNCLEAR = not batting content

CRITICAL — do NOT reject nets footage:
- A bowler delivering to a visible batter is BATTING-suitable content (hasBatterWithBat: true).
- Only set hasBatterWithBat: false when no person with a bat is visible in any frame.

Respond with JSON only, no markdown fences. Example shape:
{
  "activityType": "BATTING",
  "hasBatterWithBat": true,
  "confidence": 0.95,
  "reasons": ["Batter with pads visible at the far end of the nets"]
}

Confidence guide (for hasBatterWithBat):
- 0.9+ : Batter with bat clearly visible (pads, stance, or shot)
- 0.7–0.9 : Batter likely present but small, distant, or partially obscured
- 0.5–0.7 : Uncertain — poor quality or very brief glimpse
- < 0.5 : No batter with bat visible`;

/** Evenly sample frames, always including first, middle, and last for short clips. */
function sampleFramesForActivityGate(frames: string[], count: number): string[] {
  if (frames.length <= count) return frames;

  const indices = new Set<number>();
  indices.add(0);
  indices.add(frames.length - 1);
  indices.add(Math.floor(frames.length / 2));
  for (let i = 0; i < count; i++) {
    indices.add(Math.round((i * (frames.length - 1)) / (count - 1)));
  }

  return [...indices]
    .sort((a, b) => a - b)
    .map((idx) => frames[idx]);
}

interface ParsedActivityPayload {
  activityType?: string;
  hasBatterWithBat?: boolean;
  confidence?: number;
  reasons?: string[];
}

async function requestActivityClassification(
  imageParts: { inlineData: { mimeType: "image/jpeg"; data: string } }[],
  fullPrompt: string
): Promise<string> {
  return generateContentTextWithRetryAndFallback(
    "activity_gate",
    modelNameForTask("classification"),
    {
      contents: [
        {
          role: "user",
          parts: [...imageParts, { text: fullPrompt }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    }
  );
}

function tryParseActivityResponse(rawResponseText: string): ParsedActivityPayload | null {
  try {
    return parseJsonObject<ParsedActivityPayload>(rawResponseText);
  } catch {
    return null;
  }
}

export async function classifyActivityWithGemini(input: {
  framesBase64: string[];
  analysisId: string;
  filename?: string;
}): Promise<ActivityClassificationResult> {
  const frameBudget = Math.min(16, Math.max(12, input.framesBase64.length));
  const sampledFrames = sampleFramesForActivityGate(input.framesBase64, frameBudget);

  const imageParts = sampledFrames.map((b64) => ({
    inlineData: {
      mimeType: "image/jpeg" as const,
      data: b64,
    },
  }));

  const fullPrompt = `${ACTIVITY_PROMPT}

Video filename: ${input.filename ?? "unknown"}
Frames provided: ${sampledFrames.length} (sampled across full clip, including first/middle/last)`;

  logGeminiRequest(input.analysisId, "activity_gate", modelNameForTask("classification"), fullPrompt, {
    framesProvided: sampledFrames.length,
  });

  let rawResponseText = await requestActivityClassification(imageParts, fullPrompt);
  let parsed = tryParseActivityResponse(rawResponseText);

  if (!parsed) {
    console.warn(
      JSON.stringify({
        tag: "analysisPipeline.activityGate.parseError",
        analysisId: input.analysisId,
        attempt: 1,
        rawPreview: rawResponseText.slice(0, 500),
        rawCharLength: rawResponseText.length,
      })
    );
    rawResponseText = await requestActivityClassification(imageParts, fullPrompt);
    parsed = tryParseActivityResponse(rawResponseText);
  }

  let deferredToShotClassification = false;

  if (!parsed) {
    console.warn(
      JSON.stringify({
        tag: "analysisPipeline.activityGate.parseError",
        analysisId: input.analysisId,
        attempt: 2,
        rawPreview: rawResponseText.slice(0, 500),
        rawCharLength: rawResponseText.length,
        action: "defer_to_shot_classification",
      })
    );
    deferredToShotClassification = true;
    parsed = {
      activityType: "UNCLEAR",
      hasBatterWithBat: true,
      confidence: 0,
      reasons: [
        "Activity gate could not parse the model response; continuing to shot classification.",
      ],
    };
  }

  const validActivities: ActivityType[] = ["BATTING", "BOWLING", "FIELDING", "GYM", "UNCLEAR"];
  const rawActivity = parsed.activityType ?? "UNCLEAR";
  const activityType: ActivityType = validActivities.includes(rawActivity as ActivityType)
    ? (rawActivity as ActivityType)
    : "UNCLEAR";

  const confidence =
    typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0;

  const hasBatterWithBat =
    typeof parsed.hasBatterWithBat === "boolean"
      ? parsed.hasBatterWithBat
      : activityType === "BATTING";

  const reasons = Array.isArray(parsed.reasons)
    ? parsed.reasons.filter((r): r is string => typeof r === "string").slice(0, 3)
    : [];

  const isBatting = deferredToShotClassification
    ? true
    : hasBatterWithBat && confidence >= ACTIVITY_CONFIDENCE_THRESHOLD;

  console.log(
    JSON.stringify(
      {
        tag: "analysisPipeline.activityGate",
        analysisId: input.analysisId,
        activityType,
        hasBatterWithBat,
        confidence,
        isBatting,
        deferredToShotClassification,
        reasons,
      },
      null,
      2
    )
  );

  return {
    activityType,
    hasBatterWithBat,
    confidence,
    isBatting,
    reasons,
    rawResponseText,
    deferredToShotClassification,
  };
}
