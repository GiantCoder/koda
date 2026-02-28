"use client";

import React from "react";

function ShieldIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

/**
 * Non-dismissible Safe Messaging Environment banner.
 * PRD 9: Must always be visible in the Messages section header.
 */
export function SafeguardingBanner() {
  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-[#93C5FD]/60 bg-[#DBEAFE] px-4 py-3 dark:border-[#3B82F6]/40 dark:bg-[#1E3A8A]/30"
      role="status"
      aria-live="polite"
    >
      <span className="text-[#2563EB] dark:text-[#93C5FD]" aria-hidden>
        <ShieldIcon />
      </span>
      <div>
        <p className="font-semibold text-[#1E40AF] dark:text-[#93C5FD]">
          Safe Messaging Environment
        </p>
        <p className="mt-0.5 text-sm text-[#1E3A8A] dark:text-[#BFDBFE]">
          All messages with junior players (under 18) are visible to their parents.
          Direct player messaging requires parental consent.
        </p>
      </div>
    </div>
  );
}
