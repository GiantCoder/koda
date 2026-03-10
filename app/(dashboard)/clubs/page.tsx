"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { useMockAuth } from "@/app/hooks/useMockAuth";
import { buildMockAuthHeaders } from "@/app/lib/mock-auth-headers";
import { Card, CardContent, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { StatCard } from "@/app/components/dashboard/StatCard";
import { LoadingSpinner } from "@/app/components/common/LoadingSpinner";
import { EmptyState } from "@/app/components/common/EmptyState";
import type { ClubRecord } from "@/app/lib/club-data";

type ViewMode = "card" | "table";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/svg+xml"];

function BuildingIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
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

interface ClubFormState {
  name: string;
  website: string;
  playCricketUrl: string;
  playCricketId: string;
  address: string;
  postcode: string;
  badgeFileName: string;
  bannerFileName: string;
}

const INITIAL_FORM: ClubFormState = {
  name: "",
  website: "",
  playCricketUrl: "",
  playCricketId: "",
  address: "",
  postcode: "",
  badgeFileName: "",
  bannerFileName: "",
};

function validateImageFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Only PNG or SVG files are supported.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "File size must be 2MB or less.";
  }
  return null;
}

export default function ClubsPage() {
  const { user, role } = useMockAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clubs, setClubs] = useState<ClubRecord[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formState, setFormState] = useState<ClubFormState>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  React.useEffect(() => {
    let cancelled = false;
    async function loadClubs() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await fetch("/api/clubs");
        if (!response.ok) {
          throw new Error("Failed to load clubs");
        }
        const data = await response.json();
        if (cancelled) return;
        setClubs(Array.isArray(data.clubs) ? data.clubs : []);
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : "Failed to load clubs");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadClubs();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredClubs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return clubs;
    return clubs.filter((club) =>
      [club.name, club.playCricketId, club.postcode].some((value) => value.toLowerCase().includes(query))
    );
  }, [clubs, searchQuery]);

  const clubStats = useMemo(() => {
    const totals = filteredClubs.reduce(
      (accumulator, club) => {
        accumulator.totalSeniors += club.stats.seniors;
        accumulator.totalJuniors += club.stats.juniors;
        accumulator.playersCoached += club.stats.playersCoached;
        accumulator.sessions += club.stats.sessionsThisMonth;
        accumulator.ratings.push(club.stats.averageRating);
        return accumulator;
      },
      { totalSeniors: 0, totalJuniors: 0, playersCoached: 0, sessions: 0, ratings: [] as number[] }
    );
    const avgRating =
      totals.ratings.length > 0
        ? (totals.ratings.reduce((sum, current) => sum + current, 0) / totals.ratings.length).toFixed(1)
        : "0.0";
    return {
      totalSeniors: totals.totalSeniors,
      totalJuniors: totals.totalJuniors,
      playersCoached: totals.playersCoached,
      sessions: totals.sessions,
      avgRating,
    };
  }, [filteredClubs]);

  function setFormValue(key: keyof ClubFormState, value: string) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  function onFileChange(kind: "badgeFileName" | "bannerFileName", file: File | null) {
    if (!file) return;
    const validationError = validateImageFile(file);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);
    setFormValue(kind, file.name);
  }

  async function submitClub() {
    if (!user) return;
    if (!formState.name.trim()) {
      setFormError("Club name is required.");
      return;
    }
    setIsSaving(true);
    setFormError(null);
    try {
      const response = await fetch("/api/clubs", {
        method: "POST",
        headers: {
          ...buildMockAuthHeaders(user),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formState.name.trim(),
          website: formState.website.trim(),
          playCricketUrl: formState.playCricketUrl.trim(),
          playCricketId: formState.playCricketId.trim(),
          address: formState.address.trim(),
          postcode: formState.postcode.trim(),
          badgeFileName: formState.badgeFileName || undefined,
          bannerFileName: formState.bannerFileName || undefined,
        }),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error ?? "Failed to create club");
      }
      const data = await response.json();
      const createdClub = data.club as ClubRecord | undefined;
      if (createdClub) {
        setClubs((current) => [createdClub, ...current]);
      }
      setIsCreateModalOpen(false);
      setFormState(INITIAL_FORM);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to create club");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Clubs</h1>
        <p className="mt-1 text-[var(--text-secondary)]">
          Manage clubs, Play-Cricket links, and coaching metrics.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Seniors" value={clubStats.totalSeniors} icon={<BuildingIcon />} />
        <StatCard label="Juniors" value={clubStats.totalJuniors} icon={<BuildingIcon />} />
        <StatCard label="Players Coached" value={clubStats.playersCoached} icon={<BuildingIcon />} />
        <StatCard label="Avg Rating" value={clubStats.avgRating} icon={<BuildingIcon />} />
        <StatCard label="Sessions" value={clubStats.sessions} icon={<BuildingIcon />} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-sm">
          <Input
            placeholder="Search clubs, IDs, postcode..."
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
          {(role === "coach" || role === "admin") && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <UploadIcon />
              <span className="ml-2">Add Club</span>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>Club Directory</CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {!isLoading && errorMessage && (
            <p className="rounded-lg border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
              {errorMessage}
            </p>
          )}

          {!isLoading && !errorMessage && filteredClubs.length === 0 && (
            <EmptyState
              title="No clubs found"
              description="Create a club or adjust your search."
              icon={<BuildingIcon />}
            />
          )}

          {!isLoading && !errorMessage && filteredClubs.length > 0 && viewMode === "card" && (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredClubs.map((club) => (
                <div
                  key={club.id}
                  className="rounded-xl border border-[var(--surface-secondary)] bg-[var(--surface)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{club.name}</h3>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">{club.address}</p>
                      <p className="text-sm text-[var(--text-secondary)]">{club.postcode}</p>
                    </div>
                    <Link href={`/team?club=${encodeURIComponent(club.name)}`}>
                      <Button variant="secondary" className="shrink-0">
                        View Coached Players
                      </Button>
                    </Link>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
                    <span className="rounded-full bg-[var(--surface-secondary)] px-2 py-1">
                      Badge: {club.badgeFileName ?? "Not uploaded"}
                    </span>
                    <span className="rounded-full bg-[var(--surface-secondary)] px-2 py-1">
                      Banner: {club.bannerFileName ?? "Not uploaded"}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-sm">
                    <a
                      href={club.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--primary)] hover:underline"
                    >
                      Website
                    </a>
                    <a
                      href={club.playCricketUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--primary)] hover:underline"
                    >
                      Play-Cricket
                    </a>
                    <span className="text-[var(--text-secondary)]">ID: {club.playCricketId}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && !errorMessage && filteredClubs.length > 0 && viewMode === "table" && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px]">
                <thead>
                  <tr className="border-b border-[var(--surface-secondary)]">
                    <th className="py-2 text-left text-sm font-semibold text-[var(--text-secondary)]">Club</th>
                    <th className="py-2 text-left text-sm font-semibold text-[var(--text-secondary)]">Location</th>
                    <th className="py-2 text-left text-sm font-semibold text-[var(--text-secondary)]">Play-Cricket</th>
                    <th className="py-2 text-left text-sm font-semibold text-[var(--text-secondary)]">Uploads</th>
                    <th className="py-2 text-right text-sm font-semibold text-[var(--text-secondary)]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClubs.map((club) => (
                    <tr key={club.id} className="border-b border-[var(--surface-secondary)] last:border-0">
                      <td className="py-3 text-sm text-[var(--text-primary)]">{club.name}</td>
                      <td className="py-3 text-sm text-[var(--text-secondary)]">
                        {club.address}, {club.postcode}
                      </td>
                      <td className="py-3 text-sm text-[var(--text-secondary)]">{club.playCricketId}</td>
                      <td className="py-3 text-sm text-[var(--text-secondary)]">
                        {club.badgeFileName ?? "No badge"} / {club.bannerFileName ?? "No banner"}
                      </td>
                      <td className="py-3 text-right">
                        <Link href={`/team?club=${encodeURIComponent(club.name)}`}>
                          <Button variant="secondary">View Coached Players</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-[var(--surface)] p-5">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Add Club</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Uploads support PNG/SVG files up to 2MB.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input
                label="Club name"
                value={formState.name}
                onChange={(event) => setFormValue("name", event.target.value)}
              />
              <Input
                label="Website"
                value={formState.website}
                onChange={(event) => setFormValue("website", event.target.value)}
                placeholder="https://..."
              />
              <Input
                label="Play-Cricket URL"
                value={formState.playCricketUrl}
                onChange={(event) => setFormValue("playCricketUrl", event.target.value)}
                placeholder="https://..."
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                  Play-Cricket ID
                  <span
                    className="ml-1 cursor-help text-[var(--text-secondary)]"
                    title="Find this in your Play-Cricket team or club URL slug."
                  >
                    (?)
                  </span>
                </label>
                <input
                  value={formState.playCricketId}
                  onChange={(event) => setFormValue("playCricketId", event.target.value)}
                  className="w-full rounded-md border border-[var(--surface-secondary)] bg-[var(--surface)] px-3 py-2 text-[var(--text-primary)]"
                />
              </div>
              <Input
                label="Address"
                value={formState.address}
                onChange={(event) => setFormValue("address", event.target.value)}
              />
              <Input
                label="Postcode"
                value={formState.postcode}
                onChange={(event) => setFormValue("postcode", event.target.value)}
              />

              <div className="space-y-1">
                <label className="block text-sm font-medium text-[var(--text-primary)]">Club badge</label>
                <input
                  type="file"
                  accept=".png,.svg,image/png,image/svg+xml"
                  onChange={(event) => onFileChange("badgeFileName", event.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-[var(--text-secondary)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--surface-secondary)] file:px-3 file:py-2 file:text-[var(--text-primary)]"
                />
                <p className="text-xs text-[var(--text-secondary)]">{formState.badgeFileName || "No file selected"}</p>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-[var(--text-primary)]">Club banner image</label>
                <input
                  type="file"
                  accept=".png,.svg,image/png,image/svg+xml"
                  onChange={(event) => onFileChange("bannerFileName", event.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-[var(--text-secondary)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--surface-secondary)] file:px-3 file:py-2 file:text-[var(--text-primary)]"
                />
                <p className="text-xs text-[var(--text-secondary)]">{formState.bannerFileName || "No file selected"}</p>
              </div>
            </div>
            {formError && <p className="mt-3 text-sm text-[var(--danger)]">{formError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setFormError(null);
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={() => void submitClub()} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Club"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
