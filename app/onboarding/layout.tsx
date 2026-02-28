"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { OnboardingStepper } from "@/app/components/onboarding/OnboardingStepper";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--background)] p-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-[var(--primary)]">
            Koda Cricket
          </Link>
          <Link
            href="/login"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--primary)]"
          >
            Sign In
          </Link>
        </div>
        <OnboardingStepper currentPath={pathname ?? ""} />
        {children}
      </div>
    </div>
  );
}
