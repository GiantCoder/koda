interface Annotation {
  id: string;
  timestampMs: number;
  content: string;
}

interface AnnotationPanelProps {
  annotations: Annotation[];
}

export default function AnnotationPanel({ annotations }: AnnotationPanelProps) {
  return (
    <aside className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <h3 className="mb-2 text-sm font-semibold">Annotations</h3>
      <ul className="space-y-2 text-sm">
        {annotations.map((annotation) => (
          <li key={annotation.id} className="rounded-md bg-neutral-100 p-2 dark:bg-neutral-900">
            <p className="text-xs text-neutral-500">{annotation.timestampMs}ms</p>
            <p>{annotation.content}</p>
          </li>
        ))}
      </ul>
    </aside>
  );
}
