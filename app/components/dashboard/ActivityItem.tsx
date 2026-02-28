import React from "react";

interface ActivityItemProps {
  text: string;
  time: string;
  dotColor?: "red" | "blue" | "green";
}

const dotColors = {
  red: "bg-[var(--primary)]",
  blue: "bg-blue-500",
  green: "bg-[var(--success)]",
};

export function ActivityItem({
  text,
  time,
  dotColor = "blue",
}: ActivityItemProps) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColors[dotColor]}`}
      />
      <div>
        <p className="text-sm text-[var(--text-primary)]">{text}</p>
        <p className="text-xs text-[var(--text-secondary)]">{time}</p>
      </div>
    </div>
  );
}
