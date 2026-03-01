interface RadarPoint {
  label: string;
  value: number;
}

interface TechniqueRadarChartProps {
  points: RadarPoint[];
}

function widthClass(value: number): string {
  if (value >= 90) return "w-11/12";
  if (value >= 80) return "w-10/12";
  if (value >= 70) return "w-9/12";
  if (value >= 60) return "w-8/12";
  if (value >= 50) return "w-7/12";
  if (value >= 40) return "w-6/12";
  if (value >= 30) return "w-5/12";
  if (value >= 20) return "w-4/12";
  if (value >= 10) return "w-3/12";
  return "w-2/12";
}

export default function TechniqueRadarChart({ points }: TechniqueRadarChartProps) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-neutral-100">
      <h3 className="mb-3 text-sm font-semibold">Technique Dimensions</h3>
      <div className="space-y-2">
        {points.map((point) => (
          <div key={point.label}>
            <div className="mb-1 flex justify-between text-xs">
              <span>{point.label}</span>
              <span>{point.value}</span>
            </div>
            <div className="h-2 rounded bg-neutral-700">
              <div className={`h-2 rounded bg-green-500 ${widthClass(point.value)}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
