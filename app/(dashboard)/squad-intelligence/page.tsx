"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMockAuth } from "@/app/hooks/useMockAuth";
import { buildMockAuthHeaders } from "@/app/lib/mock-auth-headers";
import { useToast } from "@/app/hooks/useToast";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { LoadingSpinner } from "@/app/components/common/LoadingSpinner";
import { ToastContainer } from "@/app/components/ui/Toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const STORAGE_KEY_CLUB = "squad-intelligence-club-id";
const STORAGE_KEY_SEASON = "squad-intelligence-season";
const DEBOUNCE_MS = 300;
const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

interface ClubOption {
  id: string;
  name: string;
  playCricketId: string;
}

interface TeamOption {
  id: string;
  name: string;
}

interface StatRow {
  season: string;
  competitionType: string;
  battingInnings: number;
  battingRuns: number;
  battingAverage: number | null;
  battingHighest: number;
  battingFifties: number;
  battingHundreds: number;
  battingStrikeRate: number | null;
  bowlingWickets: number;
  bowlingAverage: number | null;
  bowlingEconomy: number | null;
  bowlingBestFigures: string | null;
  bowlingFiveWickets: number;
  fieldingCatches: number;
  fieldingStumpings: number;
  fieldingRunOuts: number;
  syncedAt: string;
}

interface PlayerRecord {
  importId: string;
  playCricketPersonId: string;
  firstName: string;
  lastName: string;
  teamName: string;
  status: "PENDING" | "INVITED" | "LINKED";
  linkedUserId: string | null;
  stats: StatRow[];
}

interface AnalysisResponse {
  summary: string;
  improving: { name: string; reason: string }[];
  declining: { name: string; reason: string }[];
  standouts: { name: string; reason: string; category: string }[];
  insights: string[];
  dataNote: string;
  generatedAt?: string;
}

function SyncIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function formatNull(v: number | null): string {
  return v == null || Number.isNaN(v) ? "—" : String(v);
}
function formatAvg(v: number | null): string {
  return v == null || Number.isNaN(v) ? "—" : v.toFixed(2);
}
function formatSR(v: number | null): string {
  return v == null || Number.isNaN(v) ? "—" : v.toFixed(1);
}
function formatEcon(v: number | null): string {
  return v == null || Number.isNaN(v) ? "—" : v.toFixed(2);
}

function StatusBadge({ status }: { status: PlayerRecord["status"] }) {
  const config = {
    LINKED: { label: "On Koda", className: "bg-[var(--success)]/20 text-[var(--success)]" },
    PENDING: { label: "Not on Koda", className: "bg-[#6b7280]/20 text-[#9ca3af]" },
    INVITED: { label: "Invited", className: "bg-[#3b82f6]/20 text-[#3b82f6]" },
  }[status] ?? { label: "Unknown", className: "bg-[#6b7280]/20 text-[#9ca3af]" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}>{config.label}</span>
  );
}

export default function SquadIntelligencePage() {
  const { user, role } = useMockAuth();
  const { toasts, showToast, closeToast } = useToast();

  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [hasEcbKey, setHasEcbKey] = useState<boolean | null>(null);

  const [clubId, setClubIdState] = useState<string>("");
  const [season, setSeasonState] = useState<string>(() => new Date().getFullYear().toString());
  const [competitionType, setCompetitionType] = useState<string>("");
  const [teamId, setTeamId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [sortBy, setSortBy] = useState("battingRuns");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const setClubId = useCallback((v: string) => {
    setClubIdState(v);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_CLUB, v);
      } catch {}
    }
  }, []);

  const setSeason = useCallback((v: string) => {
    setSeasonState(v);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_SEASON, v);
      } catch {}
    }
  }, []);

  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1 });
  const [meta, setMeta] = useState<{
    seasons: string[];
    teams: TeamOption[];
    lastSyncedAt: string | null;
  }>({ seasons: [], teams: [], lastSyncedAt: null });

  const [playersLoading, setPlayersLoading] = useState(false);
  type SyncStatus = "idle" | "pending" | "running" | "complete" | "failed";
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncProgress, setSyncProgress] = useState<{
    playersUpserted: number;
    statsRowsUpserted: number;
    matchesSynced: number;
    errorMessage: string | null;
  }>({ playersUpserted: 0, statsRowsUpserted: 0, matchesSynced: 0, errorMessage: null });
  const [inviteUrls, setInviteUrls] = useState<Record<string, string>>({});
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [aiCardCollapsed, setAiCardCollapsed] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);

  // Load clubs and ECB key on mount
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        const headers = buildMockAuthHeaders(user);
        const [clubsRes, ecbRes] = await Promise.all([
          fetch("/api/clubs", { headers }),
          fetch("/api/coach/ecb-api-key", { headers }),
        ]);
        if (cancelled) return;
        if (clubsRes.ok) {
          const data = await clubsRes.json();
          const list = (data.clubs ?? []).map((c: { id: string; name: string; playCricketId?: string }) => ({
            id: c.id,
            name: c.name,
            playCricketId: c.playCricketId ?? c.id,
          }));
          setClubs(list);
        }
        if (ecbRes.ok) {
          const ecbData = await ecbRes.json();
          setHasEcbKey(!!ecbData.hasKey);
        } else {
          setHasEcbKey(false);
        }
      } catch {
        if (!cancelled) setHasEcbKey(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Hydrate from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedClub = localStorage.getItem(STORAGE_KEY_CLUB);
      const savedSeason = localStorage.getItem(STORAGE_KEY_SEASON);
      if (savedClub) setClubIdState(savedClub);
      if (savedSeason) setSeasonState(savedSeason);
    } catch {}
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch players when filters change
  const fetchPlayers = useCallback(async () => {
    if (!user || !clubId) {
      setPlayers([]);
      setPagination({ total: 0, totalPages: 1, page: 1 });
      return;
    }

    setPlayersLoading(true);
    try {
      const params = new URLSearchParams({
        clubId,
        season,
        sortBy,
        sortDir,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (teamId) params.set("teamId", teamId);
      if (competitionType) params.set("competitionType", competitionType);
      if (searchDebounced) params.set("search", searchDebounced);

      const res = await fetch(`/api/coach/play-cricket/players?${params}`, {
        headers: buildMockAuthHeaders(user),
      });
      if (!res.ok) {
        throw new Error("Failed to load players");
      }
      const data = await res.json();
      setPlayers(data.players ?? []);
      const pag = data.pagination ?? {};
      setPagination({
        total: pag.total ?? 0,
        totalPages: pag.totalPages ?? 1,
        page: pag.page ?? 1,
      });
      const m = data.meta ?? {};
      setMeta({
        seasons: m.seasons ?? [],
        teams: m.teams ?? [],
        lastSyncedAt: m.lastSyncedAt ?? null,
      });
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to load players", "error");
      setPlayers([]);
    } finally {
      setPlayersLoading(false);
    }
  }, [user, clubId, season, teamId, competitionType, searchDebounced, sortBy, sortDir, page, pageSize, showToast]);

  useEffect(() => {
    void fetchPlayers();
  }, [fetchPlayers]);

  const handleSync = useCallback(async () => {
    if (!user || !clubId) return;
    setSyncStatus("pending");
    setSyncProgress({ playersUpserted: 0, statsRowsUpserted: 0, matchesSynced: 0, errorMessage: null });
    try {
      const res = await fetch("/api/coach/play-cricket/sync", {
        method: "POST",
        headers: {
          ...buildMockAuthHeaders(user),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clubId, season }),
      });
      const body = await res.json();
      if (!res.ok) {
        setSyncStatus("failed");
        setSyncProgress((p) => ({ ...p, errorMessage: body?.error ?? "Sync failed" }));
        showToast(body?.error ?? "Sync failed", "error");
        return;
      }
      setSyncStatus("running");
      const pollInterval = 3000;
      const poll = async () => {
        const statusRes = await fetch(
          `/api/coach/play-cricket/sync/status?clubId=${encodeURIComponent(clubId)}&season=${encodeURIComponent(season)}`,
          { headers: buildMockAuthHeaders(user) }
        );
        const statusData = await statusRes.json().catch(() => ({}));
        setSyncProgress({
          playersUpserted: statusData.playersUpserted ?? 0,
          statsRowsUpserted: statusData.statsRowsUpserted ?? 0,
          matchesSynced: statusData.matchesSynced ?? 0,
          errorMessage: statusData.errorMessage ?? null,
        });
        if (statusData.status === "COMPLETE") {
          setSyncStatus("complete");
          showToast(
            `Sync complete — ${statusData.playersUpserted ?? 0} players, ${statusData.statsRowsUpserted ?? 0} stat rows, ${statusData.matchesSynced ?? 0} matches.`,
            "success"
          );
          void fetchPlayers();
          return;
        }
        if (statusData.status === "FAILED") {
          setSyncStatus("failed");
          showToast(statusData.errorMessage ?? "Sync failed", "error");
          return;
        }
        setTimeout(poll, pollInterval);
      };
      setTimeout(poll, pollInterval);
    } catch (e) {
      setSyncStatus("failed");
      setSyncProgress((p) => ({ ...p, errorMessage: e instanceof Error ? e.message : "Sync failed" }));
      showToast(e instanceof Error ? e.message : "Sync failed", "error");
    }
  }, [user, clubId, season, fetchPlayers, showToast]);

  const handleInvite = useCallback(
    async (importId: string) => {
      if (!user) return;
      try {
        const res = await fetch("/api/coach/play-cricket/invite", {
          method: "POST",
          headers: {
            ...buildMockAuthHeaders(user),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ importId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast(data?.error ?? "Invite failed", "error");
          return;
        }
        setInviteUrls((prev) => ({ ...prev, [importId]: data.inviteUrl }));
        setPlayers((prev) =>
          prev.map((p) =>
            p.importId === importId ? { ...p, status: "INVITED" as const } : p
          )
        );
        showToast("Invite link generated. Share it with the player to get them on Koda.", "success");
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Invite failed", "error");
      }
    },
    [user, showToast]
  );

  const copyInviteUrl = useCallback((url: string) => {
    navigator.clipboard.writeText(url).then(
      () => showToast("Invite link copied to clipboard", "success"),
      () => showToast("Failed to copy", "error")
    );
  }, [showToast]);

  const handleGenerateAnalysis = useCallback(async () => {
    if (!user || !clubId) return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    setAnalysis(null);
    try {
      const res = await fetch("/api/coach/play-cricket/analyse", {
        method: "POST",
        headers: {
          ...buildMockAuthHeaders(user),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clubId,
          season,
          competitionType: competitionType || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setAnalysisError(body?.error ?? "Analysis failed");
        return;
      }
      setAnalysis(body);
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalysisLoading(false);
    }
  }, [user, clubId, season, competitionType]);

  const handleSort = useCallback((col: string) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
    setPage(1);
  }, [sortBy]);

  const seasonsForSelect = useMemo(() => {
    const current = new Date().getFullYear().toString();
    if (meta.seasons.length > 0) return meta.seasons;
    return [current];
  }, [meta.seasons]);

  const primaryStats = useMemo(() => {
    const compFilter = competitionType || null;
    return players.flatMap((p) =>
      p.stats
        .filter((s) => s.season === season)
        .filter((s) => !compFilter || s.competitionType === compFilter)
        .map((s) => ({ ...s, playerName: `${p.firstName} ${p.lastName}`, teamName: p.teamName }))
    );
  }, [players, season, competitionType]);

  const topBatters = useMemo(
    () =>
      [...primaryStats]
        .sort((a, b) => (b.battingRuns ?? 0) - (a.battingRuns ?? 0))
        .slice(0, 10)
        .map((s) => ({ name: s.playerName?.slice(0, 12) ?? "—", runs: s.battingRuns ?? 0, team: s.teamName })),
    [primaryStats]
  );

  const topBowlers = useMemo(
    () =>
      [...primaryStats]
        .sort((a, b) => (b.bowlingWickets ?? 0) - (a.bowlingWickets ?? 0))
        .slice(0, 10)
        .map((s) => ({ name: s.playerName?.slice(0, 12) ?? "—", wickets: s.bowlingWickets ?? 0, team: s.teamName })),
    [primaryStats]
  );

  const topFielders = useMemo(
    () =>
      [...primaryStats]
        .sort(
          (a, b) =>
            (b.fieldingCatches + b.fieldingStumpings + b.fieldingRunOuts) -
            (a.fieldingCatches + a.fieldingStumpings + a.fieldingRunOuts)
        )
        .slice(0, 10)
        .map((s) => ({
          name: s.playerName?.slice(0, 12) ?? "—",
          contributions: (s.fieldingCatches ?? 0) + (s.fieldingStumpings ?? 0) + (s.fieldingRunOuts ?? 0),
          team: s.teamName,
        })),
    [primaryStats]
  );

  const teamColorMap = useMemo(() => {
    const teams = [...new Set(primaryStats.map((s) => s.teamName))];
    const map = new Map<string, string>();
    teams.forEach((t, i) => map.set(t, CHART_COLORS[i % CHART_COLORS.length]));
    return map;
  }, [primaryStats]);

  const showSync = role === "coach" || role === "admin";
  const lastSyncedLabel = meta.lastSyncedAt
    ? new Date(meta.lastSyncedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  if (role !== "coach" && role !== "admin") {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-[var(--text-secondary)]">Squad Intelligence is only available to coaches.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Squad Intelligence</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Powered by Play-Cricket data · Last synced: {lastSyncedLabel}
          </p>
        </div>
        {showSync &&
          (hasEcbKey === false ? (
            <Link
              href="/settings"
              className="rounded-lg border border-[var(--primary)]/50 px-4 py-2 text-sm text-[var(--primary)] hover:bg-[var(--primary)]/10"
            >
              Connect your ECB API key in Settings to enable sync →
            </Link>
          ) : (
            <Button
              variant="secondary"
              disabled={(syncStatus === "pending" || syncStatus === "running") || !clubId}
              onClick={() => void handleSync()}
              className="flex items-center gap-2"
            >
              {(syncStatus === "pending" || syncStatus === "running") ? (
                <LoadingSpinner size="sm" />
              ) : (
                <SyncIcon />
              )}
              {syncStatus === "pending" || syncStatus === "running"
                ? `Syncing… ${syncProgress.playersUpserted} players, ${syncProgress.matchesSynced} matches`
                : syncStatus === "failed"
                  ? "Retry sync"
                  : "Sync Now"}
            </Button>
          ))}
        {syncStatus === "failed" && syncProgress.errorMessage && (
          <p className="mt-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            {syncProgress.errorMessage}
          </p>
        )}
      </div>

      <p className="text-xs italic text-[var(--text-secondary)]">
        Player statistics are sourced from Play-Cricket, where they are publicly available. Data is stored only for
        coaching purposes and is deleted if you remove the club.
      </p>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Club</label>
          <select
            value={clubId}
            onChange={(e) => setClubId(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="">Select club</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Season</label>
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            {seasonsForSelect.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Format</label>
          <select
            value={competitionType}
            onChange={(e) => setCompetitionType(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="">All Formats</option>
            <option value="Limited Overs">Limited Overs</option>
            <option value="T20">T20</option>
            <option value="Declaration">Declaration</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Team</label>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="">All Teams</option>
            {meta.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Player name"
            className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60"
          />
        </div>
      </div>

      {/* AI Squad Intelligence Card */}
      <Card className="overflow-hidden border-[var(--primary)]/20">
        <div className="h-1 bg-gradient-to-r from-[var(--primary)]/60 to-[var(--primary)]/20" />
        <CardContent className="p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">✦ Squad Intelligence</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={analysisLoading || !clubId || players.length < 2}
                onClick={() => void handleGenerateAnalysis()}
              >
                {analysisLoading ? <LoadingSpinner size="sm" /> : analysis ? "Regenerate" : "Generate Squad Intelligence"}
              </Button>
              {analysis && (
                <button
                  onClick={() => setAiCardCollapsed((c) => !c)}
                  className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--border)]"
                  aria-label={aiCardCollapsed ? "Expand" : "Collapse"}
                >
                  {aiCardCollapsed ? "▲" : "▼"}
                </button>
              )}
            </div>
          </div>
          <p className="mb-4 text-xs text-[var(--text-secondary)]">
            Analysis is generated fresh each time and not stored.
          </p>

          {analysisLoading && (
            <div className="flex items-center gap-4 py-8">
              <LoadingSpinner size="lg" />
              <span className="text-[var(--text-secondary)]">Generating squad intelligence…</span>
            </div>
          )}

          {analysisError && (
            <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-4 text-[var(--danger)]">
              <p>{analysisError}</p>
              <Button variant="secondary" size="sm" className="mt-2" onClick={() => void handleGenerateAnalysis()}>
                Retry
              </Button>
            </div>
          )}

          {analysis && !analysisLoading && (
            <>
              {aiCardCollapsed ? (
                <p className="text-sm text-[var(--text-primary)] line-clamp-1">{analysis.summary}</p>
              ) : (
                <>
                  <p className="mb-4 text-base text-[var(--text-primary)]">{analysis.summary}</p>
                  <div className="mb-4 grid gap-4 sm:grid-cols-3">
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase text-[var(--text-secondary)]">
                        🏏 Improving Players
                      </h4>
                      <ul className="space-y-1 text-sm">
                        {analysis.improving?.slice(0, 3).map((x, i) => (
                          <li key={i}>
                            <span className="font-medium">{x.name}</span>: {x.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase text-[var(--text-secondary)]">
                        ⚠ Watch List
                      </h4>
                      <ul className="space-y-1 text-sm">
                        {analysis.declining?.slice(0, 3).map((x, i) => (
                          <li key={i}>
                            <span className="font-medium">{x.name}</span>: {x.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase text-[var(--text-secondary)]">
                        ⭐ Standouts
                      </h4>
                      <ul className="space-y-1 text-sm">
                        {analysis.standouts?.slice(0, 3).map((x, i) => (
                          <li key={i}>
                            <span className="font-medium">{x.name}</span>: {x.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <ul className="mb-4 list-inside list-disc text-sm text-[var(--text-secondary)]">
                    {analysis.insights?.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                  {analysis.dataNote && (
                    <p className="mb-4 text-xs text-[var(--text-secondary)] italic">{analysis.dataNote}</p>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => setIsAnalysisModalOpen(true)}>
                    View Full Analysis →
                  </Button>
                </>
              )}
            </>
          )}

          {!analysis && !analysisLoading && !analysisError && (
            <p className="py-4 text-sm text-[var(--text-secondary)]">
              Get AI-powered insights on your squad&apos;s performance, trends, and standout players.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Widgets */}
      {clubId && primaryStats.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <h4 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Top Batters</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topBatters} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fill: "var(--text-secondary)", fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={60} tick={{ fill: "var(--text-secondary)", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
                      labelStyle={{ color: "var(--text-primary)" }}
                    />
                    <Bar dataKey="runs" fill="var(--primary)" radius={[0, 4, 4, 0]}>
                      {topBatters.map((entry, i) => (
                        <Cell key={i} fill={teamColorMap.get(entry.team) ?? CHART_COLORS[0]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h4 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Top Bowlers</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topBowlers} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fill: "var(--text-secondary)", fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={60} tick={{ fill: "var(--text-secondary)", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
                      labelStyle={{ color: "var(--text-primary)" }}
                    />
                    <Bar dataKey="wickets" fill="var(--primary)" radius={[0, 4, 4, 0]}>
                      {topBowlers.map((entry, i) => (
                        <Cell key={i} fill={teamColorMap.get(entry.team) ?? CHART_COLORS[1]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h4 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Fielding Contributions</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topFielders} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fill: "var(--text-secondary)", fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={60} tick={{ fill: "var(--text-secondary)", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
                      labelStyle={{ color: "var(--text-primary)" }}
                    />
                    <Bar dataKey="contributions" fill="var(--primary)" radius={[0, 4, 4, 0]}>
                      {topFielders.map((entry, i) => (
                        <Cell key={i} fill={teamColorMap.get(entry.team) ?? CHART_COLORS[2]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Players Table */}
      <Card>
        <CardContent className="overflow-x-auto p-0">
          {playersLoading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          ) : players.length === 0 ? (
            <div className="py-16 text-center text-[var(--text-secondary)]">
              {clubId ? "No players found. Sync Play-Cricket data first." : "Select a club to view players."}
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
                    <th className="px-4 py-3 text-left">
                      <button onClick={() => handleSort("name")} className="font-medium hover:underline">
                        Player {sortBy === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">Team</th>
                    <th className="px-4 py-3 text-left">Format</th>
                    <th className="px-4 py-3 text-right">
                      <button onClick={() => handleSort("battingInnings")} className="font-medium hover:underline">
                        Inn {sortBy === "battingInnings" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <button onClick={() => handleSort("battingRuns")} className="font-medium hover:underline">
                        Runs {sortBy === "battingRuns" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">HS</th>
                    <th className="px-4 py-3 text-right">
                      <button onClick={() => handleSort("battingAverage")} className="font-medium hover:underline">
                        Avg {sortBy === "battingAverage" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">SR</th>
                    <th className="px-4 py-3 text-right">50s</th>
                    <th className="px-4 py-3 text-right">100s</th>
                    <th className="px-4 py-3 text-right">
                      <button onClick={() => handleSort("bowlingWickets")} className="font-medium hover:underline">
                        Wkts {sortBy === "bowlingWickets" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">Best</th>
                    <th className="px-4 py-3 text-right">Econ</th>
                    <th className="px-4 py-3 text-right">
                      <button onClick={() => handleSort("fieldingCatches")} className="font-medium hover:underline">
                        Ct {sortBy === "fieldingCatches" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">Invite / Status</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p) => {
                    const s = p.stats[0];
                    const inviteUrl = inviteUrls[p.importId];
                    return (
                      <tr key={p.importId} className="border-b border-[var(--border)] hover:bg-[var(--bg)]/50">
                        <td className="px-4 py-2 font-medium">{`${p.firstName} ${p.lastName}`}</td>
                        <td className="px-4 py-2">{p.teamName}</td>
                        <td className="px-4 py-2">{s?.competitionType ?? "—"}</td>
                        <td className="px-4 py-2 text-right">{formatNull(s?.battingInnings)}</td>
                        <td className="px-4 py-2 text-right">{formatNull(s?.battingRuns)}</td>
                        <td className="px-4 py-2 text-right">{formatNull(s?.battingHighest)}</td>
                        <td className="px-4 py-2 text-right">{formatAvg(s?.battingAverage)}</td>
                        <td className="px-4 py-2 text-right">{formatSR(s?.battingStrikeRate)}</td>
                        <td className="px-4 py-2 text-right">{formatNull(s?.battingFifties)}</td>
                        <td className="px-4 py-2 text-right">{formatNull(s?.battingHundreds)}</td>
                        <td className="px-4 py-2 text-right">{formatNull(s?.bowlingWickets)}</td>
                        <td className="px-4 py-2 text-right">{s?.bowlingBestFigures ?? "—"}</td>
                        <td className="px-4 py-2 text-right">{formatEcon(s?.bowlingEconomy)}</td>
                        <td className="px-4 py-2 text-right">{formatNull(s?.fieldingCatches)}</td>
                        <td className="px-4 py-2">
                          {p.status === "LINKED" ? (
                            <span className="rounded-full bg-[var(--success)]/20 px-2 py-0.5 text-xs font-medium text-[var(--success)]">
                              On Koda ✓
                            </span>
                          ) : p.status === "INVITED" ? (
                            <span className="flex items-center gap-1">
                              <StatusBadge status="INVITED" />
                              {inviteUrl && (
                                <button
                                  type="button"
                                  onClick={() => copyInviteUrl(inviteUrl)}
                                  className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--border)]"
                                  title="Copy invite link"
                                  aria-label="Copy invite link"
                                >
                                  📋
                                </button>
                              )}
                            </span>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-xs"
                              onClick={() => void handleInvite(p.importId)}
                            >
                              Invite to Koda
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
                <span className="text-sm text-[var(--text-secondary)]">
                  {pagination.total} players · Page {pagination.page} of {pagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    ←
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    →
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Full Analysis Modal */}
      {isAnalysisModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsAnalysisModalOpen(false)}
        >
          <div
            className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-[var(--surface)] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">Full Squad Intelligence</h3>
              <Button variant="secondary" size="sm" onClick={() => setIsAnalysisModalOpen(false)}>
                Close
              </Button>
            </div>
            {analysis && (
              <>
                <p className="mb-4 text-base text-[var(--text-primary)]">{analysis.summary}</p>
                <div className="mb-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase text-[var(--text-secondary)]">
                      🏏 Improving Players
                    </h4>
                    <ul className="space-y-1 text-sm">
                      {analysis.improving?.map((x, i) => (
                        <li key={i}>
                          <span className="font-medium">{x.name}</span>: {x.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase text-[var(--text-secondary)]">
                      ⚠ Watch List
                    </h4>
                    <ul className="space-y-1 text-sm">
                      {analysis.declining?.map((x, i) => (
                        <li key={i}>
                          <span className="font-medium">{x.name}</span>: {x.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase text-[var(--text-secondary)]">
                      ⭐ Standouts
                    </h4>
                    <ul className="space-y-1 text-sm">
                      {analysis.standouts?.map((x, i) => (
                        <li key={i}>
                          <span className="font-medium">{x.name}</span>: {x.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <ul className="mb-4 list-inside list-disc text-sm text-[var(--text-secondary)]">
                  {analysis.insights?.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
                {analysis.dataNote && (
                  <p className="mb-4 text-xs text-[var(--text-secondary)] italic">{analysis.dataNote}</p>
                )}
                {meta.seasons.length > 1 && primaryStats.length > 0 && (
                  <div className="mb-4">
                    <h4 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                      Season-on-season comparison (top 5 players)
                    </h4>
                    <SeasonComparisonChart
                      players={players}
                      seasons={meta.seasons}
                      teamColorMap={teamColorMap}
                    />
                  </div>
                )}
                <p className="text-xs text-[var(--text-secondary)]">
                  Powered by Play-Cricket data via the ECB API · Analysis generated{" "}
                  {analysis.generatedAt ? new Date(analysis.generatedAt).toLocaleString() : "—"}
                </p>
                <p className="mt-2 text-xs italic text-[var(--text-secondary)]">
                  This analysis is based on match statistics only and does not reflect players&apos; technical
                  development.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  );
}

function SeasonComparisonChart({
  players,
  seasons,
  teamColorMap,
}: {
  players: PlayerRecord[];
  seasons: string[];
  teamColorMap: Map<string, string>;
}) {
  const topFiveByRuns = [...players]
    .sort((a, b) => ((b.stats[0]?.battingRuns ?? 0) - (a.stats[0]?.battingRuns ?? 0)))
    .slice(0, 5);

  const chartData = seasons.map((season) => {
    const point: Record<string, string | number> = { season };
    topFiveByRuns.forEach((p, i) => {
      const stat = p.stats.find((s) => s.season === season);
      const name = `${p.firstName} ${p.lastName}`.slice(0, 8);
      point[`${name}_bat`] = stat?.battingAverage ?? 0;
      point[`${name}_bowl`] = stat?.bowlingAverage ?? 0;
    });
    return point;
  });

  const lines = topFiveByRuns.flatMap((p) => {
    const name = `${p.firstName} ${p.lastName}`.slice(0, 8);
    const color = teamColorMap.get(p.teamName) ?? CHART_COLORS[0];
    return [
      { dataKey: `${name}_bat`, stroke: color, name: `${name} (Avg)` },
      { dataKey: `${name}_bowl`, stroke: color, strokeDasharray: "4 4", name: `${name} (Bowl Avg)` },
    ];
  });

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="season" tick={{ fill: "var(--text-secondary)", fontSize: 10 }} />
          <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 10 }} />
          <Tooltip
            contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
            labelStyle={{ color: "var(--text-primary)" }}
          />
          <Legend />
          {lines.slice(0, 6).map((l, i) => (
            <Line key={i} type="monotone" dataKey={l.dataKey} stroke={l.stroke} strokeDasharray={l.strokeDasharray} name={l.name} dot={{ r: 3 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
