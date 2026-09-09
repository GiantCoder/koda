/**
 * Polling-only message list for a conversation thread. The backend does
 * `redis.publish("conversation:<id>", ...)` on every send, but nothing in
 * the codebase subscribes to it -- no SSE route exists for conversations,
 * so it's dead code today. Same decision as Phase 3/4's analysis-status
 * polling: RN has no native EventSource anyway, so this just polls
 * GET /api/conversations/[id]/messages on an interval, same shape as
 * src/lib/useAnalysisStatus.ts.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { getMessages, type Message } from "@/api/conversations";

interface UseConversationMessagesOptions {
  conversationId: string | null;
  enabled?: boolean;
  pollIntervalMs?: number;
}

export function useConversationMessages({
  conversationId,
  enabled = true,
  pollIntervalMs = 4000,
}: UseConversationMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      // Newest-first from the API; reverse to oldest-first for a normal
      // top-to-bottom chat view.
      const page = await getMessages(conversationId, { limit: 100 });
      setMessages([...page.messages].reverse());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!conversationId || !enabled) {
      setMessages([]);
      setLoading(true);
      return;
    }
    setLoading(true);
    void fetchMessages();
    pollTimerRef.current = setInterval(() => void fetchMessages(), pollIntervalMs);
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, enabled, pollIntervalMs]);

  /** Optimistically append a just-sent message so the sender doesn't wait
   * for the next poll tick to see their own message. */
  const appendLocal = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  return { messages, loading, error, refetch: fetchMessages, appendLocal };
}
