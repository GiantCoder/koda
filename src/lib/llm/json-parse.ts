/** Extract the first complete JSON object from a model response (handles fences, preamble, trailing junk). */
export function extractJsonObject(text: string): string {
  let trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    trimmed = trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```[\s\S]*$/i, "")
      .trim();
  }

  const start = trimmed.indexOf("{");
  if (start === -1) {
    throw new Error("No JSON object found in model response");
  }

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return trimmed.slice(start, i + 1);
      }
    }
  }

  // Truncated — return from `{` so repairJson can close open braces/brackets
  return trimmed.slice(start);
}

/** Fix common Gemini JSON glitches and close truncated objects. */
function repairJson(fragment: string): string {
  let s = fragment.trim();
  // Extra `]` before a closing `}` (seen in leave-detection responses)
  s = s.replace(/\](\s*)\](\s*\})/g, "]$1$2");
  // Trailing commas
  s = s.replace(/,\s*([}\]])/g, "$1");

  let inString = false;
  let escape = false;
  const stack: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") {
      if (stack.length > 0 && stack[stack.length - 1] === ch) {
        stack.pop();
      }
    }
  }

  if (inString) {
    s += '"';
  }
  while (stack.length > 0) {
    s += stack.pop();
  }
  return s;
}

export function parseJsonObject<T = unknown>(text: string): T {
  if (!text || !text.trim()) {
    throw new Error("No JSON object found in model response");
  }

  const extracted = extractJsonObject(text);
  try {
    return JSON.parse(extracted) as T;
  } catch {
    // fall through to repair
  }

  const repaired = repairJson(extracted);
  try {
    return JSON.parse(repaired) as T;
  } catch {
    throw new Error("No JSON object found in model response");
  }
}
