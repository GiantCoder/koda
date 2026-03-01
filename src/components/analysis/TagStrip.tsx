interface Tag {
  label: string;
  kind: "strength" | "improvement" | "neutral";
}

interface TagStripProps {
  tags: Tag[];
}

export default function TagStrip({ tags }: TagStripProps) {
  return (
    <div className="flex gap-2 overflow-x-auto py-1">
      {tags.map((tag) => (
        <span
          key={tag.label}
          className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${
            tag.kind === "strength"
              ? "bg-green-200 text-green-900"
              : tag.kind === "improvement"
                ? "bg-amber-200 text-amber-900"
                : "bg-neutral-200 text-neutral-900"
          }`}
        >
          {tag.label}
        </span>
      ))}
    </div>
  );
}
