import { logGeminiRequest } from "@/src/lib/analysis/pipeline-log";
import { parseJsonObject } from "@/src/lib/llm/json-parse";
import { generateContentTextWithRetryAndFallback } from "./gemini-retry";
import { modelNameForTask } from "./gemini";
import {
  DELIVERY_TYPE_PROMPT_UNION,
  isValidBowlingArm,
  isValidBowlingType,
  isValidDeliveryType,
  type BowlingArmValue,
  type BowlingTypeValue,
  type DeliveryTypeValue,
} from "@/src/lib/cricket/bowling-types";

export interface BowlingClassificationResult {
  bowlingArm: BowlingArmValue;
  bowlingType: BowlingTypeValue;
  deliveryType: DeliveryTypeValue;
  confidence: number;
  reasons: string[];
  noBowlerVisible: boolean;
  rawResponseText: string;
}

interface ParsedBowlingPayload {
  bowlingArm?: string;
  bowlingType?: string;
  deliveryType?: string;
  confidence?: number;
  reasons?: string[];
  noBowlerVisible?: boolean;
}

const BOWLING_CLASSIFICATION_PROMPT = `You are a cricket bowling action classifier. You have access to video frames AND optionally a pose landmark timeline.

IMPORTANT — verify a bowling action first:
Before classifying, confirm a bowler is visible delivering a ball (run-up, delivery stride, release, follow-through — a full or partial action).
If you cannot confirm this, respond with:
{ "bowlingArm": "UNKNOWN", "bowlingType": "UNKNOWN", "deliveryType": "UNKNOWN", "confidence": 0.0, "reasons": ["No bowling action visible in frames"], "noBowlerVisible": true }

BOWLING ARM: is this a right-arm or left-arm bowler? Judge from which hand releases the ball.

BOWLING TYPE (pace vs spin):
- PACE: longer run-up, faster arm speed, seam-up grip, aims for pace/swing/seam movement.
- SPIN: short or no run-up, slower loop, wrist or finger action imparting rotation, often bowled from close to the stumps.

DELIVERY TYPE (best effort — lower confidence is expected and fine here):
- For PACE: classify length/type as one of GOOD_LENGTH | FULL | YORKER | SHORT | BOUNCER | FULL_TOSS | SLOWER_BALL, based on where the ball appears to land or the release cues if landing point isn't visible.
- For SPIN: classify variation as one of OFF_BREAK | LEG_BREAK | GOOGLY | ARM_BALL | TOP_SPINNER if the grip/wrist position or ball rotation gives a visible cue; otherwise return UNKNOWN rather than guessing.
- Be honest about uncertainty — set confidence low (below 0.5) rather than fabricating a specific variation when the frames don't show enough of the release to tell.

Each value must be a single token from the allowed sets above.

Return JSON only, no markdown fences:
{
  "bowlingArm": "RIGHT_ARM|LEFT_ARM|UNKNOWN",
  "bowlingType": "PACE|SPIN|UNKNOWN",
  "deliveryType": "<one token from: ${DELIVERY_TYPE_PROMPT_UNION}>",
  "confidence": 0.0,
  "reasons": ["cite visual evidence"],
  "noBowlerVisible": false
}`;

async function requestBowlingClassification(
  imageParts: { inlineData: { mimeType: "image/jpeg"; data: string } }[],
  fullPrompt: string
): Promise<string> {
  return generateContentTextWithRetryAndFallback(
    "bowling_classification",
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

function tryParseBowlingResponse(rawResponseText: string): ParsedBowlingPayload | null {
  try {
    return parseJsonObject<ParsedBowlingPayload>(rawResponseText);
  } catch {
    return null;
  }
}

function normalizeBowlingResult(
  parsed: ParsedBowlingPayload,
  rawResponseText: string
): BowlingClassificationResult {
  const bowlingArm: BowlingArmValue =
    typeof parsed.bowlingArm === "string" && isValidBowlingArm(parsed.bowlingArm)
      ? parsed.bowlingArm
      : "UNKNOWN";
  const bowlingType: BowlingTypeValue =
    typeof parsed.bowlingType === "string" && isValidBowlingType(parsed.bowlingType)
      ? parsed.bowlingType
      : "UNKNOWN";
  const deliveryType: DeliveryTypeValue =
    typeof parsed.deliveryType === "string" && isValidDeliveryType(parsed.deliveryType)
      ? parsed.deliveryType
      : "UNKNOWN";
  const confidence =
    typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0;
  const reasons = Array.isArray(parsed.reasons)
    ? parsed.reasons.filter((r): r is string => typeof r === "string").slice(0, 5)
    : [];
  const noBowlerVisible =
    typeof parsed.noBowlerVisible === "boolean"
      ? parsed.noBowlerVisible
      : bowlingArm === "UNKNOWN" && bowlingType === "UNKNOWN" && deliveryType === "UNKNOWN";

  return {
    bowlingArm,
    bowlingType,
    deliveryType,
    confidence,
    reasons,
    noBowlerVisible,
    rawResponseText,
  };
}

const FALLBACK_RESULT: Omit<BowlingClassificationResult, "rawResponseText"> = {
  bowlingArm: "UNKNOWN",
  bowlingType: "UNKNOWN",
  deliveryType: "UNKNOWN",
  confidence: 0,
  reasons: ["Bowling classification could not parse the model response"],
  noBowlerVisible: true,
};

export async function classifyBowlingActionWithGemini(input: {
  videoId: string;
  filename?: string;
  durationSeconds?: number | null;
  poseSummary?: string | null;
  framesBase64: string[];
  analysisId: string;
}): Promise<BowlingClassificationResult> {
  const frameBudget = Math.min(16, Math.max(8, input.framesBase64.length));
  const step = Math.max(1, Math.floor(input.framesBase64.length / frameBudget));
  const sampledFrames = input.framesBase64.filter((_, i) => i % step === 0).slice(0, frameBudget);

  const imageParts = sampledFrames.map((b64) => ({
    inlineData: {
      mimeType: "image/jpeg" as const,
      data: b64,
    },
  }));

  const poseBlock =
    input.poseSummary && input.poseSummary.trim().length > 0
      ? `Pose landmark timeline (MediaPipe — subject should be the bowler):\n${input.poseSummary.trim()}`
      : "Pose landmark timeline: NOT AVAILABLE — classify from video frames only.";

  const fullPrompt = `${BOWLING_CLASSIFICATION_PROMPT}

Video filename: ${input.filename ?? "unknown"}
Duration seconds: ${input.durationSeconds ?? "unknown"}
Frames provided: ${sampledFrames.length}

${poseBlock}`;

  logGeminiRequest(
    input.analysisId,
    "bowling_classification",
    modelNameForTask("classification"),
    fullPrompt,
    {
      framesProvided: sampledFrames.length,
      hasPoseSummary: Boolean(input.poseSummary?.trim()),
    }
  );

  let rawResponseText = await requestBowlingClassification(imageParts, fullPrompt);
  let parsed = tryParseBowlingResponse(rawResponseText);

  if (!parsed) {
    console.warn(
      JSON.stringify({
        tag: "analysisPipeline.bowlingClassification.parseError",
        analysisId: input.analysisId,
        attempt: 1,
        rawPreview: rawResponseText.slice(0, 500),
        rawCharLength: rawResponseText.length,
      })
    );
    rawResponseText = await requestBowlingClassification(imageParts, fullPrompt);
    parsed = tryParseBowlingResponse(rawResponseText);
  }

  if (!parsed) {
    console.warn(
      JSON.stringify({
        tag: "analysisPipeline.bowlingClassification.parseError",
        analysisId: input.analysisId,
        attempt: 2,
        rawPreview: rawResponseText.slice(0, 500),
        rawCharLength: rawResponseText.length,
        action: "fallback_unknown",
      })
    );
    return { ...FALLBACK_RESULT, rawResponseText };
  }

  const result = normalizeBowlingResult(parsed, rawResponseText);

  console.log(
    JSON.stringify(
      {
        tag: "analysisPipeline.bowlingClassification",
        analysisId: input.analysisId,
        bowlingArm: result.bowlingArm,
        bowlingType: result.bowlingType,
        deliveryType: result.deliveryType,
        confidence: result.confidence,
        noBowlerVisible: result.noBowlerVisible,
        reasons: result.reasons,
      },
      null,
      2
    )
  );

  return result;
}
