"use client";

import React from "react";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";

function VideoCameraIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
    </svg>
  );
}

function CheckCircleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="10" strokeWidth={2} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function BestCameraAngleCard() {
  return (
    <Card className="border-[var(--cricket-green)]/20 bg-[var(--surface)]">
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--cricket-green)]/20">
            <VideoCameraIcon className="h-5 w-5 text-[var(--cricket-green)]" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-[var(--text-primary)]">
              Best Camera Angle
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              For optimal analysis results, position your camera:
            </p>
          </div>
        </div>

        <div className="relative rounded-lg bg-[#2A2F3C] p-6">
          <svg viewBox="0 0 240 180" className="w-full">
            <rect x="60" y="20" width="120" height="140" fill="#3A4150" stroke="#4A5568" strokeWidth="2" rx="4" />
            
            <line x1="120" y1="20" x2="120" y2="160" stroke="#4A5568" strokeWidth="1" strokeDasharray="4 4" />
            
            <line x1="60" y1="50" x2="180" y2="50" stroke="#4A5568" strokeWidth="1" />
            <line x1="60" y1="130" x2="180" y2="130" stroke="#4A5568" strokeWidth="1" />
            
            <circle cx="120" cy="90" r="8" fill="#10B981" stroke="#34D399" strokeWidth="2" />
            <text x="120" y="95" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">B</text>
            
            <circle cx="120" cy="140" r="6" fill="#E63946" />
            
            <line x1="120" y1="30" x2="120" y2="80" stroke="#34D399" strokeWidth="2" markerEnd="url(#arrowgreen)" />
            
            <defs>
              <marker id="arrowgreen" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#34D399" />
              </marker>
            </defs>
            
            <text x="120" y="15" textAnchor="middle" fill="#34D399" fontSize="11" fontWeight="600">Batsman's End</text>
          </svg>
          
          <div className="absolute bottom-3 right-3 rounded-md bg-[var(--cricket-green)] px-3 py-1 text-xs font-semibold text-white">
            Behind the bowler&apos;s end stumps
          </div>
        </div>

        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm">
            <CheckCircleIcon className="mt-0.5 shrink-0 text-[var(--cricket-green)]" />
            <span className="text-[var(--text-secondary)]">Side-on view of batting stance</span>
          </li>
          <li className="flex items-start gap-2 text-sm">
            <CheckCircleIcon className="mt-0.5 shrink-0 text-[var(--cricket-green)]" />
            <span className="text-[var(--text-secondary)]">Clear view of foot movement</span>
          </li>
          <li className="flex items-start gap-2 text-sm">
            <CheckCircleIcon className="mt-0.5 shrink-0 text-[var(--cricket-green)]" />
            <span className="text-[var(--text-secondary)]">Captures full shot execution</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
