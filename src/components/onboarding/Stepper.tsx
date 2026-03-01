interface StepperProps {
  currentStep: 1 | 2 | 3 | 4;
}

const labels = ["Role", "Verify", "Consent", "Profile"];

export default function Stepper({ currentStep }: StepperProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      {labels.map((label, index) => {
        const step = index + 1;
        const active = step <= currentStep;
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${
                active ? "bg-red-600 text-white" : "bg-neutral-200 text-neutral-600"
              }`}
            >
              {step}
            </div>
            <span className="text-xs">{label}</span>
            {step < labels.length ? <div className="h-px flex-1 bg-neutral-300" /> : null}
          </div>
        );
      })}
    </div>
  );
}
