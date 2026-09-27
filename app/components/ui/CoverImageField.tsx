"use client";

import React from "react";
import { getCoverSrc } from "@/app/lib/cover-image";

interface CoverImageFieldProps {
  label?: string;
  bannerFileName?: string | null;
  bannerImageUrl?: string | null;
  disabled?: boolean;
  error?: string | null;
  onFile: (file: File | null) => void;
}

export function CoverImageField({
  label = "Background image",
  bannerFileName,
  bannerImageUrl,
  disabled,
  error,
  onFile,
}: CoverImageFieldProps) {
  const preview = getCoverSrc({ bannerFileName, bannerImageUrl });

  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-primary)]">{label}</label>
      <input
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml"
        disabled={disabled}
        onChange={(event) => onFile(event.target.files?.[0] ?? null)}
        className="mt-1 block w-full text-sm text-[var(--text-secondary)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--surface-secondary)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--text-primary)]"
      />
      <p className="mt-1 text-xs text-[var(--text-secondary)]">
        {bannerFileName || "Optional. PNG, JPG, or SVG, 2MB or less."}
      </p>
      {preview ? (
        <div className="relative mt-2 h-24 overflow-hidden rounded-lg border border-[var(--surface-secondary)]">
          <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      ) : null}
      {error ? <p className="mt-1 text-xs text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
