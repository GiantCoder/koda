"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMockAuth } from "@/app/hooks/useMockAuth";
import { buildMockAuthHeaders } from "@/app/lib/mock-auth-headers";
import { ECBSafeguardingBanner } from "@/app/components/coach/ECBSafeguardingBanner";
import PlayerCardDisplay from "@/app/components/player-card/PlayerCardDisplay";
import PlayerCardEditor from "@/app/components/player-card/PlayerCardEditor";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { StatCard } from "@/app/components/dashboard/StatCard";
import { Button } from "@/app/components/ui/Button";
import { Select } from "@/app/components/ui/Select";
import { Input } from "@/app/components/ui/Input";
import { EmptyState } from "@/app/components/common/EmptyState";
import { LoadingSpinner } from "@/app/components/common/LoadingSpinner";
import { AvatarGalleryModal } from "@/app/components/avatar/AvatarGalleryModal";
import { type MockPlayer, type PlayerStatus } from "@/app/lib/mock-roster";
import type { PlayerCardDto, UpdatePlayerCardInput } from "@/types/player-card";

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

function getPositionTag(position: string): string {
  const value = position.toLowerCase();
  if (value.includes("wicket")) return "🧤 WKT";
  if (value.includes("bowl")) return "🔴 BOW";
  if (value.includes("bat")) return "🏏 BAT";
  if (value.includes("all")) return "🔁 AR";
  return "🏃 PLN";
}

function getHandednessAbbreviation(battingStyle: string): string {
  const style = battingStyle.toLowerCase();
  if (style.includes("left")) return "LH";
  if (style.includes("right")) return "RH";
  return "RH";
}

function getBowlingAbbreviation(bowlingStyle: string): string {
  const style = bowlingStyle.toLowerCase();
  if (style.includes("left arm")) return "LA";
  if (style.includes("medium")) return "MF";
  if (style.includes("fast")) return "F";
  if (style.includes("leg")) return "LS";
  return "MF";
}

type PageState = "loading" | "ready" | "error" | "empty";

interface RosterPlayer extends MockPlayer {
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  dateOfBirth: string;
  ageGroup: string;
  primaryPosition: string;
  battingStyle: string;
  bowlingStyle: string;
  clubOrSchool: string;
  profileVisibility: string;
  squadNames: string[];
}

interface TeamPlayerCardEntry {
  playerId: string;
  playerName: string;
  card: PlayerCardDto;
}

interface SquadSummary {
  id: string;
  name: string;
  clubName?: string | null;
}

interface PlayCricketTeam {
  id: string;
  name: string;
  clubName: string;
  squadHint?: string;
}

interface TeamFormState {
  name: string;
  clubName: string;
  squadHint: string;
}
const STORAGE_FULL_MESSAGE =
  "Image uploads are temporarily unavailable because local storage is full. Please contact support or try again after cleanup.";

const AGE_GROUP_OPTIONS = [
  { value: "UNDER_10", label: "Under 10" },
  { value: "UNDER_12", label: "Under 12" },
  { value: "UNDER_14", label: "Under 14" },
  { value: "UNDER_16", label: "Under 16" },
  { value: "UNDER_18", label: "Under 18" },
  { value: "SENIOR", label: "Senior" },
];

export default function CoachRosterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, role } = useMockAuth();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [searchQuery, setSearchQuery] = useState("");
  const [clubFilter, setClubFilter] = useState("all");
  const [squadFilter, setSquadFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [teamFormError, setTeamFormError] = useState<string | null>(null);
  const [teamFormState, setTeamFormState] = useState<TeamFormState>({
    name: "",
    clubName: "",
    squadHint: "",
  });
  const [assignPlayerSearch, setAssignPlayerSearch] = useState("");
  const [assignSquadSearch, setAssignSquadSearch] = useState("");
  const [assignPlayerId, setAssignPlayerId] = useState("");
  const [assignSquadId, setAssignSquadId] = useState("");
  const [isAssigningPlayer, setIsAssigningPlayer] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<RosterPlayer[]>([]);
  const [squadSummaries, setSquadSummaries] = useState<SquadSummary[]>([]);
  const [playCricketTeams, setPlayCricketTeams] = useState<PlayCricketTeam[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<RosterPlayer | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isModalSubmitting, setIsModalSubmitting] = useState(false);
  const [newPlayerForm, setNewPlayerForm] = useState({
    displayName: "",
    firstName: "",
    lastName: "",
  });
  const [addPlayerMode, setAddPlayerMode] = useState<"single" | "bulk">("single");
  const [bulkPlayerLines, setBulkPlayerLines] = useState("");
  const [bulkAddSummary, setBulkAddSummary] = useState<{
    created: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [editPlayerForm, setEditPlayerForm] = useState({
    displayName: "",
    firstName: "",
    lastName: "",
    avatarUrl: "",
    dateOfBirth: "",
    ageGroup: "",
    primaryPosition: "",
    battingStyle: "",
    bowlingStyle: "",
    clubOrSchool: "",
    profileVisibility: "",
  });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [isAvatarGalleryOpen, setIsAvatarGalleryOpen] = useState(false);
  const [playerCardEntries, setPlayerCardEntries] = useState<TeamPlayerCardEntry[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [selectedCardPlayerId, setSelectedCardPlayerId] = useState("");
  const [editingCard, setEditingCard] = useState<PlayerCardDto | null>(null);
  const [cardAiBgCss, setCardAiBgCss] = useState<string | null>(null);
  const [cardSaving, setCardSaving] = useState(false);
  const [cardGeneratingBg, setCardGeneratingBg] = useState(false);
  const [cardModalError, setCardModalError] = useState<string | null>(null);
  const isCardStorageFullError =
    cardModalError?.toLowerCase().includes("storage is full") ?? false;

  const mapApiPlayers = useCallback((rawPlayers: unknown[]): RosterPlayer[] => {
    return rawPlayers
      .filter(
        (
          player
        ): player is {
          id: string;
          displayName: string;
          email?: string;
          firstName?: string | null;
          lastName?: string | null;
          avatarUrl?: string | null;
          dateOfBirth?: string | null;
          ageGroup?: string | null;
          primaryPosition?: string | null;
          battingStyle?: string | null;
          bowlingStyle?: string | null;
          clubOrSchool?: string | null;
          profileVisibility?: string | null;
          squadNames?: string[];
        } =>
          Boolean(player && typeof player === "object" && "id" in player && "displayName" in player)
      )
      .map((player) => {
        const initials = player.displayName
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((token) => token[0]?.toUpperCase() ?? "")
          .join("") || "PL";
        return {
          id: player.id,
          name: player.displayName,
          position: "Player",
          avatarInitials: initials,
          latestGrade: "N/A",
          lastSession: "No analysis yet",
          activity: "moderate",
          status: "in_progress",
          squad: Array.isArray(player.squadNames) && player.squadNames.length > 0 ? player.squadNames[0] : undefined,
          squadNames: Array.isArray(player.squadNames) ? player.squadNames : [],
          email: player.email ?? "",
          firstName: player.firstName ?? "",
          lastName: player.lastName ?? "",
          avatarUrl: player.avatarUrl ?? "",
          dateOfBirth: player.dateOfBirth ? String(player.dateOfBirth).slice(0, 10) : "",
          ageGroup: player.ageGroup ?? "",
          primaryPosition: player.primaryPosition ?? "",
          battingStyle: player.battingStyle ?? "",
          bowlingStyle: player.bowlingStyle ?? "",
          clubOrSchool: player.clubOrSchool ?? "",
          profileVisibility: player.profileVisibility ?? "",
        } satisfies RosterPlayer;
      });
  }, []);

  const loadTeamPlayerCards = useCallback(async (players: RosterPlayer[]) => {
    if (!user || players.length === 0) {
      setPlayerCardEntries([]);
      return;
    }

    setCardsLoading(true);
    setCardsError(null);
    try {
      const cards = await Promise.all(
        players.map(async (player) => {
          const response = await fetch(`/api/team/players/${player.id}/player-card`, {
            headers: buildMockAuthHeaders(user),
          });
          if (!response.ok) {
            throw new Error("Failed to load team player cards");
          }
          const card = (await response.json()) as PlayerCardDto;
          return {
            playerId: player.id,
            playerName: player.name,
            card,
          } satisfies TeamPlayerCardEntry;
        })
      );
      setPlayerCardEntries(cards);
    } catch (error) {
      setCardsError(error instanceof Error ? error.message : "Failed to load player cards");
    } finally {
      setCardsLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadRoster() {
      if ((role !== "coach" && role !== "parent" && role !== "admin") || !user) {
        return;
      }
      setPageState("loading");
      setErrorMessage(null);
      try {
        const response = await fetch("/api/team/players", {
          headers: buildMockAuthHeaders(user),
        });
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(errorBody.error ?? "Failed to load players");
        }
        const data = await response.json();
        const players = Array.isArray(data.players) ? mapApiPlayers(data.players) : [];
        if (cancelled) return;
        setTeamPlayers(players);
        void loadTeamPlayerCards(players);
        setPageState(players.length > 0 ? "ready" : "empty");
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : "Failed to load roster");
        setPageState("error");
      }
    }
    void loadRoster();
    return () => {
      cancelled = true;
    };
  }, [loadTeamPlayerCards, mapApiPlayers, role, user]);

  // Redirect non-coaches
  React.useEffect(() => {
    if (role !== "coach" && role !== "parent" && role !== "admin") {
      router.replace("/dashboard");
    }
  }, [role, router]);

  React.useEffect(() => {
    const initialClub = searchParams.get("club");
    if (initialClub) {
      setClubFilter(initialClub);
    }
  }, [searchParams]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadTeamReferences() {
      if (!user) return;
      try {
        const [squadsResponse, teamsResponse] = await Promise.all([
          fetch("/api/squads", { headers: buildMockAuthHeaders(user) }),
          fetch("/api/play-cricket/teams"),
        ]);
        if (!squadsResponse.ok || !teamsResponse.ok) {
          return;
        }
        const squadsData = await squadsResponse.json();
        const teamsData = await teamsResponse.json();
        if (cancelled) return;
        setSquadSummaries(Array.isArray(squadsData.squads) ? squadsData.squads : []);
        setPlayCricketTeams(Array.isArray(teamsData.teams) ? teamsData.teams : []);
      } catch {
        // Keep roster experience available even if supporting lists fail to load.
      }
    }
    void loadTeamReferences();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const squadOptions = useMemo(() => {
    const squadNamesFromPlayers = teamPlayers.map((player) => player.squad).filter(Boolean) as string[];
    const squadNamesFromApi = squadSummaries.map((squad) => squad.name);
    const squads = Array.from(new Set([...squadNamesFromPlayers, ...squadNamesFromApi]));
    return [
      { value: "all", label: "All Players" },
      ...squads.map((s) => ({ value: s, label: s })),
    ];
  }, [squadSummaries, teamPlayers]);

  const clubOptions = useMemo(() => {
    const clubsFromPlayers = teamPlayers.map((player) => player.clubOrSchool).filter(Boolean) as string[];
    const clubsFromSquads = squadSummaries
      .map((squad) => squad.clubName)
      .filter((value): value is string => Boolean(value));
    const clubs = Array.from(new Set([...clubsFromPlayers, ...clubsFromSquads]));
    return [{ value: "all", label: "All Clubs" }, ...clubs.map((club) => ({ value: club, label: club }))];
  }, [squadSummaries, teamPlayers]);

  const filteredPlayCricketTeams = useMemo(() => {
    const query = teamSearchQuery.trim().toLowerCase();
    if (!query) return playCricketTeams;
    return playCricketTeams.filter((team) =>
      [team.name, team.clubName, team.squadHint ?? ""].some((value) => value.toLowerCase().includes(query))
    );
  }, [playCricketTeams, teamSearchQuery]);

  const teamOptions = useMemo(
    () => [{ value: "all", label: "All Teams" }, ...filteredPlayCricketTeams.map((team) => ({ value: team.id, label: team.name }))],
    [filteredPlayCricketTeams]
  );

  const filteredAssignablePlayers = useMemo(() => {
    const query = assignPlayerSearch.trim().toLowerCase();
    if (!query) return teamPlayers;
    return teamPlayers.filter((player) =>
      [player.name, player.primaryPosition, player.clubOrSchool].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [assignPlayerSearch, teamPlayers]);

  const filteredAssignableSquads = useMemo(() => {
    const query = assignSquadSearch.trim().toLowerCase();
    if (!query) return squadSummaries;
    return squadSummaries.filter((squad) =>
      [squad.name, squad.clubName ?? ""].some((value) => value.toLowerCase().includes(query))
    );
  }, [assignSquadSearch, squadSummaries]);

  const filteredPlayers = useMemo(() => {
    const squadClubMap = new Map(
      squadSummaries
        .filter((squad) => squad.clubName)
        .map((squad) => [squad.name, squad.clubName as string])
    );
    let list = teamPlayers;
    if (clubFilter !== "all") {
      list = list.filter((player) => {
        const inferredClub = player.squad ? squadClubMap.get(player.squad) : undefined;
        const playerClub = player.clubOrSchool || inferredClub || "";
        return playerClub === clubFilter;
      });
    }
    if (squadFilter !== "all") {
      list = list.filter((player) => player.squad === squadFilter);
    }
    if (teamFilter !== "all") {
      const selectedTeam = playCricketTeams.find((team) => team.id === teamFilter);
      if (selectedTeam) {
        list = list.filter((player) => {
          const clubMatch = !player.clubOrSchool || player.clubOrSchool === selectedTeam.clubName;
          if (!selectedTeam.squadHint) return clubMatch;
          return (
            clubMatch &&
            (player.squad === selectedTeam.squadHint ||
              player.squadNames.some((name) => name.includes(selectedTeam.squadHint ?? "")))
          );
        });
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (player) =>
          player.name.toLowerCase().includes(q) ||
          player.position.toLowerCase().includes(q) ||
          player.primaryPosition.toLowerCase().includes(q)
      );
    }
    return list;
  }, [clubFilter, playCricketTeams, searchQuery, squadFilter, squadSummaries, teamFilter, teamPlayers]);

  const rosterStats = useMemo(() => {
    const totalPlayers = teamPlayers.length;
    const activeSessions = teamPlayers.filter((player) => player.activity === "active").length;
    const pendingReviews = teamPlayers.filter((player) => player.status === "review_needed").length;
    const gradedPlayers = teamPlayers.filter((player) => player.latestGrade !== "N/A");
    const avgGrade = gradedPlayers.length > 0 ? "B" : "N/A";
    return { totalPlayers, activeSessions, pendingReviews, avgGrade };
  }, [teamPlayers]);

  const selectedCardPlayer = useMemo(
    () => teamPlayers.find((player) => player.id === selectedCardPlayerId) ?? null,
    [selectedCardPlayerId, teamPlayers]
  );

  const editingCardInput = useMemo((): UpdatePlayerCardInput | null => {
    if (!editingCard) return null;
    return {
      displayName: editingCard.displayName,
      tier: editingCard.tier,
      role: editingCard.role,
      sportIcon: editingCard.sportIcon,
      statTec: editingCard.statTec,
      statPow: editingCard.statPow,
      statTim: editingCard.statTim,
      statCon: editingCard.statCon,
      statPac: editingCard.statPac,
      statFie: editingCard.statFie,
      profilePhotoUrl: editingCard.profilePhotoUrl,
      backgroundUrl: editingCard.backgroundUrl,
      backgroundMode: editingCard.backgroundMode,
    };
  }, [editingCard]);

  const refreshRoster = useCallback(async () => {
    if (!user) return;
    const response = await fetch("/api/team/players", {
      headers: buildMockAuthHeaders(user),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error ?? "Failed to load players");
    }
    const data = await response.json();
    const players = Array.isArray(data.players) ? mapApiPlayers(data.players) : [];
    setTeamPlayers(players);
    await loadTeamPlayerCards(players);
    setPageState(players.length > 0 ? "ready" : "empty");
  }, [loadTeamPlayerCards, mapApiPlayers, user]);

  const handleViewVideo = useCallback((player: MockPlayer) => {
    router.push(`/upload?assignee=${player.id}`);
  }, [router]);

  const handleMessage = useCallback((player: MockPlayer) => {
    // Stub: open messaging panel
    router.push(`/messages?player=${player.id}`);
  }, [router]);

  const handleAddPlayer = useCallback(() => {
    setModalError(null);
    setBulkAddSummary(null);
    setBulkPlayerLines("");
    setAddPlayerMode("single");
    setNewPlayerForm({ displayName: "", firstName: "", lastName: "" });
    setIsAddModalOpen(true);
  }, []);

  const handleCreateTeam = useCallback(async () => {
    if (!user) return;
    if (!teamFormState.name.trim() || !teamFormState.clubName.trim()) {
      setTeamFormError("Team name and club are required.");
      return;
    }

    setIsCreatingTeam(true);
    setTeamFormError(null);
    try {
      const response = await fetch("/api/play-cricket/teams", {
        method: "POST",
        headers: {
          ...buildMockAuthHeaders(user),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: teamFormState.name.trim(),
          clubName: teamFormState.clubName.trim(),
          squadHint: teamFormState.squadHint.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create team");
      }
      const data = await response.json();
      const created = data.team as PlayCricketTeam | undefined;
      if (created) {
        setPlayCricketTeams((current) => [created, ...current]);
        setTeamFilter(created.id);
      }
      setTeamFormState({ name: "", clubName: "", squadHint: "" });
      setIsCreateTeamModalOpen(false);
    } catch (error) {
      setTeamFormError(error instanceof Error ? error.message : "Failed to create team");
    } finally {
      setIsCreatingTeam(false);
    }
  }, [teamFormState, user]);

  const handleAssignExistingPlayer = useCallback(async () => {
    if (!user || !assignPlayerId || !assignSquadId) return;
    setIsAssigningPlayer(true);
    setModalError(null);
    try {
      const response = await fetch(`/api/squads/${assignSquadId}/members`, {
        method: "POST",
        headers: {
          ...buildMockAuthHeaders(user),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: assignPlayerId }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to assign player");
      }
      setAssignPlayerId("");
      setAssignSquadId("");
      await refreshRoster();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Failed to assign player");
    } finally {
      setIsAssigningPlayer(false);
    }
  }, [assignPlayerId, assignSquadId, refreshRoster, user]);

  const openCardEditorForPlayer = useCallback(
    async (playerId: string) => {
      if (!user) return;
      setSelectedCardPlayerId(playerId);
      setCardModalError(null);
      setCardAiBgCss(null);
      setCardSaving(false);
      setCardGeneratingBg(false);
      setIsCardModalOpen(true);
      setEditingCard(null);

      const response = await fetch(`/api/team/players/${playerId}/player-card`, {
        headers: buildMockAuthHeaders(user),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setCardModalError((body as { error?: string }).error ?? "Failed to load player card.");
        return;
      }
      const card = (await response.json()) as PlayerCardDto;
      setEditingCard(card);
    },
    [user]
  );

  const handleEdit = useCallback((player: MockPlayer) => {
    const rosterPlayer = teamPlayers.find((candidate) => candidate.id === player.id);
    if (!rosterPlayer) return;
    setSelectedPlayer(rosterPlayer);
    setEditPlayerForm({
      displayName: rosterPlayer.name,
      firstName: rosterPlayer.firstName,
      lastName: rosterPlayer.lastName,
      avatarUrl: rosterPlayer.avatarUrl || "",
      dateOfBirth: rosterPlayer.dateOfBirth,
      ageGroup: rosterPlayer.ageGroup,
      primaryPosition: rosterPlayer.primaryPosition,
      battingStyle: rosterPlayer.battingStyle,
      bowlingStyle: rosterPlayer.bowlingStyle,
      clubOrSchool: rosterPlayer.clubOrSchool,
      profileVisibility: rosterPlayer.profileVisibility,
    });
    setModalError(null);
    setIsEditModalOpen(true);
  }, [teamPlayers]);

  const handleRemovePlayer = useCallback((player: MockPlayer) => {
    const rosterPlayer = teamPlayers.find((candidate) => candidate.id === player.id);
    if (!rosterPlayer) return;
    setSelectedPlayer(rosterPlayer);
    setModalError(null);
    setIsDeleteModalOpen(true);
  }, [teamPlayers]);

  const submitAddPlayer = useCallback(async () => {
    if (!user) return;
    if (!newPlayerForm.displayName.trim()) {
      setModalError("Player name is required");
      return;
    }
    setIsModalSubmitting(true);
    setModalError(null);
    const response = await fetch("/api/team/players", {
      method: "POST",
      headers: {
        ...buildMockAuthHeaders(user),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        displayName: newPlayerForm.displayName.trim(),
        firstName: newPlayerForm.firstName.trim() || undefined,
        lastName: newPlayerForm.lastName.trim() || undefined,
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setModalError(body.error ?? "Failed to create player");
      setIsModalSubmitting(false);
      return;
    }
    await refreshRoster();
    setIsModalSubmitting(false);
    setIsAddModalOpen(false);
  }, [newPlayerForm, refreshRoster, user]);

  const submitBulkAddPlayers = useCallback(async () => {
    if (!user) return;
    const entries = bulkPlayerLines
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (entries.length === 0) {
      setModalError("Add at least one player name");
      return;
    }

    setIsModalSubmitting(true);
    setModalError(null);
    const errors: string[] = [];
    let created = 0;
    let failed = 0;

    for (const name of entries) {
      const response = await fetch("/api/team/players", {
        method: "POST",
        headers: {
          ...buildMockAuthHeaders(user),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName: name }),
      });
      if (response.ok) {
        created += 1;
        continue;
      }
      failed += 1;
      const body = await response.json().catch(() => ({}));
      errors.push(`${name}: ${body.error ?? "Failed to create player"}`);
    }

    await refreshRoster();
    setIsModalSubmitting(false);
    setBulkAddSummary({ created, failed, errors });
    if (failed === 0) {
      setIsAddModalOpen(false);
    }
  }, [bulkPlayerLines, refreshRoster, user]);

  const submitEditPlayer = useCallback(async () => {
    if (!user || !selectedPlayer) return;
    if (!editPlayerForm.displayName.trim()) {
      setModalError("Player name is required");
      return;
    }
    setIsModalSubmitting(true);
    setModalError(null);
    const response = await fetch(`/api/team/players/${selectedPlayer.id}`, {
      method: "PUT",
      headers: {
        ...buildMockAuthHeaders(user),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        displayName: editPlayerForm.displayName.trim(),
        firstName: editPlayerForm.firstName.trim() || null,
        lastName: editPlayerForm.lastName.trim() || null,
        avatarUrl: editPlayerForm.avatarUrl || null,
        dateOfBirth: editPlayerForm.dateOfBirth || null,
        ageGroup: editPlayerForm.ageGroup || null,
        primaryPosition: editPlayerForm.primaryPosition.trim() || null,
        battingStyle: editPlayerForm.battingStyle.trim() || null,
        bowlingStyle: editPlayerForm.bowlingStyle.trim() || null,
        clubOrSchool: editPlayerForm.clubOrSchool.trim() || null,
        profileVisibility: editPlayerForm.profileVisibility || null,
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setModalError(body.error ?? "Failed to update player");
      setIsModalSubmitting(false);
      return;
    }
    await refreshRoster();
    setIsModalSubmitting(false);
    setIsEditModalOpen(false);
  }, [editPlayerForm, refreshRoster, selectedPlayer, user]);

  const handleAvatarSelect = useCallback((avatarUrl: string) => {
    setEditPlayerForm((current) => ({ ...current, avatarUrl }));
    setIsAvatarGalleryOpen(false);
  }, []);

  const submitRemovePlayer = useCallback(async () => {
    if (!user || !selectedPlayer) return;
    setIsModalSubmitting(true);
    setModalError(null);
    const response = await fetch(`/api/team/players/${selectedPlayer.id}`, {
      method: "DELETE",
      headers: buildMockAuthHeaders(user),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setModalError(body.error ?? "Failed to remove player");
      setIsModalSubmitting(false);
      return;
    }
    await refreshRoster();
    setIsModalSubmitting(false);
    setIsDeleteModalOpen(false);
    setSelectedPlayer(null);
  }, [refreshRoster, selectedPlayer, user]);

  const uploadCardImage = useCallback(
    async (file: File): Promise<string> => {
      if (!user) throw new Error("Unauthorized");
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/player-card/upload-image", {
        method: "POST",
        headers: buildMockAuthHeaders(user),
        body: formData,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        if (response.status === 507) {
          throw new Error(STORAGE_FULL_MESSAGE);
        }
        throw new Error((body as { error?: string }).error ?? "Image upload failed");
      }
      const payload = (await response.json()) as { url?: string };
      if (!payload.url) {
        throw new Error("Image upload failed");
      }
      return payload.url;
    },
    [user]
  );

  const saveCoachEditedCard = useCallback(async () => {
    if (!user || !selectedCardPlayerId || !editingCardInput) return;
    setCardSaving(true);
    setCardModalError(null);
    try {
      const response = await fetch(`/api/team/players/${selectedCardPlayerId}/player-card`, {
        method: "PUT",
        headers: {
          ...buildMockAuthHeaders(user),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editingCardInput),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to save player card");
      }
      const saved = (await response.json()) as PlayerCardDto;
      setEditingCard(saved);
      setPlayerCardEntries((current) =>
        current.map((entry) =>
          entry.playerId === selectedCardPlayerId ? { ...entry, card: saved } : entry
        )
      );
    } catch (error) {
      setCardModalError(error instanceof Error ? error.message : "Failed to save player card");
    } finally {
      setCardSaving(false);
    }
  }, [editingCardInput, selectedCardPlayerId, user]);

  const generateCoachCardBackground = useCallback(async () => {
    if (!user || !editingCard) return;
    setCardGeneratingBg(true);
    setCardModalError(null);
    try {
      const response = await fetch("/api/player-card/generate-background", {
        method: "POST",
        headers: {
          ...buildMockAuthHeaders(user),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tier: editingCard.tier,
          role: editingCard.role,
          sportIcon: editingCard.sportIcon,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Generation failed");
      }
      const payload = (await response.json()) as { css?: string };
      if (!payload.css) {
        throw new Error("Generation failed");
      }
      setCardAiBgCss(payload.css);
      setEditingCard((current) =>
        current
          ? {
              ...current,
              backgroundMode: "AI",
              backgroundUrl: null,
            }
          : current
      );
    } catch (error) {
      setCardModalError(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setCardGeneratingBg(false);
    }
  }, [editingCard, user]);

  if (role !== "coach" && role !== "parent" && role !== "admin") {
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
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2">
              <SearchIcon />
            </span>
            <input
              type="search"
              placeholder="Filter by player..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface)] py-2 pl-10 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              aria-label="Filter by player"
            />
          </div>
          <Select
            options={clubOptions}
            value={clubFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setClubFilter(e.target.value)}
            aria-label="Filter by club"
          />
          <Select
            options={squadOptions}
            value={squadFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSquadFilter(e.target.value)}
            aria-label="Filter by squad"
          />
          <div>
            <Input
              value={teamSearchQuery}
              onChange={(event) => setTeamSearchQuery(event.target.value)}
              placeholder="Search play-cricket teams..."
            />
          </div>
          <Select
            options={teamOptions}
            value={teamFilter}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setTeamFilter(event.target.value)}
            aria-label="Filter by play-cricket team"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/squads">
            <Button variant="secondary">Add Squad</Button>
          </Link>
          <Button
            variant="secondary"
            onClick={() => {
              setIsCreateTeamModalOpen(true);
              setTeamFormError(null);
            }}
          >
            Add Team
          </Button>
          <Link href="/players">
            <Button variant="secondary">Players Module</Button>
          </Link>
          {(role === "coach" || role === "admin") && (
            <Button onClick={handleAddPlayer} className="shrink-0">
              <PlusIcon />
              <span className="ml-2">Add Player</span>
            </Button>
          )}
        </div>
        <Card>
          <CardHeader>Assign Existing Player</CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Input
                placeholder="Search player..."
                value={assignPlayerSearch}
                onChange={(event) => setAssignPlayerSearch(event.target.value)}
              />
              <select
                value={assignPlayerId}
                onChange={(event) => setAssignPlayerId(event.target.value)}
                className="rounded-md border border-[var(--surface-secondary)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
              >
                <option value="">Select player...</option>
                {filteredAssignablePlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Search squad..."
                value={assignSquadSearch}
                onChange={(event) => setAssignSquadSearch(event.target.value)}
              />
              <select
                value={assignSquadId}
                onChange={(event) => setAssignSquadId(event.target.value)}
                className="rounded-md border border-[var(--surface-secondary)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
              >
                <option value="">Select squad...</option>
                {filteredAssignableSquads.map((squad) => (
                  <option key={squad.id} value={squad.id}>
                    {squad.name}
                  </option>
                ))}
              </select>
              <Button
                onClick={() => void handleAssignExistingPlayer()}
                disabled={!assignPlayerId || !assignSquadId || isAssigningPlayer}
              >
                {isAssigningPlayer ? "Assigning..." : "Assign Player"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Players"
          value={rosterStats.totalPlayers}
          icon={<UsersIcon />}
        />
        <StatCard
          label="Active Sessions"
          value={rosterStats.activeSessions}
          icon={<PlayIcon />}
        />
        <StatCard
          label="Avg. Grade"
          value={rosterStats.avgGrade}
          icon={<StarIcon />}
        />
        <StatCard
          label="Pending Reviews"
          value={rosterStats.pendingReviews}
          icon={<ClockIcon />}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <span>Team Player Cards</span>
        </CardHeader>
        <CardContent>
          {cardsLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : cardsError ? (
            <p className="text-sm text-[var(--danger)]">{cardsError}</p>
          ) : playerCardEntries.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">
              No player cards available yet.
            </p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {playerCardEntries.map((entry) => (
                <div key={entry.playerId} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => void openCardEditorForPlayer(entry.playerId)}
                    className="mb-2 text-left text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--primary)]"
                  >
                    {entry.playerName}
                  </button>
                  <PlayerCardDisplay card={entry.card} aiBgCss={null} compact interactive={false} />
                </div>
              ))}

              {(role === "coach" || role === "admin") && (
                <button
                  type="button"
                  onClick={() => setIsCardModalOpen(true)}
                  className="mt-6 flex h-[360px] w-[250px] shrink-0 items-center justify-center rounded-2xl border border-dashed border-[var(--surface-secondary)] bg-[var(--surface-secondary)]/20 text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  + Add / Edit Player Card
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
                  void refreshRoster().catch((error: unknown) => {
                    setErrorMessage(error instanceof Error ? error.message : "Failed to load roster");
                    setPageState("error");
                  });
                }}
              >
                Retry
              </Button>
            </div>
          )}

          {(pageState === "ready" || pageState === "empty") && filteredPlayers.length === 0 && (
            <EmptyState
              title="No players found"
              description={
                searchQuery || squadFilter !== "all" || clubFilter !== "all" || teamFilter !== "all"
                  ? "Try adjusting your search or filter."
                  : "Add players to your roster to get started."
              }
              actionLabel={
                !searchQuery &&
                squadFilter === "all" &&
                clubFilter === "all" &&
                teamFilter === "all" &&
                (role === "coach" || role === "admin")
                  ? "Add Player"
                  : undefined
              }
              onAction={
                !searchQuery &&
                squadFilter === "all" &&
                clubFilter === "all" &&
                teamFilter === "all" &&
                (role === "coach" || role === "admin")
                  ? handleAddPlayer
                  : undefined
              }
              icon={<GroupIcon />}
            />
          )}

          {pageState === "ready" && filteredPlayers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1020px]" aria-label="Player roster">
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
                      Position
                    </th>
                    <th className="pb-3 text-left text-sm font-semibold text-[var(--text-secondary)]">
                      Hand
                    </th>
                    <th className="pb-3 text-left text-sm font-semibold text-[var(--text-secondary)]">
                      Bowl
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
                      <td className="py-4 text-sm text-[var(--text-primary)]">
                        {getPositionTag(player.primaryPosition || player.position)}
                      </td>
                      <td className="py-4 text-sm text-[var(--text-primary)]">
                        {getHandednessAbbreviation(player.battingStyle)}
                      </td>
                      <td className="py-4 text-sm text-[var(--text-primary)]">
                        {getBowlingAbbreviation(player.bowlingStyle)}
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

      {isCardModalOpen && (role === "coach" || role === "admin") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[95vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-[var(--surface)] p-5">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Edit Player Card</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Update a player's card. The player will receive a notification after save.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsCardModalOpen(false);
                  setCardModalError(null);
                  setSelectedCardPlayerId("");
                  setEditingCard(null);
                }}
              >
                Close
              </Button>
            </div>

            <div className="mb-4">
              <Select
                label="Player"
                options={teamPlayers.map((player) => ({ value: player.id, label: player.name }))}
                value={selectedCardPlayerId}
                onChange={(event) => {
                  const nextPlayerId = event.target.value;
                  if (!nextPlayerId) return;
                  void openCardEditorForPlayer(nextPlayerId);
                }}
              />
            </div>

            {cardModalError ? (
              <p
                className={`mb-3 rounded-md p-2 text-sm ${
                  isCardStorageFullError
                    ? "border border-amber-400/35 bg-amber-400/10 text-amber-300"
                    : "border border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]"
                }`}
              >
                {cardModalError}
              </p>
            ) : null}

            {selectedCardPlayer && editingCard ? (
              <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <PlayerCardDisplay
                  card={editingCard}
                  aiBgCss={cardAiBgCss}
                  compact
                  onDisplayNameCommit={(displayName) =>
                    setEditingCard((current) =>
                      current
                        ? {
                            ...current,
                            displayName,
                          }
                        : current
                    )
                  }
                />
                <PlayerCardEditor
                  card={editingCard}
                  aiBgCss={cardAiBgCss}
                  generatingBg={cardGeneratingBg}
                  saving={cardSaving}
                  onChange={(partial) =>
                    setEditingCard((current) =>
                      current
                        ? {
                            ...current,
                            ...partial,
                            overall: Math.round(
                              ((partial.statTec ?? current.statTec) +
                                (partial.statPow ?? current.statPow) +
                                (partial.statTim ?? current.statTim) +
                                (partial.statCon ?? current.statCon) +
                                (partial.statPac ?? current.statPac) +
                                (partial.statFie ?? current.statFie)) /
                                6
                            ),
                          }
                        : current
                    )
                  }
                  onSave={() => void saveCoachEditedCard()}
                  onGenerateBg={() => void generateCoachCardBackground()}
                  onProfileUpload={(file) => {
                    void uploadCardImage(file)
                      .then((url) =>
                        setEditingCard((current) =>
                          current
                            ? {
                                ...current,
                                profilePhotoUrl: url,
                              }
                            : current
                        )
                      )
                      .catch((error: unknown) =>
                        setCardModalError(
                          error instanceof Error ? error.message : "Image upload failed"
                        )
                      );
                  }}
                  onBgUpload={(file) => {
                    void uploadCardImage(file)
                      .then((url) =>
                        setEditingCard((current) =>
                          current
                            ? {
                                ...current,
                                backgroundUrl: url,
                                backgroundMode: "UPLOAD",
                              }
                            : current
                        )
                      )
                      .catch((error: unknown) =>
                        setCardModalError(
                          error instanceof Error ? error.message : "Image upload failed"
                        )
                      );
                  }}
                />
              </div>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">
                Select a player to load and edit their card.
              </p>
            )}
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-[var(--surface)] p-5">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Add Player</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Create a new player profile. A name is sufficient; other details can be added later.
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant={addPlayerMode === "single" ? "primary" : "secondary"}
                onClick={() => {
                  setAddPlayerMode("single");
                  setModalError(null);
                  setBulkAddSummary(null);
                }}
                disabled={isModalSubmitting}
              >
                Single
              </Button>
              <Button
                variant={addPlayerMode === "bulk" ? "primary" : "secondary"}
                onClick={() => {
                  setAddPlayerMode("bulk");
                  setModalError(null);
                  setBulkAddSummary(null);
                }}
                disabled={isModalSubmitting}
              >
                Bulk
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {addPlayerMode === "single" ? (
                <>
                  <Input
                    label="Player name"
                    value={newPlayerForm.displayName}
                    onChange={(event) =>
                      setNewPlayerForm((current) => ({ ...current, displayName: event.target.value }))
                    }
                  />
                  <Input
                    label="First name (optional)"
                    value={newPlayerForm.firstName}
                    onChange={(event) =>
                      setNewPlayerForm((current) => ({ ...current, firstName: event.target.value }))
                    }
                  />
                  <Input
                    label="Last name (optional)"
                    value={newPlayerForm.lastName}
                    onChange={(event) =>
                      setNewPlayerForm((current) => ({ ...current, lastName: event.target.value }))
                    }
                  />
                </>
              ) : (
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                    Players (one per line)
                  </label>
                  <textarea
                    value={bulkPlayerLines}
                    onChange={(event) => setBulkPlayerLines(event.target.value)}
                    placeholder={"Alex Johnson\nSam Carter\nPriya Shah"}
                    className="min-h-[180px] w-full rounded-md border border-[var(--surface-secondary)] bg-[var(--surface)] px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Tip: paste a roster list and submit once.
                  </p>
                </div>
              )}
              {modalError && <p className="text-sm text-[var(--danger)]">{modalError}</p>}
              {bulkAddSummary && (
                <div className="rounded-md border border-[var(--surface-secondary)] bg-[var(--surface-secondary)]/40 p-3">
                  <p className="text-sm text-[var(--text-primary)]">
                    Added {bulkAddSummary.created} player(s), failed {bulkAddSummary.failed}.
                  </p>
                  {bulkAddSummary.errors.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-[var(--danger)]">
                      {bulkAddSummary.errors.slice(0, 6).map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setModalError(null);
                }}
                disabled={isModalSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={() =>
                  void (addPlayerMode === "single" ? submitAddPlayer() : submitBulkAddPlayers())
                }
                disabled={isModalSubmitting}
              >
                {isModalSubmitting
                  ? addPlayerMode === "single"
                    ? "Saving..."
                    : "Uploading..."
                  : addPlayerMode === "single"
                    ? "Create Player"
                    : "Add Players"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isCreateTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-[var(--surface)] p-5">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Add Team</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Create a new team in-app. Play-Cricket sync can be added later.
            </p>
            <div className="mt-4 space-y-3">
              <Input
                label="Team name"
                value={teamFormState.name}
                onChange={(event) =>
                  setTeamFormState((current) => ({ ...current, name: event.target.value }))
                }
              />
              <Input
                label="Club"
                value={teamFormState.clubName}
                onChange={(event) =>
                  setTeamFormState((current) => ({ ...current, clubName: event.target.value }))
                }
              />
              <Input
                label="Squad hint (optional)"
                value={teamFormState.squadHint}
                onChange={(event) =>
                  setTeamFormState((current) => ({ ...current, squadHint: event.target.value }))
                }
              />
              {teamFormError && <p className="text-sm text-[var(--danger)]">{teamFormError}</p>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setIsCreateTeamModalOpen(false)}
                disabled={isCreatingTeam}
              >
                Cancel
              </Button>
              <Button onClick={() => void handleCreateTeam()} disabled={isCreatingTeam}>
                {isCreatingTeam ? "Creating..." : "Create Team"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-[var(--surface)] p-5">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Edit Player Profile</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Update technical and profile details for {selectedPlayer.name}.
            </p>
            
            {/* Avatar Upload Section */}
            <div className="mt-4 flex items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
              <div className="flex-shrink-0">
                {editPlayerForm.avatarUrl ? (
                  <img
                    src={editPlayerForm.avatarUrl}
                    alt="Player avatar"
                    className="h-20 w-20 rounded-full object-cover ring-2 ring-[var(--border)]"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--surface)] text-2xl font-semibold text-[var(--text-secondary)] ring-2 ring-[var(--border)]">
                    {selectedPlayer.avatarInitials}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-[var(--text-primary)]">
                  Player Avatar
                </label>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Choose from gallery or upload a custom photo
                </p>
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsAvatarGalleryOpen(true)}
                    disabled={isModalSubmitting}
                  >
                    Select Avatar
                  </Button>
                  {editPlayerForm.avatarUrl && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditPlayerForm((current) => ({ ...current, avatarUrl: "" }))}
                      disabled={isModalSubmitting}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input
                label="Display name"
                value={editPlayerForm.displayName}
                onChange={(event) =>
                  setEditPlayerForm((current) => ({ ...current, displayName: event.target.value }))
                }
              />
              <Input
                label="Date of birth"
                type="date"
                value={editPlayerForm.dateOfBirth}
                onChange={(event) =>
                  setEditPlayerForm((current) => ({ ...current, dateOfBirth: event.target.value }))
                }
              />
              <Input
                label="First name"
                value={editPlayerForm.firstName}
                onChange={(event) =>
                  setEditPlayerForm((current) => ({ ...current, firstName: event.target.value }))
                }
              />
              <Input
                label="Last name"
                value={editPlayerForm.lastName}
                onChange={(event) =>
                  setEditPlayerForm((current) => ({ ...current, lastName: event.target.value }))
                }
              />
              <Input
                label="Primary position"
                value={editPlayerForm.primaryPosition}
                onChange={(event) =>
                  setEditPlayerForm((current) => ({ ...current, primaryPosition: event.target.value }))
                }
              />
              <Select
                label="Age group"
                options={AGE_GROUP_OPTIONS}
                value={editPlayerForm.ageGroup}
                onChange={(event) =>
                  setEditPlayerForm((current) => ({ ...current, ageGroup: event.target.value }))
                }
              />
              <Input
                label="Batting style"
                value={editPlayerForm.battingStyle}
                onChange={(event) =>
                  setEditPlayerForm((current) => ({ ...current, battingStyle: event.target.value }))
                }
              />
              <Input
                label="Bowling style"
                value={editPlayerForm.bowlingStyle}
                onChange={(event) =>
                  setEditPlayerForm((current) => ({ ...current, bowlingStyle: event.target.value }))
                }
              />
              <Input
                label="Club or school"
                value={editPlayerForm.clubOrSchool}
                onChange={(event) =>
                  setEditPlayerForm((current) => ({ ...current, clubOrSchool: event.target.value }))
                }
              />
              <Select
                label="Profile visibility"
                options={[
                  { value: "COACHES_PARENTS", label: "Coaches & Parents" },
                  { value: "COACHES_ONLY", label: "Coaches Only" },
                  { value: "PUBLIC", label: "Public" },
                ]}
                value={editPlayerForm.profileVisibility}
                onChange={(event) =>
                  setEditPlayerForm((current) => ({ ...current, profileVisibility: event.target.value }))
                }
              />
            </div>
            {modalError && <p className="mt-3 text-sm text-[var(--danger)]">{modalError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedPlayer(null);
                  setModalError(null);
                }}
                disabled={isModalSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={() => void submitEditPlayer()} disabled={isModalSubmitting}>
                {isModalSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-[var(--surface)] p-5">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Remove Player</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Are you sure you want to remove {selectedPlayer.name} from this roster?
            </p>
            {modalError && <p className="mt-3 text-sm text-[var(--danger)]">{modalError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedPlayer(null);
                  setModalError(null);
                }}
                disabled={isModalSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={() => void submitRemovePlayer()} disabled={isModalSubmitting}>
                {isModalSubmitting ? "Removing..." : "Remove"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Gallery Modal */}
      <AvatarGalleryModal
        isOpen={isAvatarGalleryOpen}
        onClose={() => setIsAvatarGalleryOpen(false)}
        onSelect={handleAvatarSelect}
        currentAvatarUrl={editPlayerForm.avatarUrl}
      />
    </div>
  );
}
