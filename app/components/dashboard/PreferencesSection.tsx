"use client";

import React from "react";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";

interface ToggleItem {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}

interface PreferencesSectionProps {
  title: string;
  toggles: ToggleItem[];
}

export function PreferencesSection({ title, toggles }: PreferencesSectionProps) {
  return (
    <Card>
      <CardHeader>{title}</CardHeader>
      <CardContent className="space-y-4">
        {toggles.map(({ id, label, description, checked, onToggle }) => (
          <div
            key={id}
            className="flex items-center justify-between gap-4 rounded-lg border border-[var(--surface-secondary)] p-4"
          >
            <div>
              <p className="font-medium text-[var(--text-primary)]">{label}</p>
              <p className="text-sm text-[var(--text-secondary)]">
                {description}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={checked}
              aria-label={`Toggle ${label}`}
              onClick={() => onToggle(!checked)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 ${
                checked ? "bg-[var(--primary)]" : "bg-[var(--surface-secondary)]"
              }`}
            >
              <span
                className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  checked ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
