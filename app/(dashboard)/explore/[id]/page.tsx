"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { LoadingSpinner } from "@/app/components/common/LoadingSpinner";

interface ClipDetails {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnail: string;
  duration: number | null;
  grade: string;
  gradeScore: number;
  shotType: string;
  shotConfidence: number;
  views: number;
  likes: number;
  uploadedBy: string;
  uploadedById: string;
  uploadedByAvatar: string | null;
  uploadedAt: string;
  analysis: {
    scores: {
      stanceBalance: number;
      batPathFollowThrough: number;
    };
    coachingTips: Array<{ type?: string; title?: string; description?: string; body?: string }> | null;
    technicalFeedback: Array<{
      dimension: string;
      score: number;
      diagnosis: string;
      timestampSeconds: number | null;
      evidence: string;
      drill: string;
      confidence: "low" | "medium" | "high";
    }> | null;
  };
  relatedClips: Array<{
    id: string;
    title: string;
    thumbnail: string;
    duration: number | null;
    shotType: string;
    uploadedBy: string;
  }>;
}

function getGradeColor(grade: string): string {
  if (grade === "A") return "text-[var(--success)]";
  if (grade === "B+" || grade === "B") return "text-[var(--primary)]";
  if (grade === "C+" || grade === "C") return "text-[var(--warning)]";
  return "text-[var(--text-secondary)]";
}

function formatShotType(shotType: string): string {
  return shotType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="font-medium text-[var(--text-primary)]">{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-secondary)]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function ClipDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clipId = typeof params.id === "string" ? params.id : null;
  
  const [clip, setClip] = useState<ClipDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clipId) return;
    
    async function fetchClip() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/explore/clips/${clipId}`);
        if (!res.ok) throw new Error("Failed to fetch clip");
        
        const data = await res.json();
        setClip(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load clip");
      } finally {
        setLoading(false);
      }
    }
    
    void fetchClip();
  }, [clipId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !clip) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-[var(--danger)]">{error || "Clip not found"}</p>
            <Link href="/explore">
              <Button className="mt-4" variant="secondary">Back to Explore</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Back button */}
      <Link href="/explore" className="inline-flex items-center gap-2 text-sm text-[var(--primary)] hover:underline">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Explore
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Video player */}
          <Card>
            <CardContent className="p-0">
              <div className="relative aspect-video w-full overflow-hidden bg-black">
                <video
                  src={clip.videoUrl}
                  controls
                  className="h-full w-full object-contain"
                  preload="metadata"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </CardContent>
          </Card>

          {/* Clip info */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-[var(--text-primary)]">{clip.title}</h1>
                  <p className="mt-2 text-[var(--text-secondary)]">{clip.description}</p>
                </div>
                <div className="ml-4 flex gap-2">
                  <Button variant="secondary" className="gap-2">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    Save
                  </Button>
                  <Button variant="secondary" className="gap-2">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share
                  </Button>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]/10 text-sm font-medium text-[var(--primary)]">
                    {clip.uploadedBy.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{clip.uploadedBy}</p>
                    <p className="text-sm text-[var(--text-secondary)]">Cricket Coach • 12 years experience</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-6 border-t border-[var(--surface-secondary)] pt-6">
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>{clip.views} views</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span>{clip.likes} likes</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{clip.duration}s</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis */}
          <Card>
            <CardHeader className="flex items-center gap-2">
              <svg className="h-5 w-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>AI Biometric Analysis</span>
              <span className="ml-auto text-sm text-[var(--text-secondary)]">Powered by Gemini AI</span>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScoreBar label="Stance & Balance" value={clip.analysis.scores.stanceBalance} color="var(--success)" />
              <ScoreBar label="Bat Path & Follow Through" value={clip.analysis.scores.batPathFollowThrough} color="var(--primary)" />
              
              <div className="mt-6 rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface-secondary)]/40 p-4">
                <p className="text-sm text-[var(--text-secondary)]">
                  Excellent weight distribution and head position throughout the shot. The timing was well-judged with good transfer of momentum.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Grade card */}
          <Card>
            <CardHeader>Grade</CardHeader>
            <CardContent>
              <div className="text-center">
                <div className={`text-6xl font-bold ${getGradeColor(clip.grade)}`}>{clip.grade}</div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">Shot Type</p>
                <p className="font-medium text-[var(--text-primary)]">{formatShotType(clip.shotType)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>Stats</CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Views</span>
                <span className="font-medium text-[var(--text-primary)]">{clip.views}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Duration</span>
                <span className="font-medium text-[var(--text-primary)]">{clip.duration}s</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Grade</span>
                <span className={`font-medium ${getGradeColor(clip.grade)}`}>{clip.grade}</span>
              </div>
            </CardContent>
          </Card>

          {/* Related Clips */}
          {clip.relatedClips.length > 0 && (
            <Card>
              <CardHeader>Related Clips</CardHeader>
              <CardContent className="space-y-3">
                {clip.relatedClips.map((related) => (
                  <Link
                    key={related.id}
                    href={`/explore/${related.id}`}
                    className="flex gap-3 rounded-lg border border-[var(--surface-secondary)] p-2 transition-colors hover:bg-[var(--surface-secondary)]/40"
                  >
                    <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded bg-[var(--surface-secondary)]">
                      <div className="flex h-full w-full items-center justify-center">
                        <svg className="h-6 w-6 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        </svg>
                      </div>
                      {related.duration && (
                        <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-xs text-white">
                          {related.duration}s
                        </div>
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-2">{related.title}</p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">{related.uploadedBy}</p>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
