"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";

type Role = "player" | "parent" | "coach";

const ROLES: { id: Role; label: string; description: string }[] = [
  { id: "player", label: "Player", description: "I'm a young cricketer aged 7–18" },
  { id: "parent", label: "Parent", description: "I manage my child's cricket journey" },
  { id: "coach", label: "Coach", description: "I coach and support players" },
];

export default function RolePage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const handleNext = () => {
    if (selectedRole) router.push("/onboarding/verify");
  };

  return (
    <Card>
      <CardHeader>Choose Your Role</CardHeader>
      <CardContent>
        <p className="mb-6 text-sm text-[var(--text-secondary)]">
          Select one role to determine your experience.
        </p>
        <div className="mb-6 flex flex-col gap-3">
          {ROLES.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => setSelectedRole(role.id)}
              className={`rounded-lg border-2 p-4 text-left transition-colors ${
                selectedRole === role.id
                  ? "border-[var(--primary)] bg-[var(--surface-secondary)]"
                  : "border-[var(--surface-secondary)] hover:border-[var(--text-secondary)]"
              }`}
            >
              <span className="block font-semibold text-[var(--text-primary)]">
                {role.label}
              </span>
              <span className="block text-sm text-[var(--text-secondary)]">
                {role.description}
              </span>
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => router.back()}>
            Back
          </Button>
          <Button onClick={handleNext} disabled={!selectedRole}>
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
