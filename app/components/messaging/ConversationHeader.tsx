"use client";

import React from "react";

function PhoneIcon() {
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
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
      />
    </svg>
  );
}

function MoreVerticalIcon() {
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
        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
      />
    </svg>
  );
}

interface ConversationHeaderProps {
  participantName: string;
  participantContext?: string;
}

export function ConversationHeader({
  participantName,
  participantContext,
}: ConversationHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--surface-secondary)] bg-[var(--surface)] px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-sm font-semibold text-[var(--primary)]">
          {participantName.charAt(0)}
        </div>
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">
            {participantName}
          </h3>
          {participantContext && (
            <p className="text-xs text-[var(--text-secondary)]">
              {participantContext}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
          aria-label="Call"
        >
          <PhoneIcon />
        </button>
        <button
          type="button"
          className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
          aria-label="More options"
        >
          <MoreVerticalIcon />
        </button>
      </div>
    </div>
  );
}
