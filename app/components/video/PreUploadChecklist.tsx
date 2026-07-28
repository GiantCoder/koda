const CHECKLIST_ITEMS = [
  "Video shows full body in frame",
  "Good lighting conditions",
  "Minimal background clutter",
  "At least 10 seconds of footage",
];

function CheckmarkIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.5 8.5L6.5 11.5L12.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Compact non-interactive checklist shown under the Video Upload heading. */
export function PreUploadChecklist() {
  return (
    <div className="mb-4 -mt-2">
      <p className="text-sm text-[var(--text-secondary)]">
        Ensure your video meets these criteria for accurate technique analysis:
      </p>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
        {CHECKLIST_ITEMS.map((item) => (
          <li
            key={item}
            className="flex items-center gap-1.5 text-xs text-[var(--text-primary)]"
          >
            <span className="text-white">
              <CheckmarkIcon />
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
