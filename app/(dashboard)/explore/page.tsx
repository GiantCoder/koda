"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { LoadingSpinner } from "@/app/components/common/LoadingSpinner";

interface Clip {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number | null;
  grade: string;
  gradeScore: number;
  shotType: string;
  views: number;
  likes: number;
  uploadedBy: string;
  uploadedById: string;
  uploadedAt: string;
}

const SHOT_TYPES = [
  { value: "all", label: "All Clips" },
  { value: "COVER_DRIVE", label: "Drive Shots" },
  { value: "CUT", label: "Cut Shots" },
  { value: "PULL", label: "Pull Shots" },
  { value: "HOOK", label: "Hook Shots" },
  { value: "DEFENSIVE", label: "Defensive" },
];

const SORT_OPTIONS = [
  { value: "recent", label: "Most Recent" },
  { value: "top_rated", label: "Top Rated" },
  { value: "most_viewed", label: "Most Viewed" },
];

function getGradeColor(grade: string): string {
  if (grade === "A") return "bg-[var(--success)]";
  if (grade === "B+" || grade === "B") return "bg-[var(--primary)]";
  if (grade === "C+" || grade === "C") return "bg-[var(--warning)]";
  return "bg-[var(--text-secondary)]";
}

function formatShotType(shotType: string): string {
  return shotType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function ClipCard({ clip, onClick }: { clip: Clip; onClick: () => void }) {
  return (
    <Card className="group cursor-pointer overflow-hidden transition-all hover:scale-[1.02]" onClick={onClick}>
      <div className="relative aspect-video w-full overflow-hidden bg-[var(--surface-secondary)]">
        {/* Video thumbnail placeholder */}
        <div className="flex h-full w-full items-center justify-center">
          <svg className="h-16 w-16 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        {/* Grade badge */}
        <div className={`absolute left-2 top-2 rounded px-2 py-1 text-xs font-bold text-white ${getGradeColor(clip.grade)}`}>
          {clip.grade}
        </div>
        
        {/* Duration */}
        {clip.duration && (
          <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
            {clip.duration}s
          </div>
        )}
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-medium text-[var(--text-primary)] line-clamp-1">{clip.title}</h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)] line-clamp-2">{clip.description}</p>
        
        <div className="mt-3 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)]/10 text-xs font-medium text-[var(--primary)]">
            {clip.uploadedBy.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm text-[var(--text-secondary)]">{clip.uploadedBy}</span>
        </div>
        
        <div className="mt-2 flex items-center gap-4 text-xs text-[var(--text-secondary)]">
          <span className="flex items-center gap-1">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {clip.views}
          </span>
          <span className="flex items-center gap-1">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {clip.likes}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ExplorePage() {
  const router = useRouter();
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedShotType, setSelectedShotType] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const fetchClips = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (selectedShotType !== "all") params.set("shotType", selectedShotType);
      params.set("sort", sortBy);
      
      const res = await fetch(`/api/explore/clips?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch clips");
      
      const data = await res.json();
      setClips(data.clips || []);
    } catch (error) {
      console.error("Error fetching clips:", error);
      setClips([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedShotType, sortBy]);

  useEffect(() => {
    void fetchClips();
  }, [fetchClips]);

  const handleClipClick = useCallback((clipId: string) => {
    router.push(`/explore/${clipId}`);
  }, [router]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Explore</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Discover and learn from cricket training clips
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Search */}
        <div className="relative flex-1 lg:max-w-md">
          <input
            type="text"
            placeholder="Search clips, techniques, shot types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface)] px-4 py-2 pl-10 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
          <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Filters and Sort */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="gap-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </Button>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface)] px-4 py-2 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* View toggle */}
          <div className="flex rounded-lg border border-[var(--surface-secondary)]">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 ${viewMode === "grid" ? "bg-[var(--primary)] text-white" : "text-[var(--text-secondary)]"}`}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 ${viewMode === "list" ? "bg-[var(--primary)] text-white" : "text-[var(--text-secondary)]"}`}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Shot Type Filters */}
      <div className="flex flex-wrap gap-2">
        {SHOT_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => setSelectedShotType(type.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              selectedShotType === type.value
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]/80"
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Results count */}
      <div className="text-sm text-[var(--text-secondary)]">
        {loading ? "Loading..." : `${clips.length} clips found`}
        {searchQuery && ` • Showing results for "${searchQuery}"`}
      </div>

      {/* Clips Grid */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : clips.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <svg className="mx-auto h-16 w-16 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="mt-4 text-[var(--text-secondary)]">No clips found</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Try adjusting your search or filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {clips.map((clip) => (
            <ClipCard key={clip.id} clip={clip} onClick={() => handleClipClick(clip.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
