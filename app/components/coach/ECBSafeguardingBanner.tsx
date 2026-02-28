"use client";

import React, { useState, useEffect } from "react";

const STORAGE_KEY = "koda-ecb-safeguarding-dismissed";
const RE_SHOW_MS = 24 * 60 * 60 * 1000; // 24 hours

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

function CloseIcon() {
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
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

/**
 * ECB Safeguarding Reminder banner.
 * PRD 9: Amber banner on Coach Roster and any coach view of a minor's analysis.
 * Dismissible with X; re-shown every 24 hours.
 */
export function ECBSafeguardingBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setVisible(true);
      return;
    }
    const dismissedAt = Number(raw);
    if (Number.isNaN(dismissedAt) || Date.now() - dismissedAt >= RE_SHOW_MS) {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-amber-400/60 bg-amber-50 px-4 py-3 dark:border-amber-500/40 dark:bg-amber-900/30"
      role="status"
      aria-live="polite"
    >
      <span className="text-amber-600 dark:text-amber-400" aria-hidden>
        <ShieldIcon />
      </span>
      <div className="flex-1">
        <p className="font-semibold text-amber-900 dark:text-amber-200">
          ECB Safeguarding Reminder
        </p>
        <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-300/90">
          Maintain professional boundaries and follow ECB guidelines for player
          welfare and safety.
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 rounded p-1 text-amber-700 hover:bg-amber-200/50 dark:text-amber-300 dark:hover:bg-amber-800/50"
        aria-label="Dismiss safeguarding reminder"
      >
        <CloseIcon />
      </button>
    </div>
  );
}
