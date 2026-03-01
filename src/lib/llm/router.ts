export type LlmProvider = "gemini" | "openai" | "claude";

interface RouteContext {
  task: "classification" | "biometric_scoring" | "coaching_tips" | "general";
}

/** Select LLM provider based on task type. */
export function routeProvider(context: RouteContext): LlmProvider {
  if (context.task === "classification" || context.task === "biometric_scoring") {
    return "gemini";
  }
  if (context.task === "coaching_tips") {
    return "openai";
  }
  return "claude";
}
