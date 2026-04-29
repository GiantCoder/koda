"use client";

import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { MAX_DECLARED_SHOTS } from "@/src/lib/cricket/upload-declared-shots";
import { SHOT_TYPE_HINT_OPTIONS } from "@/src/lib/cricket/shot-types";

interface UploadShotHintsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (declaredShotCount: number, hints: string[]) => void;
}

const SHOT_COUNT_OPTIONS = Array.from({ length: MAX_DECLARED_SHOTS }, (_, i) => i + 1);

export function UploadShotHintsModal({ isOpen, onClose, onConfirm }: UploadShotHintsModalProps) {
  const [shotCount, setShotCount] = useState(1);
  const [hints, setHints] = useState<string[]>(["UNKNOWN"]);

  useEffect(() => {
    if (!isOpen) return;
    setShotCount(1);
    setHints(["UNKNOWN"]);
  }, [isOpen]);

  const handleShotCountChange = (n: number) => {
    setShotCount(n);
    setHints((prev) => {
      if (n === prev.length) return prev;
      if (n > prev.length) {
        return [...prev, ...Array(n - prev.length).fill("UNKNOWN")];
      }
      return prev.slice(0, n);
    });
  };

  const updateHint = (index: number, value: string) => {
    setHints((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-[var(--surface-primary)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-shot-hints-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="upload-shot-hints-title" className="text-xl font-bold text-[var(--text-primary)]">
              Shots in this clip
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              If the video has more than one batting stroke, tell us how many and what you were practising for
              each (in order). This helps the model interpret the pose timeline. Shadow Batting uploads skip this
              because they already target a single shot.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <label htmlFor="upload-declared-shot-count" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
            Number of distinct strokes
          </label>
          <select
            id="upload-declared-shot-count"
            value={shotCount}
            onChange={(e) => handleShotCountChange(Number(e.target.value))}
            className="w-full rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface)] px-4 py-2 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          >
            {SHOT_COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--text-primary)]">Hint per stroke (chronological order)</p>
          {hints.map((hint, index) => (
            <div key={index}>
              <label
                htmlFor={`upload-shot-hint-${index}`}
                className="mb-1 block text-xs text-[var(--text-secondary)]"
              >
                Stroke {index + 1}
              </label>
              <select
                id={`upload-shot-hint-${index}`}
                value={hint}
                onChange={(e) => updateHint(index, e.target.value)}
                className="w-full rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                {SHOT_TYPE_HINT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[var(--primary)] hover:bg-[var(--primary-hover)]"
            onClick={() => onConfirm(shotCount, hints)}
          >
            Upload &amp; analyze
          </Button>
        </div>
      </div>
    </div>
  );
}
