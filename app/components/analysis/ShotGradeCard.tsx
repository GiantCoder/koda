"use client";

import React from "react";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";

export interface MetricScore {
  label: string;
  value: number;
  max?: number;
}

interface ShotGradeCardProps {
  gradeLetter: string;
  starRating: number;
  maxStars?: number;
  metrics: MetricScore[];
  overallScore: number;
}

function getGradeColor(letter: string): string {
  const upper = letter.toUpperCase();
  if (upper === "A" || upper === "A+") return "var(--success)";
  if (upper === "B+" || upper === "B") return "var(--success)";
  if (upper === "C+" || upper === "C") return "var(--warning)";
  return "var(--text-secondary)";
}

function getScoreColor(value: number): string {
  if (value >= 85) return "var(--success)";
  if (value >= 65) return "var(--warning)";
  return "var(--text-secondary)";
}

export function ShotGradeCard({
  gradeLetter,
  starRating,
  maxStars = 5,
  metrics,
  overallScore,
}: ShotGradeCardProps) {
  const gradeColor = getGradeColor(gradeLetter);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <span className="text-lg font-semibold text-[var(--text-primary)]">
          Shot Quality
        </span>
        <div className="flex gap-0.5" aria-label={`${starRating} out of ${maxStars} stars`}>
          {Array.from({ length: maxStars }).map((_, i) => (
            <svg
              key={i}
              className="h-5 w-5"
              fill={i < starRating ? "var(--warning)" : "var(--surface-secondary)"}
              viewBox="0 0 20 20"
              aria-hidden
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-3xl font-bold text-white"
            style={{ backgroundColor: gradeColor }}
            aria-label={`Grade ${gradeLetter}`}
          >
            {gradeLetter}
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Overall Score</p>
            <p
              className="text-2xl font-bold"
              style={{ color: getScoreColor(overallScore) }}
            >
              {overallScore.toFixed(1)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {metrics.map((m) => (
            <div key={m.label} className="flex items-center justify-between gap-2">
              <span className="text-sm text-[var(--text-secondary)]">{m.label}</span>
              <span
                className="text-sm font-medium tabular-nums"
                style={{ color: getScoreColor(m.value) }}
              >
                {Math.round(m.value)}/{m.max ?? 100}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
