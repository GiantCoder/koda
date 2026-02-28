"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/app/components/ui/Button";
import { ParentVisibilityFooter } from "./ParentVisibilityFooter";
import { QUICK_REPLY_CHIPS } from "@/app/lib/mock-messaging";

function PaperPlaneIcon() {
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
        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
      />
    </svg>
  );
}

function AttachmentIcon() {
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
        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
      />
    </svg>
  );
}

interface MessageComposerProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  showParentVisibilityFooter?: boolean;
  parentName?: string;
}

export function MessageComposer({
  onSend,
  disabled,
  showParentVisibilityFooter,
  parentName,
}: MessageComposerProps) {
  const [draft, setDraft] = useState("");

  const handleSend = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setDraft("");
  }, [draft, disabled, onSend]);

  const handleQuickReply = useCallback(
    (chip: string) => {
      if (disabled) return;
      onSend(chip);
    },
    [disabled, onSend]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="border-t border-[var(--surface-secondary)] bg-[var(--surface)]">
      <div className="p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {QUICK_REPLY_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleQuickReply(chip)}
              disabled={disabled}
              className="rounded-full border border-[var(--surface-secondary)] bg-[var(--surface-secondary)] px-3 py-1.5 text-sm text-[var(--text-primary)] transition-colors hover:border-[var(--primary)]/50 hover:bg-[var(--surface-secondary)]/80 disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <button
            type="button"
            className="shrink-0 rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
            aria-label="Add attachment"
            disabled={disabled}
          >
            <AttachmentIcon />
          </button>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={2}
            disabled={disabled}
            className="min-h-[44px] flex-1 resize-none rounded-xl border border-[var(--surface-secondary)] bg-[var(--surface-secondary)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-50"
          />
          <Button
            onClick={handleSend}
            disabled={disabled || !draft.trim()}
            className="shrink-0 rounded-lg px-4"
            aria-label="Send message"
          >
            <PaperPlaneIcon />
          </Button>
        </div>
      </div>
      {showParentVisibilityFooter && parentName && (
        <ParentVisibilityFooter parentName={parentName} />
      )}
    </div>
  );
}
