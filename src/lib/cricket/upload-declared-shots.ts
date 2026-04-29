import { isValidShotType } from "@/src/lib/cricket/shot-types";

export const MAX_DECLARED_SHOTS = 10;

export type ParsedDeclaredShots =
  | { ok: true; declaredShotCount: number | null; playerDeclaredShotHints: string[] | null }
  | { ok: false; error: string };

/**
 * Optional form fields from dashboard upload: declaredShotCount + JSON array playerDeclaredShotHints.
 * When omitted entirely, analysis behaves as before (no user stroke count / hints).
 */
export function parseDeclaredShotsFromUpload(formData: FormData): ParsedDeclaredShots {
  const countRaw = formData.get("declaredShotCount");
  const hintsRaw = formData.get("playerDeclaredShotHints");

  const countEmpty = countRaw == null || (typeof countRaw === "string" && !countRaw.trim());
  const hintsEmpty = hintsRaw == null || (typeof hintsRaw === "string" && !hintsRaw.trim());

  if (countEmpty && hintsEmpty) {
    return { ok: true, declaredShotCount: null, playerDeclaredShotHints: null };
  }

  if (countEmpty || typeof countRaw !== "string") {
    return { ok: false, error: "declaredShotCount is required when shot hints are provided" };
  }

  const n = parseInt(countRaw.trim(), 10);
  if (!Number.isFinite(n) || n < 1 || n > MAX_DECLARED_SHOTS) {
    return { ok: false, error: `declaredShotCount must be between 1 and ${MAX_DECLARED_SHOTS}` };
  }

  if (hintsEmpty || typeof hintsRaw !== "string") {
    return { ok: false, error: "playerDeclaredShotHints (JSON array) is required when declaredShotCount is set" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(hintsRaw);
  } catch {
    return { ok: false, error: "playerDeclaredShotHints must be valid JSON" };
  }

  if (!Array.isArray(parsed)) {
    return { ok: false, error: "playerDeclaredShotHints must be a JSON array" };
  }

  if (parsed.length !== n) {
    return { ok: false, error: "playerDeclaredShotHints must have the same length as declaredShotCount" };
  }

  const hints: string[] = [];
  for (const item of parsed) {
    if (typeof item !== "string" || !isValidShotType(item)) {
      return { ok: false, error: "Each shot hint must be a valid shot type value" };
    }
    hints.push(item);
  }

  return { ok: true, declaredShotCount: n, playerDeclaredShotHints: hints };
}
