"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/app/components/ui/Card";
import { Input } from "@/app/components/ui/Input";
import { Select } from "@/app/components/ui/Select";
import { EmptyState } from "@/app/components/common/EmptyState";
import { LoadingSpinner } from "@/app/components/common/LoadingSpinner";
import { StatCard } from "@/app/components/dashboard/StatCard";
import { Avatar } from "@/app/components/ui/Avatar";
import { useMockAuth } from "@/app/hooks/useMockAuth";
import { buildMockAuthHeaders } from "@/app/lib/mock-auth-headers";
import type { ClubRecord } from "@/app/lib/club-data";

interface SquadMember {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  rating?: number | null;
  ageGroup?: string | null;
}

interface SquadRecord {
  id: string;
  name: string;
  ageGroup?: string | null;
  clubName?: string | null;
  members: SquadMember[];
}

type ViewMode = "card" | "table";

const AGE_GROUP_OPTIONS = [
  { value: "UNDER_10", label: "Under 10" },
  { value: "UNDER_12", label: "Under 12" },
  { value: "UNDER_14", label: "Under 14" },
  { value: "UNDER_16", label: "Under 16" },
  { value: "UNDER_18", label: "Under 18" },
  { value: "SENIOR", label: "Senior" },
];

function GroupIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16"
      />
    </svg>
  );
}

export default function SquadsPage() {
  const { user, role } = useMockAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isMovingPlayer, setIsMovingPlayer] = useState(false);
  const [isDeletingSquadId, setIsDeletingSquadId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [squads, setSquads] = useState<SquadRecord[]>([]);
  const [clubs, setClubs] = useState<ClubRecord[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [searchQuery, setSearchQuery] = useState("");
  const [name, setName] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [clubName, setClubName] = useState("");
  const [movePlayerBySquad, setMovePlayerBySquad] = useState<Record<string, string>>({});
  const [moveTargetBySquad, setMoveTargetBySquad] = useState<Record<string, string>>({});
  const [deleteModalSquad, setDeleteModalSquad] = useState<SquadRecord | null>(null);

  const loadData = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [squadsResponse, clubsResponse] = await Promise.all([
        fetch("/api/squads", { headers: buildMockAuthHeaders(user) }),
        fetch("/api/clubs"),
      ]);
      if (!squadsResponse.ok || !clubsResponse.ok) {
        throw new Error("Failed to load squads");
      }
      const squadsData = await squadsResponse.json();
      const clubsData = await clubsResponse.json();
      setSquads(Array.isArray(squadsData.squads) ? squadsData.squads : []);
      setClubs(Array.isArray(clubsData.clubs) ? clubsData.clubs : []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load squads");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredSquads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return squads;
    return squads.filter((squad) =>
      [squad.name, squad.clubName ?? "", squad.ageGroup ?? ""].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [searchQuery, squads]);

  const stats = useMemo(() => {
    const totalSquads = filteredSquads.length;
    const totalMembers = filteredSquads.reduce((sum, squad) => sum + squad.members.length, 0);
    const avgMembers = totalSquads > 0 ? (totalMembers / totalSquads).toFixed(1) : "0.0";
    const activeAgeGroups = new Set(
      filteredSquads.map((squad) => squad.ageGroup).filter(Boolean) as string[]
    ).size;
    return { totalSquads, totalMembers, avgMembers, activeAgeGroups };
  }, [filteredSquads]);

  async function createSquad() {
    if (!user) return;
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      const response = await fetch("/api/squads", {
        method: "POST",
        headers: {
          ...buildMockAuthHeaders(user),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          ageGroup: ageGroup || undefined,
          clubName: clubName.trim() || undefined,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to create squad");
      }
      setName("");
      setAgeGroup("");
      setClubName("");
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create squad");
    } finally {
      setIsCreating(false);
    }
  }

  function getSquadAverageRating(squad: SquadRecord): string {
    const ratings = squad.members
      .map((member) => member.rating)
      .filter((rating): rating is number => typeof rating === "number");
    if (ratings.length === 0) return "-";
    return (ratings.reduce((sum, current) => sum + current, 0) / ratings.length).toFixed(1);
  }

  async function movePlayerToAnotherSquad(fromSquadId: string) {
    if (!user) return;
    const playerId = movePlayerBySquad[fromSquadId];
    const targetSquadId = moveTargetBySquad[fromSquadId];
    if (!playerId || !targetSquadId || targetSquadId === fromSquadId) return;

    setIsMovingPlayer(true);
    setErrorMessage(null);
    try {
      const removeResponse = await fetch(`/api/squads/${fromSquadId}/members/${playerId}`, {
        method: "DELETE",
        headers: buildMockAuthHeaders(user),
      });
      if (!removeResponse.ok) {
        const body = await removeResponse.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to remove player from squad");
      }

      const addResponse = await fetch(`/api/squads/${targetSquadId}/members`, {
        method: "POST",
        headers: {
          ...buildMockAuthHeaders(user),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: playerId }),
      });
      if (!addResponse.ok) {
        const body = await addResponse.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to add player to target squad");
      }

      await loadData();
      setMovePlayerBySquad((current) => ({ ...current, [fromSquadId]: "" }));
      setMoveTargetBySquad((current) => ({ ...current, [fromSquadId]: "" }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to move player");
    } finally {
      setIsMovingPlayer(false);
    }
  }

  function requestDeleteSquad(squad: SquadRecord) {
    setDeleteModalSquad(squad);
  }

  async function confirmDeleteSquad() {
    if (!user || !deleteModalSquad) return;

    setIsDeletingSquadId(deleteModalSquad.id);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/squads/${deleteModalSquad.id}`, {
        method: "DELETE",
        headers: buildMockAuthHeaders(user),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to delete squad");
      }
      setDeleteModalSquad(null);
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete squad");
    } finally {
      setIsDeletingSquadId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Squads</h1>
        <p className="mt-1 text-[var(--text-secondary)]">
          Build squads under your clubs and assign players.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Squads" value={stats.totalSquads} icon={<GroupIcon />} />
        <StatCard label="Players Assigned" value={stats.totalMembers} icon={<GroupIcon />} />
        <StatCard label="Avg Squad Size" value={stats.avgMembers} icon={<GroupIcon />} />
        <StatCard label="Age Groups" value={stats.activeAgeGroups} icon={<GroupIcon />} />
      </div>

      <Card>
        <CardHeader>Create Squad</CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Squad name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Under-14 Performance"
            />
            <Select
              label="Age group"
              options={AGE_GROUP_OPTIONS}
              value={ageGroup}
              onChange={(event) => setAgeGroup(event.target.value)}
            />
            <Select
              label="Club"
              options={clubs.map((club) => ({ value: club.name, label: club.name }))}
              value={clubName}
              onChange={(event) => setClubName(event.target.value)}
            />
            <div className="flex items-end">
              <Button
                onClick={() => void createSquad()}
                className="w-full"
                disabled={!name.trim() || isCreating || (role !== "coach" && role !== "admin")}
              >
                {isCreating ? "Creating..." : "Add Squad"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-sm">
          <Input
            placeholder="Search squads..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "card" ? "primary" : "secondary"}
            onClick={() => setViewMode("card")}
          >
            <GridIcon />
            <span className="ml-2">Cards</span>
          </Button>
          <Button
            variant={viewMode === "table" ? "primary" : "secondary"}
            onClick={() => setViewMode("table")}
          >
            <ListIcon />
            <span className="ml-2">Table</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>Squad Directory</CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-14">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {!isLoading && errorMessage && (
            <p className="rounded-lg border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
              {errorMessage}
            </p>
          )}

          {!isLoading && !errorMessage && filteredSquads.length === 0 && (
            <EmptyState
              title="No squads found"
              description="Create your first squad to get started."
              icon={<GroupIcon />}
            />
          )}

          {!isLoading && !errorMessage && filteredSquads.length > 0 && viewMode === "card" && (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredSquads.map((squad) => (
                <div
                  key={squad.id}
                  className="rounded-xl border border-[var(--surface-secondary)] bg-[var(--surface)] p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">{squad.name}</h3>
                        {(role === "coach" || role === "admin") && (
                          <button
                            type="button"
                            onClick={() => requestDeleteSquad(squad)}
                            disabled={isDeletingSquadId === squad.id}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--danger)]/40 text-[var(--danger)] transition-all duration-200 hover:scale-105 hover:bg-[var(--danger)]/10 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Delete ${squad.name}`}
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {squad.clubName ?? "No club"} • {squad.ageGroup ?? "Age group not set"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[var(--surface-secondary)] px-2 py-1 text-xs text-[var(--text-secondary)]">
                        {squad.members.length} players
                      </span>
                      <span className="rounded-full bg-[var(--surface-secondary)] px-2 py-1 text-xs text-[var(--text-secondary)]">
                        Avg Rating: {getSquadAverageRating(squad)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-[var(--surface-secondary)] pt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
                      Squad Players
                    </p>
                    <div className="mt-2 flex items-center">
                      {squad.members.slice(0, 8).map((member, index) => (
                        <Avatar
                          key={member.id}
                          name={member.displayName}
                          src={member.avatarUrl}
                          size="sm"
                          className={index === 0 ? "" : "-ml-2 border-2 border-[var(--surface)]"}
                        />
                      ))}
                      {squad.members.length === 0 && (
                        <span className="text-sm text-[var(--text-secondary)]">No players assigned</span>
                      )}
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <select
                        value={movePlayerBySquad[squad.id] ?? ""}
                        onChange={(event) =>
                          setMovePlayerBySquad((current) => ({ ...current, [squad.id]: event.target.value }))
                        }
                        className="rounded-md border border-[var(--surface-secondary)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                      >
                        <option value="">Player in squad...</option>
                        {squad.members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.displayName}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <select
                          value={moveTargetBySquad[squad.id] ?? ""}
                          onChange={(event) =>
                            setMoveTargetBySquad((current) => ({ ...current, [squad.id]: event.target.value }))
                          }
                          className="flex-1 rounded-md border border-[var(--surface-secondary)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                        >
                          <option value="">Move to squad...</option>
                          {filteredSquads
                            .filter((candidate) => candidate.id !== squad.id)
                            .map((candidate) => (
                              <option key={candidate.id} value={candidate.id}>
                                {candidate.name}
                              </option>
                            ))}
                        </select>
                        <Button
                          variant="secondary"
                          onClick={() => void movePlayerToAnotherSquad(squad.id)}
                          disabled={
                            isMovingPlayer ||
                            !movePlayerBySquad[squad.id] ||
                            !moveTargetBySquad[squad.id]
                          }
                        >
                          {isMovingPlayer ? "Moving..." : "Move"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && !errorMessage && filteredSquads.length > 0 && viewMode === "table" && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-[var(--surface-secondary)]">
                    <th className="py-2 text-left text-sm font-semibold text-[var(--text-secondary)]">Squad</th>
                    <th className="py-2 text-left text-sm font-semibold text-[var(--text-secondary)]">Club</th>
                    <th className="py-2 text-left text-sm font-semibold text-[var(--text-secondary)]">Age Group</th>
                    <th className="py-2 text-left text-sm font-semibold text-[var(--text-secondary)]">Players</th>
                    <th className="py-2 text-left text-sm font-semibold text-[var(--text-secondary)]">Avg Rating</th>
                    <th className="py-2 text-right text-sm font-semibold text-[var(--text-secondary)]">Move / Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSquads.map((squad) => (
                    <tr key={squad.id} className="border-b border-[var(--surface-secondary)] last:border-0">
                      <td className="py-3 text-sm text-[var(--text-primary)]">{squad.name}</td>
                      <td className="py-3 text-sm text-[var(--text-secondary)]">{squad.clubName ?? "-"}</td>
                      <td className="py-3 text-sm text-[var(--text-secondary)]">{squad.ageGroup ?? "-"}</td>
                      <td className="py-3">
                        <div className="flex items-center">
                          {squad.members.slice(0, 5).map((member, index) => (
                            <Avatar
                              key={member.id}
                              name={member.displayName}
                              src={member.avatarUrl}
                              size="sm"
                              className={index === 0 ? "" : "-ml-2 border-2 border-[var(--surface)]"}
                            />
                          ))}
                          <span className="ml-2 text-sm text-[var(--text-secondary)]">{squad.members.length}</span>
                        </div>
                      </td>
                      <td className="py-3 text-sm text-[var(--text-secondary)]">{getSquadAverageRating(squad)}</td>
                      <td className="py-3">
                        <div className="flex justify-end gap-2">
                          <select
                            value={movePlayerBySquad[squad.id] ?? ""}
                            onChange={(event) =>
                              setMovePlayerBySquad((current) => ({
                                ...current,
                                [squad.id]: event.target.value,
                              }))
                            }
                            className="min-w-[220px] rounded-md border border-[var(--surface-secondary)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                          >
                            <option value="">Player in squad...</option>
                            {squad.members.map((player) => (
                              <option key={player.id} value={player.id}>
                                {player.displayName}
                              </option>
                            ))}
                          </select>
                          <select
                            value={moveTargetBySquad[squad.id] ?? ""}
                            onChange={(event) =>
                              setMoveTargetBySquad((current) => ({
                                ...current,
                                [squad.id]: event.target.value,
                              }))
                            }
                            className="min-w-[220px] rounded-md border border-[var(--surface-secondary)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                          >
                            <option value="">Move to squad...</option>
                            {filteredSquads
                              .filter((candidate) => candidate.id !== squad.id)
                              .map((candidate) => (
                                <option key={candidate.id} value={candidate.id}>
                                  {candidate.name}
                                </option>
                              ))}
                          </select>
                          <Button
                            variant="secondary"
                            onClick={() => void movePlayerToAnotherSquad(squad.id)}
                            disabled={
                              isMovingPlayer ||
                              !movePlayerBySquad[squad.id] ||
                              !moveTargetBySquad[squad.id]
                            }
                          >
                            {isMovingPlayer ? "Moving..." : "Move"}
                          </Button>
                          {(role === "coach" || role === "admin") && (
                            <Button
                              variant="secondary"
                              className="border border-[var(--danger)]/40 text-[var(--danger)] hover:bg-[var(--danger)]/10"
                              onClick={() => requestDeleteSquad(squad)}
                              disabled={isDeletingSquadId === squad.id}
                            >
                              {isDeletingSquadId === squad.id ? "Deleting..." : "Delete"}
                            </Button>
                          )}
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

      {deleteModalSquad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-[var(--surface)] p-5">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Delete Squad</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Are you sure you want to delete <span className="font-semibold">{deleteModalSquad.name}</span>? This
              action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setDeleteModalSquad(null)}
                disabled={isDeletingSquadId === deleteModalSquad.id}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                className="border border-[var(--danger)]/40 text-[var(--danger)] hover:bg-[var(--danger)]/10"
                onClick={() => void confirmDeleteSquad()}
                disabled={isDeletingSquadId === deleteModalSquad.id}
              >
                {isDeletingSquadId === deleteModalSquad.id ? "Deleting..." : "Delete Squad"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
