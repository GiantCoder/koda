"use client";

import React from "react";
import Link from "next/link";
import type { MockConversation } from "@/app/lib/mock-messaging";

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function getRoleBadgeClass(role: string): string {
  switch (role) {
    case "parent":
      return "bg-[var(--surface-secondary)] text-[var(--text-secondary)]";
    case "player":
      return "bg-[var(--cricket-green)]/20 text-[var(--cricket-green)]";
    case "coach":
      return "bg-[var(--primary)]/20 text-[var(--primary)]";
    default:
      return "bg-[var(--surface-secondary)] text-[var(--text-secondary)]";
  }
}

interface ConversationListProps {
  conversations: MockConversation[];
  activeConversationId: string | null;
  filter: "all" | "unread";
  onFilterChange: (filter: "all" | "unread") => void;
  isLoading?: boolean;
  error?: string | null;
}

export function ConversationList({
  conversations,
  activeConversationId,
  filter,
  onFilterChange,
  isLoading,
  error,
}: ConversationListProps) {
  const filtered =
    filter === "unread"
      ? conversations.filter((c) => c.unreadCount > 0)
      : conversations;

  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--surface-secondary)] border-t-[var(--primary)]" />
        <p className="text-sm text-[var(--text-secondary)]">Loading conversations…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center p-4 text-center">
        <p className="text-sm text-[var(--danger)]">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">
          Conversations
        </h2>
      </div>
      <div className="mb-3 flex gap-1">
        <button
          type="button"
          onClick={() => onFilterChange("all")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-[var(--primary)] text-white"
              : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => onFilterChange("unread")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            filter === "unread"
              ? "bg-[var(--primary)] text-white"
              : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Unread
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-0 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
            {filter === "unread"
              ? "No unread conversations"
              : "No conversations yet"}
          </p>
        ) : (
          filtered.map((conv) => {
            const isActive = conv.id === activeConversationId;
            return (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className={`flex items-start gap-3 border-b border-[var(--surface-secondary)] p-3 transition-colors hover:bg-[var(--surface-secondary)] ${
                  isActive ? "bg-[var(--surface-secondary)]" : ""
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-sm font-semibold text-[var(--primary)]">
                  {conv.participantName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`truncate font-medium ${
                        conv.unreadCount > 0
                          ? "text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)]"
                      }`}
                    >
                      {conv.participantName}
                    </span>
                    <span className="shrink-0 text-xs text-[var(--text-secondary)]">
                      {formatTimestamp(conv.lastMessageAt)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs ${getRoleBadgeClass(conv.participantRole)}`}
                    >
                      {conv.participantRole.charAt(0).toUpperCase() +
                        conv.participantRole.slice(1)}
                      {conv.participantContext ? ` ${conv.participantContext}` : ""}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">
                    {conv.lastMessagePreview}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-[var(--primary)] px-2 text-xs font-medium text-white">
                    {conv.unreadCount}
                  </span>
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
