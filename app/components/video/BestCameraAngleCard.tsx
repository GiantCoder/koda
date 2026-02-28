"use client";

import React from "react";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";

function VideoCameraIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function BestCameraAngleCard() {
  return (
    <Card className="border-[var(--cricket-green)]/30 bg-[var(--cricket-green)]/10">
      <CardHeader className="mb-3 flex items-center gap-2 text-[var(--cricket-green)]">
        <VideoCameraIcon />
        Best Camera Angle
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-[var(--text-secondary)]">
          For optimal analysis results, position your camera:
        </p>
        <div className="flex items-start gap-2 rounded-md bg-[var(--cricket-green)]/20 p-3">
          <CheckIcon className="mt-0.5 shrink-0 text-[var(--cricket-green)]" />
          <span className="font-medium text-[var(--text-primary)]">
            Behind the bowler&apos;s end stumps
          </span>
        </div>
        <ul className="ml-6 list-disc space-y-1 text-sm text-[var(--text-secondary)]">
          <li>Side-on view of batting stance</li>
          <li>Clear view of foot movement</li>
          <li>Captures full shot execution</li>
        </ul>
      </CardContent>
    </Card>
  );
}
