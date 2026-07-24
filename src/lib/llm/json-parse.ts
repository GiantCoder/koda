/** Extract the first JSON object from a model response (handles fences and preamble). */
export function extractJsonObject(text: string): string {
  let trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    trimmed = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  }
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

export function parseJsonObject<T = unknown>(text: string): T {
  return JSON.parse(extractJsonObject(text)) as T;
}
