"use client";

import React from "react";
import type { MockMessage } from "@/app/lib/mock-messaging";

function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateSeparator(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}

interface MessageThreadProps {
  messages: MockMessage[];
  isLoading?: boolean;
  error?: string | null;
}

export function MessageThread({
  messages,
  isLoading,
  error,
}: MessageThreadProps) {
  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--surface-secondary)] border-t-[var(--primary)]" />
        <p className="text-sm text-[var(--text-secondary)]">Loading messages…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-[var(--danger)]">{error}</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-[var(--text-secondary)]">
          No messages yet. Start the conversation below.
        </p>
      </div>
    );
  }

  // Group messages by date for separators
  const grouped: { date: string; msgs: MockMessage[] }[] = [];
  let lastDate = "";

  for (const msg of messages) {
    const dateKey = new Date(msg.sentAt).toDateString();
    if (dateKey !== lastDate) {
      grouped.push({ date: formatDateSeparator(msg.sentAt), msgs: [msg] });
      lastDate = dateKey;
    } else {
      grouped[grouped.length - 1].msgs.push(msg);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-4">
      {grouped.map(({ date, msgs }) => (
        <div key={date}>
          <div className="my-4 flex justify-center">
            <span className="rounded-full bg-[var(--surface-secondary)] px-3 py-1 text-xs text-[var(--text-secondary)]">
              {date}
            </span>
          </div>
          <div className="space-y-3">
            {msgs.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isCurrentUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    msg.isCurrentUser
                      ? "rounded-br-md bg-[var(--primary)] text-white"
                      : "rounded-bl-md bg-[var(--surface-secondary)] text-[var(--text-primary)]"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p
                    className={`mt-1 text-xs ${
                      msg.isCurrentUser ? "text-white/80" : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {formatMessageTime(msg.sentAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
