"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useMockAuth } from "@/app/hooks/useMockAuth";
import { buildMockAuthHeaders } from "@/app/lib/mock-auth-headers";
import { Card, CardContent, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";

interface LeagueSeason {
  id: string;
  seasonNumber: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

interface LeagueItem {
  id: string;
  name: string;
  scope: string;
  currentSeason: LeagueSeason | null;
  userRank: number | null;
  memberCount: number;
}

function TrophyIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 640 640" aria-hidden>
      <path d="M208.3 64L432.3 64C458.8 64 480.4 85.8 479.4 112.2C479.2 117.5 479 122.8 478.7 128L528.3 128C554.4 128 577.4 149.6 575.4 177.8C567.9 281.5 514.9 338.5 457.4 368.3C441.6 376.5 425.5 382.6 410.2 387.1C390 415.7 369 430.8 352.3 438.9L352.3 512L416.3 512C434 512 448.3 526.3 448.3 544C448.3 561.7 434 576 416.3 576L224.3 576C206.6 576 192.3 561.7 192.3 544C192.3 526.3 206.6 512 224.3 512L288.3 512L288.3 438.9C272.3 431.2 252.4 416.9 233 390.6C214.6 385.8 194.6 378.5 175.1 367.5C121 337.2 72.2 280.1 65.2 177.6C63.3 149.5 86.2 127.9 112.3 127.9L161.9 127.9C161.6 122.7 161.4 117.5 161.2 112.1C160.2 85.6 181.8 63.9 208.3 63.9zM165.5 176L113.1 176C119.3 260.7 158.2 303.1 198.3 325.6C183.9 288.3 172 239.6 165.5 176zM444 320.8C484.5 297 521.1 254.7 527.3 176L475 176C468.8 236.9 457.6 284.2 444 320.8z" />
    </svg>
  );
}

export default function LeaguesPage() {
  const { user } = useMockAuth();
  const [leagues, setLeagues] = useState<LeagueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createName, setCreateName] = useState("");
  const [createSeasonDays, setCreateSeasonDays] = useState(30);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [createdJoinCode, setCreatedJoinCode] = useState<string | null>(null);

  const loadLeagues = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leagues", { headers: buildMockAuthHeaders(user) });
      if (!res.ok) throw new Error("Failed to load leagues");
      const data = (await res.json()) as { leagues: LeagueItem[] };
      setLeagues(data.leagues ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load leagues");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadLeagues();
  }, [loadLeagues]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !createName.trim()) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: {
          ...buildMockAuthHeaders(user),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: createName.trim(),
          seasonLengthDays: createSeasonDays,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Create failed");
      const league = (data as { league?: { joinCode?: string } }).league;
      if (league?.joinCode) setCreatedJoinCode(league.joinCode);
      setCreateName("");
      setCreateSeasonDays(30);
      await loadLeagues();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !joinCode.trim()) return;
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setJoinError("Join code must be 6 characters");
      return;
    }
    setIsJoining(true);
    setJoinError(null);
    try {
      const res = await fetch("/api/leagues/join", {
        method: "POST",
        headers: {
          ...buildMockAuthHeaders(user),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ joinCode: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Join failed");
      setJoinCode("");
      await loadLeagues();
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : "Join failed");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Leagues</h1>
        <p className="mt-1 text-[var(--text-secondary)]">
          Compete on the leaderboard and track your progress across seasons.
        </p>
      </div>

      {createdJoinCode && (
        <div className="rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/10 p-4 text-sm text-[var(--text-primary)]">
          <p className="font-medium">League created. Share this code to invite others:</p>
          <p className="mt-1 font-mono text-lg tracking-wider">{createdJoinCode}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setCreatedJoinCode(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <span>Create league</span>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="League name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Saturday squad"
                required
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                  Season length (days)
                </label>
                <select
                  value={createSeasonDays}
                  onChange={(e) => setCreateSeasonDays(Number(e.target.value))}
                  className="w-full rounded-md border border-[var(--surface-secondary)] bg-[var(--surface)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                >
                  <option value={30}>30</option>
                  <option value={60}>60</option>
                  <option value={90}>90</option>
                </select>
              </div>
              {createError && (
                <p className="text-sm text-[var(--danger)]" role="alert">
                  {createError}
                </p>
              )}
              <Button type="submit" disabled={isCreating || !createName.trim()}>
                {isCreating ? "Creating…" : "Create league"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>Join with code</CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-4">
              <Input
                label="6-character code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="ABC123"
                maxLength={6}
              />
              {joinError && (
                <p className="text-sm text-[var(--danger)]" role="alert">
                  {joinError}
                </p>
              )}
              <Button type="submit" disabled={isJoining || joinCode.trim().length !== 6}>
                {isJoining ? "Joining…" : "Join league"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>Global leaderboard</CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-[var(--text-secondary)]">
            Compete across all Koda players in your age group.
          </p>
          <Link href="/leagues/global">
            <Button variant="secondary">View global leaderboard</Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>My leagues</CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-[var(--text-secondary)]">Loading…</p>
          ) : error ? (
            <p className="text-[var(--danger)]">{error}</p>
          ) : leagues.length === 0 ? (
            <p className="text-[var(--text-secondary)]">
              You’re not in any leagues yet. Create one or join with a code above.
            </p>
          ) : (
            <ul className="space-y-3">
              {leagues.map((league) => (
                <li
                  key={league.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface)] p-4"
                >
                  <div className="flex items-center gap-3">
                    <TrophyIcon />
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{league.name}</p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {league.scope === "GLOBAL" ? "Global" : "Custom"}
                        {league.memberCount > 0 && ` · ${league.memberCount} members`}
                        {league.userRank != null && ` · Your rank: #${league.userRank}`}
                      </p>
                    </div>
                  </div>
                  <Link href={`/leagues/${league.id}`}>
                    <Button variant="secondary" size="sm">
                      View table
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
