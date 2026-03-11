"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useMockAuth } from "@/app/hooks/useMockAuth";
import { buildMockAuthHeaders } from "@/app/lib/mock-auth-headers";
import { Card, CardContent, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";

interface TableUser {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface TableEntry {
  id: string;
  userId: string;
  points: number;
  goldStars: number;
  analysisCount: number;
  currentRank: number | null;
  user: TableUser;
}

interface TableResponse {
  entries: TableEntry[];
  nextCursor: string | null;
  userEntry: TableEntry | null;
}

const PAGE_SIZE = 20;

function ChevronRightIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default function LeagueTablePage() {
  const params = useParams();
  const leagueId = params?.leagueId as string | undefined;
  const { user } = useMockAuth();

  const [entries, setEntries] = useState<TableEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [userEntry, setUserEntry] = useState<TableEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTable = useCallback(
    async (cursor: string | null, append: boolean) => {
      if (!user || !leagueId) return;
      if (!append) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const url = new URL(`/api/leagues/${leagueId}/table`, window.location.origin);
        url.searchParams.set("limit", String(PAGE_SIZE));
        if (cursor) url.searchParams.set("cursor", cursor);
        const res = await fetch(url.toString(), {
          headers: buildMockAuthHeaders(user),
        });
        if (!res.ok) {
          if (res.status === 404) throw new Error("League not found");
          if (res.status === 403) throw new Error("You are not a member of this league");
          throw new Error("Failed to load leaderboard");
        }
        const json = (await res.json()) as TableResponse;
        if (append) {
          setEntries((prev) => [...prev, ...json.entries]);
        } else {
          setEntries(json.entries);
          setUserEntry(json.userEntry ?? null);
        }
        setNextCursor(json.nextCursor);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load leaderboard");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user, leagueId]
  );

  useEffect(() => {
    if (leagueId) void loadTable(null, false);
  }, [leagueId, loadTable]);

  const loadMore = () => {
    if (nextCursor) void loadTable(nextCursor, true);
  };

  if (!leagueId) {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-[var(--danger)]">Missing league.</p>
        <Link href="/leagues" className="mt-2 inline-block text-[var(--primary)] hover:underline">
          Back to Leagues
        </Link>
      </div>
    );
  }

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
        <CardHeader>Leaderboard</CardHeader>
        <CardContent>
          {loading && entries.length === 0 ? (
            <p className="text-[var(--text-secondary)]">Loading…</p>
          ) : error ? (
            <>
              <p className="text-[var(--danger)]">{error}</p>
              <Link href="/leagues" className="mt-2 inline-block text-[var(--primary)] hover:underline">
                Back to Leagues
              </Link>
            </>
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
                        className={`border-b border-[var(--surface-secondary)] ${
                          user?.id === entry.userId ? "bg-[var(--primary)]/10" : ""
                        }`}
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

              {userEntry && !entries.some((e) => e.userId === userEntry.userId) && (
                <div className="mt-4 rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/10 p-4">
                  <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">Your position</p>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="text-[var(--text-secondary)]">
                      Rank #{userEntry.currentRank ?? "—"}
                    </span>
                    <span className="text-[var(--text-primary)]">
                      {userEntry.points} pts · {userEntry.goldStars} gold stars
                    </span>
                  </div>
                </div>
              )}

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
