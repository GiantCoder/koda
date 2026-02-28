"use client";

import React from "react";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";

export interface ShotTag {
  label: string;
  type?: "strength" | "improvement" | "neutral";
}

interface TagStripProps {
  tags: ShotTag[];
}

function TagIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
      />
    </svg>
  );
}

function getTagStyles(type?: string): string {
  if (type === "strength") return "bg-[var(--success)]/20 text-[var(--success)] border-[var(--success)]/30";
  if (type === "improvement") return "bg-[var(--warning)]/20 text-[var(--warning)] border-[var(--warning)]/30";
  return "bg-[var(--surface-secondary)] text-[var(--text-secondary)] border-[var(--surface-secondary)]";
}

export function TagStrip({ tags }: TagStripProps) {
  if (tags.length === 0) {
    return (
      <Card>
        <CardHeader className="flex items-center gap-2 text-[var(--text-primary)]">
          <TagIcon />
          Auto-Generated Tags
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--text-secondary)]">
            No tags generated for this shot.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 text-[var(--text-primary)]">
        <TagIcon />
        Auto-Generated Tags
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, idx) => (
            <span
              key={idx}
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getTagStyles(tag.type)}`}
            >
              #{tag.label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
