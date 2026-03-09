import { GoogleGenerativeAI } from "@google/generative-ai";
import { shotClassificationPrompt } from "./prompts/shotClassification";

const shotTypeValues = [
  "COVER_DRIVE",
  "OFF_DRIVE",
  "STRAIGHT_DRIVE",
  "ON_DRIVE",
  "SWEEP",
  "REVERSE_SWEEP",
  "PULL",
  "HOOK",
  "CUT",
  "GLANCE",
  "DEFENSIVE",
  "LATE_CUT",
  "FLICK",
  "SCOOP",
  "UNKNOWN",
] as const;

type ShotType = (typeof shotTypeValues)[number];

interface ShotClassificationResult {
  shotType: ShotType;
  confidence: number;
  reasons: string[];
  rawResponseText: string;
}

interface BiometricScoringResult {
  scores: number[];
  rawResponseText: string;
}

function getGeminiModelForTask(task: "classification" | "scoring") {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is missing");
  }

  const modelName =
    task === "classification"
      ? process.env.GEMINI_CLASSIFICATION_MODEL ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash"
      : process.env.GEMINI_SCORING_MODEL ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";
  const client = new GoogleGenerativeAI(apiKey);
  return client.getGenerativeModel({ model: modelName });
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model response");
  }
  return trimmed.slice(start, end + 1);
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

export async function classifyShotWithGemini(input: {
  videoId: string;
  filename: string;
  durationSeconds?: number | null;
  resolutionWidth?: number | null;
  resolutionHeight?: number | null;
}): Promise<ShotClassificationResult> {
  const model = getGeminiModelForTask("classification");

  const prompt = `${shotClassificationPrompt}

Context:
- videoId: ${input.videoId}
- filename: ${input.filename}
- durationSeconds: ${input.durationSeconds ?? "unknown"}
- resolution: ${input.resolutionWidth ?? "unknown"}x${input.resolutionHeight ?? "unknown"}

Return JSON only, no markdown code fences.`;

  const response = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
    },
  });
  const rawResponseText = response.response.text();
  const jsonText = extractJsonObject(rawResponseText);
  const parsed = JSON.parse(jsonText) as {
    shotType?: string;
    confidence?: number;
    reasons?: string[];
  };

  const normalizedShotType = shotTypeValues.includes((parsed.shotType ?? "") as ShotType)
    ? (parsed.shotType as ShotType)
    : "UNKNOWN";

  const confidence =
    typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0;

  const reasons = Array.isArray(parsed.reasons)
    ? parsed.reasons.filter((item): item is string => typeof item === "string").slice(0, 5)
    : [];

  return {
    shotType: normalizedShotType,
    confidence,
    reasons,
    rawResponseText,
  };
}

export async function scoreBiomechanicsWithGemini(input: {
  shotType: ShotType;
  durationSeconds?: number | null;
}): Promise<BiometricScoringResult> {
  const model = getGeminiModelForTask("scoring");

  const prompt = `You are a cricket biomechanics analyst.
Given the shot type and light metadata, estimate technical scores from 0 to 100.

Shot type: ${input.shotType}
Duration seconds: ${input.durationSeconds ?? "unknown"}

Return JSON only in this exact shape:
{
  "scores": [backlift, weightTransfer, headPosition, followThrough, timing, balance, footwork, shotSelection]
}
Each score must be an integer from 0 to 100.`;

  const response = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
    },
  });
  const rawResponseText = response.response.text();
  const jsonText = extractJsonObject(rawResponseText);
  const parsed = JSON.parse(jsonText) as { scores?: unknown[] };

  const rawScores = Array.isArray(parsed.scores) ? parsed.scores : [];
  const normalizedScores = rawScores
    .slice(0, 8)
    .map((value) => (typeof value === "number" ? clampScore(value) : 0));

  while (normalizedScores.length < 8) {
    normalizedScores.push(75);
  }

  return {
    scores: normalizedScores,
    rawResponseText,
  };
}
