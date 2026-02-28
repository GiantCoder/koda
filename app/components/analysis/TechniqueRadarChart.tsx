"use client";

import React from "react";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";

export interface RadarDataPoint {
  dimension: string;
  value: number;
  fullMark?: number;
}

interface TechniqueRadarChartProps {
  data: RadarDataPoint[];
}

function RadarIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}

export function TechniqueRadarChart({ data }: TechniqueRadarChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    fullMark: d.fullMark ?? 100,
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="flex items-center gap-2 text-[var(--text-primary)]">
          <RadarIcon />
          Technique Analysis
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--text-secondary)]">
            No technique data available for this shot.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 text-[var(--text-primary)]">
        <RadarIcon />
        Technique Analysis
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {chartData.map((item) => {
            const pct = Math.max(
              0,
              Math.min(100, Math.round((item.value / item.fullMark) * 100))
            );
            return (
              <div key={item.dimension}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-[var(--text-primary)]">{item.dimension}</span>
                  <span className="text-[var(--text-secondary)]">{item.value}/100</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--surface-secondary)]">
                  <div
                    className="h-full rounded-full bg-[var(--cricket-green)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
