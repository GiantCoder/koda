"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Select } from "@/app/components/ui/Select";
import { setOnboardingComplete } from "@/app/lib/auth";

const POSITIONS = [
  { value: "batsman", label: "Batsman" },
  { value: "bowler", label: "Bowler" },
  { value: "all-rounder", label: "All-rounder" },
  { value: "wicket-keeper", label: "Wicket-keeper" },
];

const BATTING_STYLES = [
  { value: "right", label: "Right-handed" },
  { value: "left", label: "Left-handed" },
];

const BOWLING_STYLES = [
  { value: "fast", label: "Fast" },
  { value: "medium", label: "Medium" },
  { value: "spin", label: "Spin" },
  { value: "na", label: "N/A" },
];

const PRIVACY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "coaches-parents", label: "Coaches & Parents Only" },
  { value: "private", label: "Private" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [position, setPosition] = useState("");
  const [battingStyle, setBattingStyle] = useState("");
  const [bowlingStyle, setBowlingStyle] = useState("");
  const [clubSchool, setClubSchool] = useState("");
  const [privacy, setPrivacy] = useState("coaches-parents");

  const handleFinish = () => {
    setOnboardingComplete(true);
    router.push("/dashboard");
  };

  return (
    <Card>
      <CardHeader>Complete Your Profile</CardHeader>
      <CardContent>
        <p className="mb-6 text-sm text-[var(--text-secondary)]">
          Add a few details to personalise your experience.
        </p>
        <div className="mb-6 flex flex-col gap-4">
          <div className="rounded-lg border-2 border-dashed border-[var(--surface-secondary)] p-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              Profile photo (Take Photo / Choose from Library)
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Max 5MB, JPEG/PNG/WEBP, 1:1 aspect ratio
            </p>
          </div>
          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How others see you"
          />
          <div className="rounded-lg bg-[var(--surface-secondary)] p-4">
            <p className="mb-3 text-sm font-medium text-[var(--text-primary)]">
              Player Details
            </p>
            <div className="flex flex-col gap-3">
              <Select
                label="Primary Position"
                options={POSITIONS}
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
              <Select
                label="Batting Style"
                options={BATTING_STYLES}
                value={battingStyle}
                onChange={(e) => setBattingStyle(e.target.value)}
              />
              <Select
                label="Bowling Style"
                options={BOWLING_STYLES}
                value={bowlingStyle}
                onChange={(e) => setBowlingStyle(e.target.value)}
              />
              <Input
                label="Club / School"
                value={clubSchool}
                onChange={(e) => setClubSchool(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <Select
            label="Privacy"
            options={PRIVACY_OPTIONS}
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => router.push("/onboarding/privacy")}>
            Back
          </Button>
          <Button onClick={handleFinish}>
            Finish Setup
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
