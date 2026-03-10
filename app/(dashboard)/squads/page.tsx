"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/app/components/ui/Card";
import { Input } from "@/app/components/ui/Input";
import { Select } from "@/app/components/ui/Select";
import { EmptyState } from "@/app/components/common/EmptyState";
import { LoadingSpinner } from "@/app/components/common/LoadingSpinner";
import { StatCard } from "@/app/components/dashboard/StatCard";
import { useMockAuth } from "@/app/hooks/useMockAuth";
import { buildMockAuthHeaders } from "@/app/lib/mock-auth-headers";

interface SquadMember {
  id: string;
  displayName: string;
  ageGroup?: string | null;
}

interface SquadRecord {
  id: string;
  name: string;
  ageGroup?: string | null;
  clubName?: string | null;
  members: SquadMember[];
}

interface TeamPlayer {
  id: string;
  displayName: string;
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

export default function SquadsPage() {
  const { user, role } = useMockAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [squads, setSquads] = useState<SquadRecord[]>([]);
  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [searchQuery, setSearchQuery] = useState("");
  const [name, setName] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [clubName, setClubName] = useState("");
  const [assignBySquad, setAssignBySquad] = useState<Record<string, string>>({});

  const loadData = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [squadsResponse, playersResponse] = await Promise.all([
        fetch("/api/squads", { headers: buildMockAuthHeaders(user) }),
        fetch("/api/team/players", { headers: buildMockAuthHeaders(user) }),
      ]);
      if (!squadsResponse.ok || !playersResponse.ok) {
        throw new Error("Failed to load squads");
      }
      const squadsData = await squadsResponse.json();
      const playersData = await playersResponse.json();
      setSquads(Array.isArray(squadsData.squads) ? squadsData.squads : []);
      setPlayers(Array.isArray(playersData.players) ? playersData.players : []);
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

  async function assignPlayerToSquad(squadId: string) {
    if (!user) return;
    const playerId = assignBySquad[squadId];
    if (!playerId) return;
    try {
      const response = await fetch(`/api/squads/${squadId}/members`, {
        method: "POST",
        headers: {
          ...buildMockAuthHeaders(user),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: playerId }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to assign player");
      }
      await loadData();
      setAssignBySquad((current) => ({ ...current, [squadId]: "" }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to assign player");
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
            <Input
              label="Club"
              value={clubName}
              onChange={(event) => setClubName(event.target.value)}
              placeholder="Oakfield Cricket Club"
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
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{squad.name}</h3>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {squad.clubName ?? "No club"} • {squad.ageGroup ?? "Age group not set"}
                      </p>
                    </div>
                    <span className="rounded-full bg-[var(--surface-secondary)] px-2 py-1 text-xs text-[var(--text-secondary)]">
                      {squad.members.length} players
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <select
                      value={assignBySquad[squad.id] ?? ""}
                      onChange={(event) =>
                        setAssignBySquad((current) => ({ ...current, [squad.id]: event.target.value }))
                      }
                      className="min-w-[220px] rounded-md border border-[var(--surface-secondary)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                    >
                      <option value="">Select player...</option>
                      {players.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.displayName}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="secondary"
                      onClick={() => void assignPlayerToSquad(squad.id)}
                      disabled={!assignBySquad[squad.id]}
                    >
                      Assign Player
                    </Button>
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
                    <th className="py-2 text-right text-sm font-semibold text-[var(--text-secondary)]">Assign</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSquads.map((squad) => (
                    <tr key={squad.id} className="border-b border-[var(--surface-secondary)] last:border-0">
                      <td className="py-3 text-sm text-[var(--text-primary)]">{squad.name}</td>
                      <td className="py-3 text-sm text-[var(--text-secondary)]">{squad.clubName ?? "-"}</td>
                      <td className="py-3 text-sm text-[var(--text-secondary)]">{squad.ageGroup ?? "-"}</td>
                      <td className="py-3 text-sm text-[var(--text-secondary)]">{squad.members.length}</td>
                      <td className="py-3">
                        <div className="flex justify-end gap-2">
                          <select
                            value={assignBySquad[squad.id] ?? ""}
                            onChange={(event) =>
                              setAssignBySquad((current) => ({
                                ...current,
                                [squad.id]: event.target.value,
                              }))
                            }
                            className="min-w-[220px] rounded-md border border-[var(--surface-secondary)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                          >
                            <option value="">Select player...</option>
                            {players.map((player) => (
                              <option key={player.id} value={player.id}>
                                {player.displayName}
                              </option>
                            ))}
                          </select>
                          <Button
                            variant="secondary"
                            onClick={() => void assignPlayerToSquad(squad.id)}
                            disabled={!assignBySquad[squad.id]}
                          >
                            Add
                          </Button>
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
