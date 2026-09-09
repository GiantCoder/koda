/**
 * Wraps the real, working messaging backend (GET/POST /api/conversations,
 * GET/POST /api/conversations/[id]/messages, PUT /api/conversations/[id]/read)
 * -- Phase 5 research found web's own messages page is 100% mocked
 * (setTimeout + hardcoded conversations, "New Message" does nothing) even
 * though this backend is real and fully functional. Mobile wires up the
 * real thing directly.
 *
 * Deliberately NOT modeled here: the `parentVisibility`/`visibility` fields
 * the API returns. The backend computes a "this is visible to a parent"
 * label for messages to minors, but never actually grants a guardian
 * access to anything or gates who can message a minor in the first place --
 * see roadmap doc for the full writeup. Surfacing that label in the mobile
 * UI would repeat a safety claim that isn't true, so mobile ignores the
 * field entirely and shows a neutral, accurate disclosure instead (see
 * the messages thread screen).
 */
import { apiFetch } from "./client";

export type KodaRole = "PLAYER" | "PARENT" | "COACH" | "ADMIN";

export interface ConversationParticipant {
  id: string;
  displayName: string;
  role: KodaRole;
}

export interface ConversationSummary {
  id: string;
  subject: string | null;
  createdAt: string;
  lastReadAt: string | null;
  participants: ConversationParticipant[];
  lastMessage: {
    id: string;
    content: string;
    sentAt: string;
    senderId: string;
  } | null;
}

export async function getConversations(): Promise<ConversationSummary[]> {
  const data = await apiFetch<{ conversations: ConversationSummary[] }>("/api/conversations");
  return data.conversations;
}

export interface CreateConversationResult {
  id: string;
  subject: string | null;
  createdAt: string;
  participants: ConversationParticipant[];
}

/** participantIds should NOT include the caller -- the backend adds them automatically. */
export async function createConversation(
  participantIds: string[],
  subject?: string
): Promise<CreateConversationResult> {
  return apiFetch<CreateConversationResult>("/api/conversations", {
    method: "POST",
    body: { participantIds, subject },
  });
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderDisplayName: string;
  sentAt: string;
}

export interface MessagesPage {
  messages: Message[];
  pagination: { limit: number; offset: number; total: number };
}

export async function getMessages(
  conversationId: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<MessagesPage> {
  const params = new URLSearchParams();
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.offset != null) params.set("offset", String(opts.offset));
  const qs = params.toString();
  return apiFetch<MessagesPage>(`/api/conversations/${conversationId}/messages${qs ? `?${qs}` : ""}`);
}

export async function sendMessage(conversationId: string, content: string): Promise<Message> {
  return apiFetch<Message>(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: { content },
  });
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await apiFetch(`/api/conversations/${conversationId}/read`, { method: "PUT" });
}

export interface MessageSearchResult {
  id: string;
  conversationId: string;
  content: string;
  sentAt: string;
  sender: { id: string; displayName: string; role: KodaRole };
}

/** Wraps the real, working GET /api/messages/search -- left unwrapped in
 * Phase 5 to keep that phase focused. Searches message content across
 * every conversation the caller participates in (server-side, scoped to
 * ConversationParticipant rows for the caller -- no client-side filtering
 * of conversations you can't see). */
export async function searchMessages(query: string): Promise<MessageSearchResult[]> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({ q: query });
  const data = await apiFetch<{ query: string; messages: MessageSearchResult[] }>(
    `/api/messages/search?${params.toString()}`
  );
  return data.messages;
}
