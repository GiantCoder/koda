"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/Button";
import { buildMockAuthHeaders } from "@/app/lib/mock-auth-headers";
import type { MockUser } from "@/app/lib/mock-auth";

export type ReprocessActivity = "BATTING" | "BOWLING";

interface ReprocessActivityButtonProps {
  analysisId: string;
  user: MockUser | null;
  forceActivity: ReprocessActivity;
  className?: string;
}

export function ReprocessActivityButton({
  analysisId,
  user,
  forceActivity,
  className = "",
}: ReprocessActivityButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label =
    forceActivity === "BATTING"
      ? "Reprocess as batting video"
      : "Reprocess as bowling video";

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/analysis/${analysisId}/reprocess`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildMockAuthHeaders(user),
        },
        body: JSON.stringify({ forceActivity }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        redirectUrl?: string;
        videoId?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? `Reprocess failed (${res.status})`);
      }
      router.push(data.redirectUrl ?? `/analysis/${data.videoId}/processing`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reprocess failed");
      setBusy(false);
    }
  };

  return (
    <span className={`inline-flex flex-col items-start gap-1 ${className}`}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={busy}
        onClick={() => void handleClick()}
        className="cursor-pointer whitespace-nowrap"
      >
        {busy ? "Reprocessing…" : label}
      </Button>
      {error ? (
        <span className="text-[11px] text-[var(--danger)]">{error}</span>
      ) : null}
    </span>
  );
}

/** Offer forcing the batting pipeline (wrongly treated as bowling / pose on bowler). */
export function shouldOfferReprocessAsBatting(input: {
  activityType?: string | null;
  overlayStatusText?: string | null;
  tipTexts?: string[];
}): boolean {
  if (input.activityType === "BOWLING") return true;
  if (
    input.overlayStatusText &&
    /foreground coach\/bowler was masked|distant batter too small/i.test(
      input.overlayStatusText
    )
  ) {
    return true;
  }
  const joined = (input.tipTexts ?? []).join(" ");
  return /pose tracking focused on the bowler|heavily constrained/i.test(joined);
}

/** Offer forcing the bowling pipeline (bowling clip analysed as batting). */
export function shouldOfferReprocessAsBowling(input: {
  activityType?: string | null;
}): boolean {
  return input.activityType === "BATTING";
}
