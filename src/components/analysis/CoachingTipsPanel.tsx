interface Tip {
  type: "strength" | "improvement";
  title: string;
  description: string;
}

interface CoachingTipsPanelProps {
  tips: Tip[];
}

export default function CoachingTipsPanel({ tips }: CoachingTipsPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {tips.map((tip) => (
        <article
          key={tip.title}
          className={`rounded-lg border-l-4 p-3 ${
            tip.type === "strength" ? "border-green-500 bg-green-50" : "border-amber-500 bg-amber-50"
          }`}
        >
          <h4 className="text-sm font-semibold">{tip.title}</h4>
          <p className="text-sm">{tip.description}</p>
        </article>
      ))}
    </div>
  );
}
