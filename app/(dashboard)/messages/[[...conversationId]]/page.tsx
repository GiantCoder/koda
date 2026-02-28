"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/Button";
import { SafeguardingBanner } from "@/app/components/messaging/SafeguardingBanner";
import { ConversationList } from "@/app/components/messaging/ConversationList";
import { MessageThread } from "@/app/components/messaging/MessageThread";
import { MessageComposer } from "@/app/components/messaging/MessageComposer";
import { ConversationHeader } from "@/app/components/messaging/ConversationHeader";
import { EmptyState } from "@/app/components/common/EmptyState";
import {
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
  type MockConversation,
  type MockMessage,
} from "@/app/lib/mock-messaging";
import { useMockAuth } from "@/app/hooks/useMockAuth";

function PlusIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg
      className="h-12 w-12"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

export default function MessagesPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useMockAuth();
  const urlConversationId = Array.isArray(params?.conversationId)
    ? params.conversationId?.[0]
    : params?.conversationId;

  const [conversations, setConversations] = useState<MockConversation[]>([]);
  const [messagesByConv, setMessagesByConv] = useState<
    Record<string, MockMessage[]>
  >({});
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(
    null
  );
  const [messagesLoading, setMessagesLoading] = useState<
    Record<string, boolean>
  >({});
  const [messagesError, setMessagesError] = useState<
    Record<string, string | null>
  >({});

  // Sync active conversation from URL
  useEffect(() => {
    if (urlConversationId && typeof urlConversationId === "string") {
      setActiveConversationId(urlConversationId);
    } else {
      setActiveConversationId(null);
    }
  }, [urlConversationId]);

  // Load conversations (mock: simulate async)
  useEffect(() => {
    let cancelled = false;
    setConversationsLoading(true);
    setConversationsError(null);
    const t = setTimeout(() => {
      if (cancelled) return;
      setConversations(MOCK_CONVERSATIONS);
      setConversationsLoading(false);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  // Load messages when conversation selected
  useEffect(() => {
    if (!activeConversationId) return;
    setMessagesLoading((prev) => ({ ...prev, [activeConversationId]: true }));
    setMessagesError((prev) => ({ ...prev, [activeConversationId]: null }));
    const t = setTimeout(() => {
      const msgs = MOCK_MESSAGES[activeConversationId] ?? [];
      setMessagesByConv((prev) => ({ ...prev, [activeConversationId]: msgs }));
      setMessagesLoading((prev) => ({ ...prev, [activeConversationId]: false }));
    }, 200);
    return () => clearTimeout(t);
  }, [activeConversationId]);

  const handleSendMessage = useCallback(
    (content: string) => {
      if (!activeConversationId || !user) return;
      const newMsg: MockMessage = {
        id: `msg-${Date.now()}`,
        conversationId: activeConversationId,
        senderId: user.id,
        senderName: `${user.firstName} ${user.lastName}`,
        content,
        sentAt: new Date().toISOString(),
        isCurrentUser: true,
      };
      setMessagesByConv((prev) => {
        const existing = prev[activeConversationId] ?? [];
        return { ...prev, [activeConversationId]: [...existing, newMsg] };
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? {
                ...c,
                lastMessagePreview: content,
                lastMessageAt: newMsg.sentAt,
                unreadCount: 0,
              }
            : c
        )
      );
    },
    [activeConversationId, user]
  );

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );
  const invalidConversation =
    activeConversationId && !conversationsLoading && !activeConversation;
  const activeMessages = activeConversationId
    ? messagesByConv[activeConversationId] ?? []
    : [];
  const isMessagesLoading = activeConversationId
    ? messagesLoading[activeConversationId] ?? false
    : false;
  const messagesErr = activeConversationId
    ? messagesError[activeConversationId] ?? null
    : null;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Messages
          </h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            Communicate with parents, players and coaching staff
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <PlusIcon />
          New Message
        </Button>
      </div>

      <SafeguardingBanner />

      <div className="mt-6 flex min-h-[560px] overflow-hidden rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface)] shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
        {/* Left: Conversation list */}
        <div className="flex w-80 shrink-0 flex-col border-r border-[var(--surface-secondary)]">
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            filter={filter}
            onFilterChange={setFilter}
            isLoading={conversationsLoading}
            error={conversationsError}
          />
        </div>

        {/* Right: Thread or empty state */}
        <div className="flex min-w-0 flex-1 flex-col">
          {invalidConversation ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <EmptyState
                title="Conversation not found"
                description="This conversation may have been removed or the link is invalid."
                actionLabel="Back to messages"
                onAction={() => router.push("/messages")}
                icon={<MessageIcon />}
              />
            </div>
          ) : activeConversation ? (
            <>
              <ConversationHeader
                participantName={activeConversation.participantName}
                participantContext={
                  activeConversation.participantContext
                    ? `${activeConversation.participantRole.charAt(0).toUpperCase()}${activeConversation.participantRole.slice(1)} ${activeConversation.participantContext}`
                    : undefined
                }
              />
              <MessageThread
                messages={activeMessages}
                isLoading={isMessagesLoading}
                error={messagesErr}
              />
              <MessageComposer
                onSend={handleSendMessage}
                showParentVisibilityFooter={
                  activeConversation.isUnder18 ?? false
                }
                parentName={activeConversation.parentName}
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8">
              <EmptyState
                title="Select a conversation"
                description="Choose a conversation from the list to view and send messages."
                icon={<MessageIcon />}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
