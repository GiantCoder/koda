import React from "react";
import { Button } from "@/app/components/ui/Button";

interface SessionCardProps {
  day: number;
  title: string;
  time: string;
  attendees: string;
  isToday: boolean;
}

export function SessionCard({
  day,
  title,
  time,
  attendees,
  isToday,
}: SessionCardProps) {
  return (
    <div className="border-b border-[var(--surface-secondary)] py-4 last:border-b-0 last:pb-0 first:pt-0">
      <div className="flex gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${
            isToday
              ? "bg-[var(--primary)] text-white"
              : "bg-[var(--surface-secondary)] text-[var(--text-primary)]"
          }`}
        >
          {day}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-[var(--text-primary)]">{title}</h3>
          <p className="text-sm text-[var(--text-secondary)]">{time}</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {attendees}
          </p>
          <div className="mt-3">
            {isToday ? (
              <Button variant="primary" className="text-sm">
                Start Session
              </Button>
            ) : (
              <Button variant="secondary" className="text-sm">
                View Details
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
