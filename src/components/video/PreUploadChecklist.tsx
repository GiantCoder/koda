const items = ["Clear camera angle", "Stable tripod", "Good lighting", "Full body in frame"];

export default function PreUploadChecklist() {
  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <h3 className="mb-2 text-sm font-semibold">Pre-upload checklist</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm">
            <input type="checkbox" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
