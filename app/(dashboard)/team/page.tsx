"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMockAuth } from "@/app/hooks/useMockAuth";
import { ECBSafeguardingBanner } from "@/app/components/coach/ECBSafeguardingBanner";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { StatCard } from "@/app/components/dashboard/StatCard";
import { Button } from "@/app/components/ui/Button";
import { Select } from "@/app/components/ui/Select";
import { EmptyState } from "@/app/components/common/EmptyState";
import { LoadingSpinner } from "@/app/components/common/LoadingSpinner";
import {
  MOCK_PLAYERS,
  MOCK_ROSTER_STATS,
  type MockPlayer,
  type PlayerStatus,
} from "@/app/lib/mock-roster";

function SearchIcon() {
  return (
    <svg
      className="h-5 w-5 text-[var(--text-secondary)]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}

function GroupIcon() {
  return (
    <svg
      className="h-12 w-12"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function getStatusBadgeClass(status: PlayerStatus): string {
  switch (status) {
    case "in_progress":
      return "bg-blue-500/20 text-blue-700 dark:text-blue-300";
    case "review_needed":
      return "bg-amber-500/20 text-amber-700 dark:text-amber-300";
    case "excellent":
      return "bg-[var(--success)]/20 text-[var(--success)]";
    default:
      return "bg-[var(--surface-secondary)] text-[var(--text-secondary)]";
  }
}

function getStatusLabel(status: PlayerStatus): string {
  switch (status) {
    case "in_progress":
      return "In Progress";
    case "review_needed":
      return "Review Needed";
    case "excellent":
      return "Excellent";
    default:
      return status;
  }
}

function getGradeBadgeClass(grade: string): string {
  if (grade.startsWith("A")) return "bg-[var(--success)]/20 text-[var(--success)]";
  if (grade.startsWith("B")) return "bg-amber-500/20 text-amber-700 dark:text-amber-300";
  return "bg-[var(--surface-secondary)] text-[var(--text-secondary)]";
}

function getActivityDotClass(activity: string): string {
  switch (activity) {
    case "active":
      return "bg-[var(--success)]";
    case "moderate":
      return "bg-amber-500";
    case "inactive":
      return "bg-[var(--text-secondary)]";
    default:
      return "bg-[var(--text-secondary)]";
  }
}

type PageState = "loading" | "ready" | "error" | "empty";

export default function CoachRosterPage() {
  const router = useRouter();
  const { role } = useMockAuth();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [searchQuery, setSearchQuery] = useState("");
  const [squadFilter, setSquadFilter] = useState("all");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Simulate initial load
  React.useEffect(() => {
    const t = setTimeout(() => {
      setPageState("ready");
    }, 600);
    return () => clearTimeout(t);
  }, []);

  // Redirect non-coaches
  React.useEffect(() => {
    if (role !== "coach") {
      router.replace("/dashboard");
    }
  }, [role, router]);

  const squadOptions = useMemo(() => {
    const squads = Array.from(
      new Set(MOCK_PLAYERS.map((p) => p.squad).filter(Boolean))
    ) as string[];
    return [
      { value: "all", label: "All Players" },
      ...squads.map((s) => ({ value: s, label: s })),
    ];
  }, []);

  const filteredPlayers = useMemo(() => {
    let list = MOCK_PLAYERS;
    if (squadFilter !== "all") {
      list = list.filter((p) => p.squad === squadFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.position.toLowerCase().includes(q)
      );
    }
    return list;
  }, [searchQuery, squadFilter]);

  const handleViewVideo = useCallback((player: MockPlayer) => {
    // Stub: open player's latest analysis
    console.log("View video for", player.name);
  }, []);

  const handleMessage = useCallback((player: MockPlayer) => {
    // Stub: open messaging panel
    router.push(`/messages?player=${player.id}`);
  }, [router]);

  const handleEdit = useCallback((player: MockPlayer) => {
    // Stub: open player profile edit sheet
    console.log("Edit profile for", player.name);
  }, []);

  const handleAddPlayer = useCallback(() => {
    // Stub: add player modal/sheet
    console.log("Add player");
  }, []);

  const handleRemovePlayer = useCallback((player: MockPlayer) => {
    // Stub: remove player confirmation
    console.log("Remove player", player.name);
  }, []);

  if (role !== "coach") {
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <ECBSafeguardingBanner />

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Player Roster
        </h1>
        <p className="mt-1 text-[var(--text-secondary)]">
          Manage your assigned players and track their progress.
        </p>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2">
              <SearchIcon />
            </span>
            <input
              type="search"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchQuery(e.target.value)
              }
              className="w-full rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface)] py-2 pl-10 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              aria-label="Search players"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              options={squadOptions}
              value={squadFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setSquadFilter(e.target.value)
              }
              aria-label="Filter by squad"
            />
          </div>
        </div>
        <Button onClick={handleAddPlayer} className="shrink-0">
          <PlusIcon />
          <span className="ml-2">Add Player</span>
        </Button>
      </div>

      {/* Key metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Players"
          value={MOCK_ROSTER_STATS.totalPlayers}
          icon={<UsersIcon />}
        />
        <StatCard
          label="Active Sessions"
          value={MOCK_ROSTER_STATS.activeSessions}
          icon={<PlayIcon />}
        />
        <StatCard
          label="Avg. Grade"
          value={MOCK_ROSTER_STATS.avgGrade}
          icon={<StarIcon />}
        />
        <StatCard
          label="Pending Reviews"
          value={MOCK_ROSTER_STATS.pendingReviews}
          icon={<ClockIcon />}
        />
      </div>

      {/* Player roster table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <span>Player Roster</span>
        </CardHeader>
        <CardContent>
          {pageState === "loading" && (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {pageState === "error" && (
            <div className="rounded-lg border border-[var(--danger)]/50 bg-[var(--danger)]/10 px-4 py-6 text-center">
              <p className="font-medium text-[var(--danger)]">
                Failed to load roster
              </p>
              {errorMessage && (
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {errorMessage}
                </p>
              )}
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => {
                  setPageState("loading");
                  setTimeout(() => setPageState("ready"), 600);
                }}
              >
                Retry
              </Button>
            </div>
          )}

          {pageState === "ready" && filteredPlayers.length === 0 && (
            <EmptyState
              title="No players found"
              description={
                searchQuery || squadFilter !== "all"
                  ? "Try adjusting your search or filter."
                  : "Add players to your roster to get started."
              }
              actionLabel={!searchQuery && squadFilter === "all" ? "Add Player" : undefined}
              onAction={!searchQuery && squadFilter === "all" ? handleAddPlayer : undefined}
              icon={<GroupIcon />}
            />
          )}

          {pageState === "ready" && filteredPlayers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]" aria-label="Player roster">
                <thead>
                  <tr className="border-b border-[var(--surface-secondary)]">
                    <th className="pb-3 text-left text-sm font-semibold text-[var(--text-secondary)]">
                      Player
                    </th>
                    <th className="pb-3 text-left text-sm font-semibold text-[var(--text-secondary)]">
                      Latest Grade
                    </th>
                    <th className="pb-3 text-left text-sm font-semibold text-[var(--text-secondary)]">
                      Last Session
                    </th>
                    <th className="pb-3 text-left text-sm font-semibold text-[var(--text-secondary)]">
                      Activity
                    </th>
                    <th className="pb-3 text-left text-sm font-semibold text-[var(--text-secondary)]">
                      Status
                    </th>
                    <th className="pb-3 text-right text-sm font-semibold text-[var(--text-secondary)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((player) => (
                    <tr
                      key={player.id}
                      className="border-b border-[var(--surface-secondary)] last:border-0"
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-sm font-semibold text-[var(--primary)]">
                            {player.avatarInitials}
                          </div>
                          <div>
                            <p className="font-medium text-[var(--text-primary)]">
                              {player.name}
                            </p>
                            <p className="text-sm text-[var(--text-secondary)]">
                              {player.position}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getGradeBadgeClass(
                            player.latestGrade
                          )}`}
                        >
                          {player.latestGrade}
                        </span>
                      </td>
                      <td className="py-4 text-sm text-[var(--text-secondary)]">
                        {player.lastSession}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${getActivityDotClass(
                              player.activity
                            )}`}
                            aria-hidden
                          />
                          <span className="capitalize text-sm text-[var(--text-primary)]">
                            {player.activity}
                          </span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(
                            player.status
                          )}`}
                        >
                          {getStatusLabel(player.status)}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleViewVideo(player)}
                            className="rounded p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--primary)]"
                            aria-label={`View latest analysis for ${player.name}`}
                          >
                            <VideoIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMessage(player)}
                            className="rounded p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--primary)]"
                            aria-label={`Message ${player.name}`}
                          >
                            <MessageIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(player)}
                            className="rounded p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--primary)]"
                            aria-label={`Edit profile for ${player.name}`}
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePlayer(player)}
                            className="rounded p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--danger)]"
                            aria-label={`Remove ${player.name} from roster`}
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
