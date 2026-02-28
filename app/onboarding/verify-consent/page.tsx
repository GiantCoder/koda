"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";

export default function VerifyConsentPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"pending" | "approved">("pending");

  useEffect(() => {
    if (status === "approved") router.push("/onboarding/privacy");
  }, [status, router]);

  const handleRefresh = () => {
    setStatus("approved");
  };

  const handleAlreadyApproved = () => {
    router.push("/onboarding/privacy");
  };

  if (status === "approved") {
    return (
      <Card>
        <CardContent>
          <p className="text-[var(--text-secondary)]">Redirecting...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>Verify Consent Request</CardHeader>
      <CardContent>
        <p className="mb-6 text-sm text-[var(--text-secondary)]">
          We&apos;ve sent a consent request to <strong>parent@***.com</strong>.
          Ask your parent or guardian to check their email.
        </p>
        <div className="mb-6 flex flex-col gap-3">
          <Button onClick={handleRefresh} variant="secondary" className="w-full">
            Refresh Status
          </Button>
          <Button variant="ghost" className="w-full">
            Resend Email
          </Button>
          <Button variant="ghost" className="w-full">
            Change Email
          </Button>
        </div>
        <div className="rounded-lg border border-[var(--surface-secondary)] p-4">
          <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">
            Already Approved?
          </p>
          <p className="mb-3 text-sm text-[var(--text-secondary)]">
            If your parent has already approved, click below to continue.
          </p>
          <Button variant="secondary" onClick={handleAlreadyApproved}>
            Continue to Privacy
          </Button>
        </div>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => router.push("/onboarding/consent")}
        >
          Back
        </Button>
      </CardContent>
    </Card>
  );
}
