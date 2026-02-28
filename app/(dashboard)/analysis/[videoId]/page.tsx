"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";

/**
 * Placeholder for Shot Analysis Results (Module 4.10).
 * Linked from processing completion redirect.
 */
export default function AnalysisResultsPage() {
  const params = useParams();
  const videoId = typeof params.videoId === "string" ? params.videoId : null;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Analysis Complete
        </h1>
        <p className="mt-1 text-[var(--text-secondary)]">
          {videoId
            ? `Results for video ${videoId} will appear here.`
            : "No video selected."}
        </p>
      </div>

      <Card>
        <CardHeader>Shot Analysis Results</CardHeader>
        <CardContent>
          <p className="text-[var(--text-secondary)]">
            The full shot analysis view (video player, grade card, coaching tips,
            radar chart) will be implemented in a future module.
          </p>
          <div className="mt-4 flex gap-2">
            <Link href="/upload">
              <Button>Analyse Another Shot</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="secondary">Back to Dashboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
