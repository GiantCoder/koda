"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Select } from "@/app/components/ui/Select";

const RELATIONSHIPS = [
  { value: "parent", label: "Parent" },
  { value: "guardian", label: "Legal Guardian" },
  { value: "other", label: "Other" },
];

export default function ConsentPage() {
  const router = useRouter();
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);

  const isValid = guardianName && guardianEmail && relationship && consentChecked;

  const handleSendEmail = () => {
    if (isValid) router.push("/onboarding/verify-consent");
  };

  const handleContinueInline = () => {
    if (isValid) router.push("/onboarding/privacy");
  };

  return (
    <Card>
      <CardHeader>Parental Consent Required</CardHeader>
      <CardContent>
        <p className="mb-6 text-sm text-[var(--text-secondary)]">
          As you are under 13, we need a parent or guardian to confirm consent.
        </p>
        <div className="mb-6 flex flex-col gap-4">
          <Input
            label="Guardian Full Name"
            value={guardianName}
            onChange={(e) => setGuardianName(e.target.value)}
            placeholder="Full name"
          />
          <Input
            label="Guardian Email"
            type="email"
            value={guardianEmail}
            onChange={(e) => setGuardianEmail(e.target.value)}
            placeholder="guardian@example.com"
          />
          <Select
            label="Relationship"
            options={RELATIONSHIPS}
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
          />
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-1 rounded border-[var(--surface-secondary)]"
            />
            <span className="text-sm text-[var(--text-secondary)]">
              I confirm that I am the parent/guardian and consent to my child using Koda Cricket.
            </span>
          </label>
        </div>
        <div className="flex flex-col gap-3">
          <Button onClick={handleSendEmail} disabled={!isValid} className="w-full">
            Send Consent Email
          </Button>
          <Button variant="secondary" onClick={handleContinueInline} disabled={!isValid} className="w-full">
            I&apos;m the Parent/Guardian on This Device
          </Button>
        </div>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => router.push("/onboarding/verify")}
        >
          Back
        </Button>
      </CardContent>
    </Card>
  );
}
