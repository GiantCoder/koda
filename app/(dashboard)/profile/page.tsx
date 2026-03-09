"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { z } from "zod";
import PlayerCardDisplay from "@/app/components/player-card/PlayerCardDisplay";
import { useMockAuth } from "@/app/hooks/useMockAuth";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import AvatarGalleryModal from "@/app/components/profile/AvatarGalleryModal";
import { clearAuthToken, setProfileAvatarUrl } from "@/app/lib/auth";
import { buildMockAuthHeaders } from "@/app/lib/mock-auth-headers";
import { useProfileAvatar } from "@/app/hooks/useProfileAvatar";
import type { PlayerCardDto } from "@/types/player-card";

const playerCardSchema = z.object({
  id: z.string().uuid().nullable(),
  userId: z.string().uuid(),
  displayName: z.string(),
  tier: z.enum(["BRONZE", "SILVER", "GOLD", "ELITE"]),
  role: z.enum(["BAT", "BWL", "ALL", "WKT"]),
  sportIcon: z.enum(["BAT_ICON", "BALL_ICON", "GLOVES_ICON"]),
  statTec: z.number().int(),
  statPow: z.number().int(),
  statTim: z.number().int(),
  statCon: z.number().int(),
  statPac: z.number().int(),
  statFie: z.number().int(),
  profilePhotoUrl: z.string().nullable(),
  backgroundUrl: z.string().nullable(),
  backgroundMode: z.enum(["DEFAULT", "UPLOAD", "AI"]),
  overall: z.number().int(),
});

function CalendarIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    </svg>
  );
}

export default function ProfilePage() {
  const { user } = useMockAuth();
  const selectedAvatarUrl = useProfileAvatar();
  const [isAvatarGalleryOpen, setIsAvatarGalleryOpen] = useState(false);
  const [playerCard, setPlayerCard] = useState<PlayerCardDto | null>(null);
  const [cardLoading, setCardLoading] = useState(true);

  const displayName = user
    ? `${user.firstName} ${user.lastName}`
    : "User";
  const role = user?.role ?? "coach";
  const joinedAt = user?.joinedAt ?? "—";

  useEffect(() => {
    let isMounted = true;
    const fetchPlayerCard = async () => {
      if (!user) return;
      try {
        const response = await fetch("/api/player-card", {
          headers: buildMockAuthHeaders(user),
        });
        if (!response.ok) return;
        const raw = (await response.json()) as unknown;
        const parsed = playerCardSchema.parse(raw);
        if (isMounted) {
          setPlayerCard(parsed);
        }
      } catch {
        // Non-blocking section in profile page.
      } finally {
        if (isMounted) setCardLoading(false);
      }
    };

    void fetchPlayerCard();
    return () => {
      isMounted = false;
    };
  }, [user]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Profile
        </h1>
        <p className="mt-1 text-[var(--text-secondary)]">
          View and manage your profile
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <div className="flex flex-col items-center py-4">
              <div className="relative">
                {selectedAvatarUrl ? (
                  <Image
                    src={selectedAvatarUrl}
                    alt="Selected avatar"
                    width={96}
                    height={96}
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-2xl font-semibold text-[var(--primary)]">
                    {user?.firstName?.[0] ?? "U"}
                    {user?.lastName?.[0] ?? ""}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setIsAvatarGalleryOpen(true)}
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
                  aria-label="Change profile photo"
                >
                  <CameraIcon />
                </button>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
                {displayName}
              </h2>
              <p className="text-sm capitalize text-[var(--text-secondary)]">
                {role}
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <CalendarIcon />
                Joined {joinedAt}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>Quick Actions</CardHeader>
            <CardContent className="space-y-2">
              <Button variant="ghost" className="w-full justify-start gap-2">
                <DownloadIcon />
                Export My Data
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-[var(--danger)] hover:bg-red-50 hover:text-[var(--danger)]"
              >
                <TrashIcon />
                Delete Account
              </Button>
              <Link href="/login" className="block">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    clearAuthToken();
                  }}
                >
                  <LogoutIcon />
                  Sign Out
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>Player Card</CardHeader>
            <CardContent className="flex justify-center">
              {cardLoading ? (
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
              ) : playerCard ? (
                <PlayerCardDisplay
                  card={playerCard}
                  aiBgCss={null}
                  compact
                  interactive={false}
                  showBlankSlate={playerCard.id === null && playerCard.overall === 50}
                />
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">
                  Your player card will appear here after your first completed analysis.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <CardHeader className="mb-0">Personal Details</CardHeader>
              <button
                type="button"
                className="text-sm font-medium text-[var(--primary)] hover:underline"
              >
                Edit
              </button>
            </div>
            <CardContent>
              <p className="text-[var(--text-secondary)]">
                For full profile editing and settings, visit the Settings page.
              </p>
              <Link href="/settings">
                <Button variant="secondary" className="mt-4">
                  Go to Settings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
      <AvatarGalleryModal
        isOpen={isAvatarGalleryOpen}
        onClose={() => setIsAvatarGalleryOpen(false)}
        selectedAvatarUrl={selectedAvatarUrl}
        onSelect={(avatarUrl) => {
          setProfileAvatarUrl(avatarUrl);
        }}
      />
    </div>
  );
}
