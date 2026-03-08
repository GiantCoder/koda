"use client";

import React from "react";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";

function LightbulbIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
    </svg>
  );
}

const CHECKLIST_ITEMS = [
  "Video shows full body in frame",
  "Good lighting conditions",
  "Minimal background clutter",
  "At least 10 seconds of footage",
];

export function PreUploadChecklist() {
  return (
    <Card className="bg-[var(--surface)]">
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--warning)]/20">
            <LightbulbIcon className="h-6 w-6 text-[var(--warning)]" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-[var(--text-primary)]">
              Pre-Upload Checklist
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Ensure your video meets these criteria for the AI to analyze technique accurately.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {CHECKLIST_ITEMS.map((item, i) => (
            <label
              key={i}
              className="flex cursor-pointer items-start gap-3 rounded-md p-2 transition-colors hover:bg-[var(--surface-secondary)]/50"
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-[var(--surface-secondary)] text-[var(--primary)] focus:ring-[var(--primary)]"
              />
              <span className="text-sm text-[var(--text-primary)]">{item}</span>
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
