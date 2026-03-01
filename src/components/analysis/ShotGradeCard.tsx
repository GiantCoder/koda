interface ShotGradeCardProps {
  grade: string;
  score: number;
}

export default function ShotGradeCard({ grade, score }: ShotGradeCardProps) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-neutral-500">Shot Grade</span>
        <span className="rounded-full bg-red-600 px-2 py-1 text-xs text-white">{grade}</span>
      </div>
      <p className="text-2xl font-semibold">{Math.round(score)}</p>
    </div>
  );
}
