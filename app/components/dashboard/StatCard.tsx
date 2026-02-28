import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ label, value, icon, className = "" }: StatCardProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface)] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.1)] ${className}`}
    >
      {icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-secondary)] text-[var(--primary)]">
          {icon}
        </div>
      )}
      <div>
        <p className="text-sm text-[var(--text-secondary)]">{label}</p>
        <p className="text-xl font-semibold text-[var(--text-primary)]">
          {value}
        </p>
      </div>
    </div>
  );
}
