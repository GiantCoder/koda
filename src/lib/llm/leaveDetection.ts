import { logGeminiRequest } from "@/src/lib/analysis/pipeline-log";
import { generateContentTextWithRetryAndFallback } from "./gemini-retry";

const DEFAULT_GEMINI_ANALYSIS_MODEL = "gemini-3.1-pro-preview";

function modelNameForLeaveDetection(): string {
  const fallback = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_ANALYSIS_MODEL;
  return process.env.GEMINI_CLASSIFICATION_MODEL ?? fallback;
}

export type LeaveDetectionOutcome = "LEAVE" | "PLAYED" | "UNCLEAR";

export interface LeaveDetectionResult {
  outcome: LeaveDetectionOutcome;
  confidence: number;
  reasons: string[];
  rawResponseText: string;
}

const leaveDetectionPrompt = `You classify ONE cricket delivery using cropped frames that show ONLY the distant batter at the far end of the net (the foreground bowler has been cropped out).

Task: Did the batter LEAVE the ball or PLAY at it?

LEAVE — batter deliberately lets the ball pass WITHOUT playing:
- Bat raised/held UP and AWAY from the ball's line (often high, near shoulder or head height)
- NO bat swing path toward the ball; NO attempt to intercept
- Batter watches the ball pass; body relatively still or slight lean/withdrawal
- Ball travels past the batter untouched (if ball is visible)
- A static raised bat is LEAVE, NOT a cut or drive

PLAYED — batter attempts to hit or block the ball:
- Bat moves toward the ball to intercept, drive, cut, pull, block, etc.
- Clear batting stroke with intent to contact the ball
- Bat-ball contact or obvious playing motion at the ball

UNCLEAR — cannot tell from these frames.

Do NOT infer a cut, drive, or pull unless you see the bat moving AT the ball to hit it.

Return JSON only:
{
  "outcome": "LEAVE" | "PLAYED" | "UNCLEAR",
  "confidence": 0.0,
  "reasons": ["one short sentence citing what the distant batter's bat and body do"]
}`;

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in leave detection response");
  }
  return trimmed.slice(start, end + 1);
}

/** Focused leave-vs-played check on cropped far-end frames (nets / behind-bowler). */
export async function detectLeaveWithGemini(input: {
  framesBase64: string[];
  analysisId?: string;
  durationSeconds?: number | null;
}): Promise<LeaveDetectionResult> {
  const tailCount = Math.min(8, input.framesBase64.length);
  const tailFrames = input.framesBase64.slice(-tailCount);

  const imageParts = tailFrames.map((b64) => ({
    inlineData: { mimeType: "image/jpeg" as const, data: b64 },
  }));

  const prompt = `${leaveDetectionPrompt}

Context:
- durationSeconds: ${input.durationSeconds ?? "unknown"}
- framesProvided: ${tailFrames.length} (final frames of delivery — batter response)`;

  if (input.analysisId) {
    logGeminiRequest(input.analysisId, "leave_detection", modelNameForLeaveDetection(), prompt, {
      framesProvided: tailFrames.length,
    });
  }

  const rawResponseText = await generateContentTextWithRetryAndFallback(
    "leave_detection",
    modelNameForLeaveDetection(),
    {
      contents: [{ role: "user", parts: [...imageParts, { text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }
  );

  const parsed = JSON.parse(extractJsonObject(rawResponseText)) as {
    outcome?: string;
    confidence?: number;
    reasons?: string[];
  };

  const outcomeRaw = parsed.outcome?.toUpperCase();
  const outcome: LeaveDetectionOutcome =
    outcomeRaw === "LEAVE" || outcomeRaw === "PLAYED" || outcomeRaw === "UNCLEAR"
      ? outcomeRaw
      : "UNCLEAR";

  const confidence =
    typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0;

  const reasons = Array.isArray(parsed.reasons)
    ? parsed.reasons.filter((r): r is string => typeof r === "string").slice(0, 3)
    : [];

  if (input.analysisId) {
    console.log(
      JSON.stringify(
        {
          tag: "analysisPipeline.gemini.response",
          analysisId: input.analysisId,
          phase: "leave_detection",
          outcome,
          confidence,
          reasons,
          rawResponseCharLength: rawResponseText.length,
        },
        null,
        2
      )
    );
  }

  return { outcome, confidence, reasons, rawResponseText };
}

export function leaveDetectionThreshold(): number {
  const raw = Number(process.env.KODA_LEAVE_CONFIDENCE_THRESHOLD ?? 0.6);
  return Number.isFinite(raw) ? Math.max(0.5, Math.min(0.95, raw)) : 0.6;
}
