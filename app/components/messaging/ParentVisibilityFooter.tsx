"use client";

import React from "react";

function InfoIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

/**
 * Parent visibility footer for conversations with players under 18.
 * PRD 9: Cannot be hidden. Must display "Parent visibility: This conversation is visible to [parent/guardian name]".
 */
export function ParentVisibilityFooter({ parentName }: { parentName: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-b-lg border-t border-[#93C5FD]/40 bg-[#DBEAFE]/50 px-4 py-2 dark:border-[#3B82F6]/30 dark:bg-[#1E3A8A]/20"
      role="status"
      aria-live="polite"
    >
      <span className="text-[#2563EB] dark:text-[#93C5FD]" aria-hidden>
        <InfoIcon />
      </span>
      <p className="text-sm text-[#1E40AF] dark:text-[#BFDBFE]">
        Parent visibility: This conversation is visible to {parentName}
      </p>
    </div>
  );
}
