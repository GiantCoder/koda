interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function Avatar({ name, src, size = "md", className = "" }: AvatarProps) {
  const dimensionClass =
    size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-12 w-12 text-base" : "h-10 w-10 text-sm";

  const normalizedSrc = src?.trim() ? src : null;
  const initials = getInitials(name);

  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-full bg-[var(--surface-secondary)] font-semibold text-[var(--text-primary)] ${dimensionClass} ${className}`}
      aria-label={name}
      title={name}
    >
      {normalizedSrc ? (
        <img
          src={normalizedSrc}
          alt={name}
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
            const fallbackNode = event.currentTarget.nextElementSibling as HTMLSpanElement | null;
            if (fallbackNode) {
              fallbackNode.style.display = "inline";
            }
          }}
        />
      ) : null}
      <span style={{ display: normalizedSrc ? "none" : "inline" }}>{initials}</span>
    </div>
  );
}
