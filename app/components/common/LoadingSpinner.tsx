"use client";

import React from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-10 w-10",
  lg: "h-16 w-16",
};

export function LoadingSpinner({ size = "md", className = "" }: LoadingSpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-[var(--surface-secondary)] border-t-[var(--primary)] ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
