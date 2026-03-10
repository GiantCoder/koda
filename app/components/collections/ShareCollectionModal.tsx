"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { buildMockAuthHeaders } from "@/app/lib/mock-auth-headers";
import { useMockAuth } from "@/app/hooks/useMockAuth";

interface TeamPlayer {
  id: string;
  displayName: string;
  email: string;
}

interface CollectionShare {
  userId: string;
}

interface ShareCollectionModalProps {
  isOpen: boolean;
  collectionId: string | null;
  collectionName: string | null;
  onClose: () => void;
}

export function ShareCollectionModal({
  isOpen,
  collectionId,
  collectionName,
  onClose,
}: ShareCollectionModalProps) {
  const { user } = useMockAuth();
  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [sharedUserIds, setSharedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sharedSet = useMemo(() => new Set(sharedUserIds), [sharedUserIds]);

  useEffect(() => {
    if (!isOpen || !collectionId || !user) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [playersResponse, sharesResponse] = await Promise.all([
          fetch("/api/team/players", { headers: buildMockAuthHeaders(user) }),
          fetch(`/api/collections/${collectionId}/shares`, {
            headers: buildMockAuthHeaders(user),
          }),
        ]);

        if (!playersResponse.ok) {
          throw new Error("Failed to load players.");
        }
        if (!sharesResponse.ok) {
          throw new Error("Failed to load existing shares.");
        }

        const playersPayload = (await playersResponse.json()) as { players?: TeamPlayer[] };
        const sharesPayload = (await sharesResponse.json()) as { shares?: CollectionShare[] };
        if (cancelled) return;

        setPlayers(Array.isArray(playersPayload.players) ? playersPayload.players : []);
        setSharedUserIds(
          Array.isArray(sharesPayload.shares)
            ? sharesPayload.shares.map((share) => share.userId)
            : []
        );
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load sharing settings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [collectionId, isOpen, user]);

  async function toggleShare(targetUserId: string, enable: boolean): Promise<void> {
    if (!collectionId || !user) return;

    setError(null);
    const optimistic = enable
      ? Array.from(new Set([...sharedUserIds, targetUserId]))
      : sharedUserIds.filter((id) => id !== targetUserId);
    setSharedUserIds(optimistic);

    const response = await fetch(
      enable
        ? `/api/collections/${collectionId}/shares`
        : `/api/collections/${collectionId}/shares/${targetUserId}`,
      {
        method: enable ? "POST" : "DELETE",
        headers: {
          ...buildMockAuthHeaders(user),
          ...(enable ? { "Content-Type": "application/json" } : {}),
        },
        ...(enable ? { body: JSON.stringify({ userId: targetUserId }) } : {}),
      }
    );

    if (!response.ok) {
      setSharedUserIds(sharedUserIds);
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Failed to update sharing.");
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-[var(--surface-primary)] p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Share Collection</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Manage which players can access <span className="font-medium">{collectionName ?? "this collection"}</span>.
            </p>
          </div>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg bg-[var(--error)]/10 p-3 text-sm text-[var(--error)]">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--text-secondary)]">Loading players...</p>
        ) : players.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No players available to share with.
          </p>
        ) : (
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {players.map((player) => {
              const isShared = sharedSet.has(player.id);
              return (
                <label
                  key={player.id}
                  className="flex cursor-pointer items-center justify-between rounded-md border border-[var(--surface-secondary)] px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{player.displayName}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{player.email}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isShared}
                    onChange={(event) => {
                      void toggleShare(player.id, event.target.checked);
                    }}
                  />
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
