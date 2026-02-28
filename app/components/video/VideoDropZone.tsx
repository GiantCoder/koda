"use client";

import React, { useCallback, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Progress } from "@/app/components/ui/Progress";
import {
  validateVideoFile,
  formatFileSize,
  ACCEPTED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
} from "@/app/lib/video-validators";

function CloudUploadIcon({ className = "h-12 w-12" }: { className?: string }) {
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
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  );
}

function FolderIcon({ className = "h-5 w-5" }: { className?: string }) {
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
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  );
}

export interface VideoDropZoneProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  onValidationError: (message: string) => void;
  uploadProgress?: number;
  isUploading?: boolean;
  disabled?: boolean;
}

export function VideoDropZone({
  file,
  onFileSelect,
  onValidationError,
  uploadProgress = 0,
  isUploading = false,
  disabled = false,
}: VideoDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleValidation = useCallback(
    (f: File) => {
      const result = validateVideoFile(f);
      if (!result.valid) {
        onValidationError(result.error ?? "Invalid file");
        return false;
      }
      onValidationError("");
      return true;
    },
    [onValidationError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled || isUploading) return;
      const dropped = e.dataTransfer.files[0];
      if (!dropped) return;
      if (handleValidation(dropped)) {
        onFileSelect(dropped);
      }
    },
    [disabled, isUploading, handleValidation, onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (!selected) return;
      if (handleValidation(selected)) {
        onFileSelect(selected);
      }
      e.target.value = "";
    },
    [handleValidation, onFileSelect]
  );

  const handleBrowse = useCallback(() => {
    if (disabled || isUploading) return;
    document.getElementById("video-file-input")?.click();
  }, [disabled, isUploading]);

  const handleClear = useCallback(() => {
    if (isUploading) return;
    onFileSelect(null);
    onValidationError("");
  }, [isUploading, onFileSelect, onValidationError]);

  const formatChips = ["MP4", "MOV", "AVI", `Max ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`];

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative flex min-h-[240px] flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
          isDragging
            ? "border-[var(--primary)] bg-[var(--primary)]/5"
            : "border-[var(--surface-secondary)] bg-[var(--surface-secondary)]/50"
        } ${disabled || isUploading ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
        role="button"
        tabIndex={0}
        onClick={handleBrowse}
        onKeyDown={(e) => e.key === "Enter" && handleBrowse()}
        aria-label="Drop your video here or click to browse files"
      >
        <input
          id="video-file-input"
          type="file"
          accept={ACCEPTED_EXTENSIONS.map((e) => `*${e}`).join(",")}
          className="sr-only"
          onChange={handleFileInput}
          disabled={disabled || isUploading}
        />

        {!file ? (
          <>
            <CloudUploadIcon className="h-16 w-16 text-[var(--cricket-green)]" />
            <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
              Drop your video here
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              or click to browse files
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {formatChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]"
                >
                  {chip}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center px-4">
            <p className="text-center font-medium text-[var(--text-primary)]">
              {file.name}
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {formatFileSize(file.size)}
            </p>
            {isUploading && (
              <div className="mt-4 w-full max-w-xs">
                <Progress value={uploadProgress} showLabel />
              </div>
            )}
            {!isUploading && (
              <Button
                variant="ghost"
                className="mt-4 text-[var(--danger)] hover:bg-[var(--danger)]/10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
              >
                Remove file
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={handleBrowse}
          disabled={disabled || isUploading}
          className="gap-2"
        >
          <FolderIcon />
          Choose File
        </Button>
      </div>
    </div>
  );
}
