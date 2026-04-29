import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GenerateContentRequest, GenerativeModel } from "@google/generative-ai";

/** Transient / overload-style errors worth retrying (503, 429, some 5xx). */
export function isTransientGeminiError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const m = msg.toLowerCase();
  return (
    m.includes("503") ||
    m.includes("429") ||
    m.includes("500") ||
    m.includes("502") ||
    m.includes("504") ||
    m.includes("service unavailable") ||
    m.includes("unavailable") ||
    m.includes("resource exhausted") ||
    m.includes("overloaded") ||
    m.includes("try again") ||
    m.includes("high demand") ||
    m.includes("deadline exceeded") ||
    m.includes("econnreset") ||
    m.includes("etimedout") ||
    m.includes("fetch failed")
  );
}

function retryConfig() {
  const maxRetries = Math.max(1, Math.min(32, Number(process.env.GEMINI_MAX_RETRIES ?? 6)));
  const baseMs = Math.max(100, Number(process.env.GEMINI_RETRY_BASE_MS ?? 1000));
  const maxDelayMs = Math.max(baseMs, Number(process.env.GEMINI_RETRY_MAX_MS ?? 60000));
  return { maxRetries, baseMs, maxDelayMs };
}

/**
 * Calls model.generateContent with retries and exponential backoff on transient failures.
 */
export async function generateContentTextWithRetry(
  model: GenerativeModel,
  request: GenerateContentRequest,
  logLabel: string
): Promise<string> {
  const { maxRetries, baseMs, maxDelayMs } = retryConfig();
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await model.generateContent(request);
      return response.response.text();
    } catch (e) {
      lastError = e;
      const retryable = isTransientGeminiError(e);
      if (!retryable || attempt === maxRetries - 1) {
        throw e;
      }
      const exp = Math.min(baseMs * 2 ** attempt, maxDelayMs);
      const jitter = Math.floor(Math.random() * 500);
      const waitMs = exp + jitter;
      console.warn(
        `[Gemini] ${logLabel} attempt ${attempt + 1}/${maxRetries} failed (${retryable ? "retryable" : "fatal"}), waiting ${waitMs}ms:`,
        e instanceof Error ? e.message : e
      );
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/**
 * Retries on transient errors, then optionally uses `GEMINI_FALLBACK_MODEL` if the primary
 * model still fails with a retryable error (e.g. 503 on flash-lite → try flash).
 */
export async function generateContentTextWithRetryAndFallback(
  taskLabel: string,
  primaryModelName: string,
  request: GenerateContentRequest
): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is missing");
  }

  const client = new GoogleGenerativeAI(apiKey);
  const primary = client.getGenerativeModel({ model: primaryModelName });

  try {
    return await generateContentTextWithRetry(primary, request, `${taskLabel}:${primaryModelName}`);
  } catch (e) {
    const fallback = process.env.GEMINI_FALLBACK_MODEL?.trim();
    if (!fallback || fallback === primaryModelName || !isTransientGeminiError(e)) {
      throw e;
    }
    console.warn(
      `[Gemini] ${taskLabel}: primary model "${primaryModelName}" failed after retries; trying fallback "${fallback}"`
    );
    const backup = client.getGenerativeModel({ model: fallback });
    return await generateContentTextWithRetry(backup, request, `${taskLabel}:${fallback}:fallback`);
  }
}
