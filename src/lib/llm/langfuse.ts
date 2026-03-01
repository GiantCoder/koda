import { Langfuse } from "langfuse";

const langfuse = new Langfuse({
  baseUrl: process.env.LANGFUSE_HOST,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
});

/** Wrap async LLM call in a LangFuse trace. */
export async function tracedLlmCall<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const trace = langfuse.trace({ name });
  try {
    const result = await fn();
    trace.update({ output: JSON.stringify(result) });
    return result;
  } catch (error) {
    trace.update({ level: "ERROR", statusMessage: String(error) });
    throw error;
  }
}
