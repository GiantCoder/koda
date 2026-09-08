"use client";

import React from "react";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";

export interface CoachingTip {
  title: string;
  body: string;
  description?: string;
  type?: "strength" | "improvement" | "recommendation";
}

interface CoachingTipsPanelProps {
  tips: CoachingTip[];
  /** Optional control shown under tip text (e.g. reprocess CTA). */
  action?: React.ReactNode;
}

function LightbulbIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
}

function getTipBorderColor(type?: string): string {
  if (type === "improvement") return "border-l-[var(--warning)]";
  if (type === "recommendation") return "border-l-[var(--cricket-green)]";
  return "border-l-[var(--success)]";
}

export function CoachingTipsPanel({ tips, action }: CoachingTipsPanelProps) {
  if (tips.length === 0) {
    return (
      <Card>
        <CardHeader className="flex items-center gap-2 text-[var(--text-primary)]">
          <LightbulbIcon />
          AI Coaching Tips
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--text-secondary)]">
            No coaching tips available for this shot.
          </p>
          {action ? <div className="mt-3">{action}</div> : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 text-[var(--text-primary)]">
        <LightbulbIcon />
        AI Coaching Tips
      </CardHeader>
      <CardContent className="space-y-3">
        {tips.map((tip, idx) => (
          <div
            key={idx}
            className={`rounded-r-lg border-l-4 bg-[var(--surface-secondary)] p-3 ${getTipBorderColor(tip.type)}`}
          >
            <p className="font-medium text-[var(--text-primary)]">{tip.title}</p>
            {tip.body ? (
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{tip.body}</p>
            ) : null}
            {tip.description && tip.description !== tip.body ? (
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{tip.description}</p>
            ) : null}
            {action && idx === 0 ? <div className="mt-3">{action}</div> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
