"use client";

import React, { useEffect } from "react";
import { Button } from "@/app/components/ui/Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, isLoading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={isLoading ? undefined : onCancel}
    >
      <div
        role="alertdialog"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className="w-full max-w-md rounded-xl border border-[var(--surface-secondary)] bg-[var(--surface)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="confirm-dialog-title"
          className="text-lg font-semibold text-[var(--text-primary)]"
        >
          {title}
        </h3>
        <p
          id="confirm-dialog-desc"
          className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]"
        >
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className={
              variant === "danger"
                ? "bg-[var(--danger)] hover:bg-[var(--danger)]/90"
                : "bg-[var(--primary)] hover:bg-[var(--primary-hover)]"
            }
          >
            {isLoading ? "Please wait…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
