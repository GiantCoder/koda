"use client";

import Link from "next/link";

const STEPS = [
  { path: "/onboarding/role", label: "Role" },
  { path: "/onboarding/verify", label: "Verify" },
  { path: "/onboarding/consent", label: "Consent" },
  { path: "/onboarding/verify-consent", label: "Verify Consent" },
  { path: "/onboarding/privacy", label: "Privacy" },
  { path: "/onboarding/profile", label: "Profile" },
] as const;

interface OnboardingStepperProps {
  currentPath: string;
}

export function OnboardingStepper({ currentPath }: OnboardingStepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.path === currentPath);
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;

  return (
    <nav aria-label="Onboarding progress" className="mb-8">
      <ol className="flex flex-wrap items-center gap-2">
        {STEPS.map((step, index) => {
          const isActive = index === activeIndex;
          const isPast = index < activeIndex;
          return (
            <li key={step.path} className="flex items-center">
              <Link
                href={step.path}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--primary)] text-white"
                    : isPast
                      ? "bg-[var(--surface-secondary)] text-[var(--text-primary)]"
                      : "bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
                }`}
              >
                {step.label}
              </Link>
              {index < STEPS.length - 1 && (
                <span className="mx-1 text-[var(--text-secondary)]">→</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
