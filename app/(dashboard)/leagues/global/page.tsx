"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";

const AGE_GROUPS = [
  { value: "UNDER_10", label: "Under 10" },
  { value: "UNDER_12", label: "Under 12" },
  { value: "UNDER_14", label: "Under 14" },
  { value: "UNDER_16", label: "Under 16" },
  { value: "UNDER_18", label: "Under 18" },
  { value: "SENIOR", label: "Senior" },
] as const;

interface TableEntry {
  id: string;
  userId: string;
  points: number;
  goldStars: number;
  analysisCount: number;
  currentRank: number | null;
  user: { id: string; displayName: string | null; avatarUrl?: string | null };
}

interface GlobalResponse {
  entries: TableEntry[];
  nextCursor: string | null;
}

const PAGE_SIZE = 20;

function ChevronRightIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default function GlobalLeaderboardPage() {
  const searchParams = useSearchParams();
  const ageGroupParam = searchParams.get("ageGroup");
  const initialAgeGroup =
    AGE_GROUPS.some((g) => g.value === ageGroupParam) ? ageGroupParam! : "SENIOR";

  const [ageGroup, setAgeGroup] = useState(initialAgeGroup);
  const [entries, setEntries] = useState<TableEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTable = useCallback(
    async (cursor: string | null, append: boolean) => {
      setError(null);
      if (!append) setLoading(true);
      else setLoadingMore(true);
      try {
        const url = new URL("/api/leagues/global", window.location.origin);
        url.searchParams.set("ageGroup", ageGroup);
        url.searchParams.set("limit", String(PAGE_SIZE));
        if (cursor) url.searchParams.set("cursor", cursor);
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error("Failed to load leaderboard");
        const json = (await res.json()) as GlobalResponse;
        if (append) {
          setEntries((prev) => [...prev, ...json.entries]);
        } else {
          setEntries(json.entries);
        }
        setNextCursor(json.nextCursor);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load leaderboard");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [ageGroup]
  );

  useEffect(() => {
    void loadTable(null, false);
  }, [loadTable]);

  const loadMore = () => {
    if (nextCursor) void loadTable(nextCursor, true);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/leagues"
          className="text-sm font-medium text-[var(--primary)] hover:underline"
        >
          ← Leagues
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <span>Global leaderboard</span>
          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--text-secondary)]">Age group:</label>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="rounded-md border border-[var(--surface-secondary)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            >
              {AGE_GROUPS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading && entries.length === 0 ? (
            <p className="text-[var(--text-secondary)]">Loading…</p>
          ) : error ? (
            <p className="text-[var(--danger)]">{error}</p>
          ) : entries.length === 0 ? (
            <p className="text-[var(--text-secondary)]">
              No entries yet for this age group. Complete analyses to climb the board!
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--surface-secondary)]">
                      <th className="py-3 pr-4 font-medium text-[var(--text-secondary)]">Rank</th>
                      <th className="py-3 pr-4 font-medium text-[var(--text-secondary)]">Player</th>
                      <th className="py-3 pr-4 font-medium text-[var(--text-secondary)]">Points</th>
                      <th className="py-3 pr-4 font-medium text-[var(--text-secondary)]">Gold stars</th>
                      <th className="py-3 font-medium text-[var(--text-secondary)]">Analyses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, index) => (
                      <tr
                        key={entry.id}
                        className="border-b border-[var(--surface-secondary)]"
                      >
                        <td className="py-3 pr-4 font-medium text-[var(--text-primary)]">
                          {entry.currentRank ?? index + 1}
                        </td>
                        <td className="py-3 pr-4 text-[var(--text-primary)]">
                          {entry.user.displayName || "Player"}
                        </td>
                        <td className="py-3 pr-4 text-[var(--text-primary)]">{entry.points}</td>
                        <td className="py-3 pr-4 text-[var(--text-primary)]">{entry.goldStars}</td>
                        <td className="py-3 text-[var(--text-primary)]">{entry.analysisCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {nextCursor && (
                <div className="mt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={loadingMore}
                    onClick={loadMore}
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                    <ChevronRightIcon />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
