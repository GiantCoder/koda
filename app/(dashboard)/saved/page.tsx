"use client";

import { useState, useEffect } from "react";
import { useMockAuth } from "@/app/hooks/useMockAuth";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { CollectionCard } from "@/app/components/collections/CollectionCard";
import { SavedClipCard } from "@/app/components/collections/SavedClipCard";
import { LoadingSpinner } from "@/app/components/common/LoadingSpinner";
import { EmptyState } from "@/app/components/common/EmptyState";

interface Collection {
  id: string;
  name: string;
  description?: string | null;
  clipCount: number;
  thumbnails: Array<{
    videoId: string;
    filename: string;
    cdnUrl?: string | null;
  }>;
  updatedAt: string;
}

interface RecentClip {
  id: string;
  videoId: string;
  filename: string;
  cdnUrl?: string | null;
  durationSeconds?: number | null;
  savedAt: string;
  notes?: string | null;
  analysis?: {
    shotType?: string | null;
    gradeLetter?: string | null;
    gradeOverall?: number | null;
  } | null;
}

export default function SavedPage() {
  const { user } = useMockAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [recentClips, setRecentClips] = useState<RecentClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/collections");
      if (!response.ok) throw new Error("Failed to fetch collections");
      
      const data = await response.json();
      setCollections(data.collections);

      // Extract recent clips from all collections
      const allClips: RecentClip[] = [];
      for (const collection of data.collections) {
        if (collection.thumbnails && collection.thumbnails.length > 0) {
          // We'll need to fetch full clip details from each collection
          const collectionResponse = await fetch(`/api/collections/${collection.id}`);
          if (collectionResponse.ok) {
            const collectionData = await collectionResponse.json();
            allClips.push(...collectionData.collection.clips);
          }
        }
      }

      // Sort by savedAt and take the 12 most recent
      const sortedClips = allClips
        .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
        .slice(0, 12);
      
      setRecentClips(sortedClips);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl">
        <Card>
          <CardContent>
            <p className="text-[var(--error)]">Error: {error}</p>
            <Button onClick={fetchData} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalClips = collections.reduce((sum, c) => sum + c.clipCount, 0);

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Saved</h1>
            <p className="mt-1 text-[var(--text-secondary)]">
              Your collections and saved clips
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded p-2 ${
                viewMode === "grid"
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
              }`}
              title="Grid view"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded p-2 ${
                viewMode === "list"
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
              }`}
              title="List view"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* My Collections Section */}
      <Card className="mb-8">
        <div className="flex items-center justify-between">
          <CardHeader className="mb-0 flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            My Collections
            {collections.length > 0 && (
              <span className="ml-2 rounded-full bg-[var(--primary)] px-2 py-0.5 text-xs text-white">
                {collections.length}
              </span>
            )}
          </CardHeader>
        </div>
        <CardContent>
          {collections.length > 0 ? (
            <div
              className={
                viewMode === "grid"
                  ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  : "space-y-3"
              }
            >
              {collections.map((collection) => (
                <CollectionCard key={collection.id} {...collection} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={
                <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
              }
              title="No collections yet"
              description="Start saving clips to organize your training videos"
            />
          )}
        </CardContent>
      </Card>

      {/* Recently Saved Section */}
      {recentClips.length > 0 && (
        <Card>
          <CardHeader className="flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Recently Saved
            <span className="ml-2 rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-xs text-[var(--text-tertiary)]">
              {totalClips} total clips
            </span>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {recentClips.map((clip) => (
                <SavedClipCard key={clip.id} {...clip} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
