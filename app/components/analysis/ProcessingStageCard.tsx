"use client";

import React from "react";
import type { AnalysisStage } from "@/app/lib/useAnalysisStatus";
import { getStageLabel, getStageIndex } from "@/app/lib/useAnalysisStatus";

function CheckIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SpinnerIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function CircleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

function XIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

interface ProcessingStageCardProps {
  stage: AnalysisStage;
  label: string;
  isComplete: boolean;
  isActive: boolean;
  isFailed: boolean;
  isLast?: boolean;
}

export function ProcessingStageCard({
  stage,
  label,
  isComplete,
  isActive,
  isFailed,
  isLast = false,
}: ProcessingStageCardProps) {
  const getIcon = () => {
    if (isFailed) return <XIcon className="h-5 w-5 text-[var(--danger)]" />;
    if (isComplete) return <CheckIcon className="h-5 w-5 text-[var(--success)]" />;
    if (isActive) return <SpinnerIcon className="h-5 w-5 text-[var(--primary)]" />;
    return <CircleIcon className="h-5 w-5 text-[var(--text-secondary)]" />;
  };

  return (
    <div className="flex">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            isFailed
              ? "bg-[var(--danger)]/20"
              : isComplete
                ? "bg-[var(--success)]/20"
                : isActive
                  ? "bg-[var(--primary)]/20"
                  : "bg-[var(--surface-secondary)]"
          }`}
        >
          {getIcon()}
        </div>
        {!isLast && (
          <div
            className={`mt-1 h-8 w-0.5 flex-1 ${
              isComplete ? "bg-[var(--success)]" : "bg-[var(--surface-secondary)]"
            }`}
          />
        )}
      </div>
      <div className="ml-4 pb-8">
        <p
          className={`font-medium ${
            isFailed
              ? "text-[var(--danger)]"
              : isComplete
                ? "text-[var(--success)]"
                : isActive
                  ? "text-[var(--primary)]"
                  : "text-[var(--text-secondary)]"
          }`}
        >
          {label}
        </p>
        {isActive && (
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            In progress…
          </p>
        )}
      </div>
    </div>
  );
}

interface ProcessingTimelineProps {
  currentStage: AnalysisStage;
  error?: string;
  activityType?: string | null;
}

const PIPELINE_STAGES: AnalysisStage[] = [
  "upload_complete",
  "extracting_frames",
  "activity_classification",
  "pose_analysis",
  "shot_classification",
  "generating_feedback",
];

export function ProcessingTimeline({
  currentStage,
  error,
  activityType,
}: ProcessingTimelineProps) {
  const currentIndex = getStageIndex(currentStage);
  const hasFailed = currentStage === "failed" || !!error;
  const isComplete = currentStage === "complete";

  return (
    <div className="space-y-0">
      {PIPELINE_STAGES.map((stage, i) => {
        const stageComplete = isComplete || i < currentIndex;
        const stageActive = !hasFailed && !isComplete && i === currentIndex;
        const stageFailed = hasFailed && i === currentIndex;

        return (
          <ProcessingStageCard
            key={stage}
            stage={stage}
            label={getStageLabel(stage, activityType)}
            isComplete={stageComplete}
            isActive={stageActive}
            isFailed={stageFailed}
            isLast={i === PIPELINE_STAGES.length - 1}
          />
        );
      })}
    </div>
  );
}
