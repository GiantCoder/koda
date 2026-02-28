import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, id, className = "", ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, "-");

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1 block text-sm font-medium text-[var(--text-primary)]"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full rounded-md border border-[var(--surface-secondary)] bg-[var(--surface)] px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-50 ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
