/**
 * Kill switch for experimental bowling analysis.
 * Set both env vars to "true" to enable; default is off.
 */
export function isBowlingAnalysisEnabled(): boolean {
  return process.env.KODA_ENABLE_BOWLING_ANALYSIS === "true";
}

/** Client-side gate (Next.js inlines NEXT_PUBLIC_* at build time). */
export function isBowlingAnalysisEnabledClient(): boolean {
  return process.env.NEXT_PUBLIC_KODA_ENABLE_BOWLING_ANALYSIS === "true";
}
