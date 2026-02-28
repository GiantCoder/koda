"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";

function LightbulbIcon({ className = "h-5 w-5" }: { className?: string }) {
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
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
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
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const toggle = (index: number) => {
    setChecked((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <Card>
      <CardHeader className="mb-3 flex items-center gap-2">
        <LightbulbIcon className="text-[var(--warning)]" />
        Pre-Upload Checklist
      </CardHeader>
      <CardContent className="space-y-2">
        {CHECKLIST_ITEMS.map((item, i) => (
          <label
            key={i}
            className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-[var(--surface-secondary)]/50"
          >
            <input
              type="checkbox"
              checked={!!checked[i]}
              onChange={() => toggle(i)}
              className="h-4 w-4 rounded border-[var(--surface-secondary)] text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <span className="text-sm text-[var(--text-primary)]">{item}</span>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}
