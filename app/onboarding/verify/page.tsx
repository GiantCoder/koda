"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Select } from "@/app/components/ui/Select";

const DAYS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));
const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => ({
  value: String(currentYear - i),
  label: String(currentYear - i),
}));

export default function VerifyPage() {
  const router = useRouter();
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const isValid = day && month && year;

  const handleNext = () => {
    if (!isValid) return;
    const birthYear = parseInt(year, 10);
    const age = currentYear - birthYear;
    // Under 13: parental consent flow
    if (age < 13) router.push("/onboarding/consent");
    // 13–17: lighter consent (GDPR teen)
    else if (age < 18) router.push("/onboarding/consent");
    // 18+: skip to privacy
    else router.push("/onboarding/privacy");
  };

  return (
    <Card>
      <CardHeader>Age Verification</CardHeader>
      <CardContent>
        <p className="mb-6 text-sm text-[var(--text-secondary)]">
          Enter your date of birth so we can apply the correct privacy settings.
        </p>
        <div className="mb-6 grid grid-cols-3 gap-4">
          <Select label="Day" options={DAYS} value={day} onChange={(e) => setDay(e.target.value)} />
          <Select
            label="Month"
            options={MONTHS}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <Select label="Year" options={YEARS} value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
        <div className="mb-6 rounded-lg bg-[var(--surface-secondary)] p-4 text-sm text-[var(--text-secondary)]">
          <strong>Privacy Protection:</strong> Your date of birth is never stored in plain text
          locally. It is only submitted securely to our servers.
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => router.push("/onboarding/role")}>
            Back
          </Button>
          <Button onClick={handleNext} disabled={!isValid}>
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
