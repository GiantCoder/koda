"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { buildMockAuthHeaders } from "@/app/lib/mock-auth-headers";
import type { MockUser } from "@/app/lib/mock-auth";

export interface AssignablePlayer {
  id: string;
  displayName: string;
  email?: string;
  avatarUrl?: string | null;
}

interface PlayerAssigneeSelectProps {
  user: MockUser | null;
  assignedPlayer: AssignablePlayer | null;
  onSaved: (player: AssignablePlayer | null) => void;
  onError?: (message: string) => void;
  videoId: string;
}

export function PlayerAssigneeSelect({
  user,
  assignedPlayer,
  onSaved,
  onError,
  videoId,
}: PlayerAssigneeSelectProps) {
  const [players, setPlayers] = useState<AssignablePlayer[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AssignablePlayer | null>(assignedPlayer);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSelected(assignedPlayer);
    setQuery("");
  }, [assignedPlayer]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/team/players", {
          headers: buildMockAuthHeaders(user),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { players: AssignablePlayer[] };
        if (!cancelled) setPlayers(data.players ?? []);
      } catch {
        // non-blocking
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter(
      (p) =>
        p.displayName.toLowerCase().includes(q) ||
        (p.email?.toLowerCase().includes(q) ?? false)
    );
  }, [players, query]);

  const savedId = assignedPlayer?.id ?? null;
  const draftId = selected?.id ?? null;
  const isDirty = savedId !== draftId;

  const displayValue = open
    ? query
    : selected
      ? selected.displayName
      : "Unassigned";

  const handleClear = () => {
    setSelected(null);
    setQuery("");
    setOpen(true);
  };

  const handleUpdate = async () => {
    if (!user || !isDirty) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/videos/${videoId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...buildMockAuthHeaders(user),
        },
        body: JSON.stringify({
          assigneeUserId: selected?.id ?? null,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Failed to update assignment");
      }
      const data = (await res.json()) as { assignedPlayer: AssignablePlayer | null };
      onSaved(data.assignedPlayer);
      setOpen(false);
      setQuery("");
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Failed to update assignment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={rootRef} className="flex w-full max-w-sm items-start gap-2">
      <div className="relative min-w-0 flex-1">
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
          Assign to player
        </label>
        <div className="relative">
          <input
            type="search"
            value={displayValue}
            placeholder="Unassigned"
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              if (selected) setSelected(null);
            }}
            onFocus={() => {
              setOpen(true);
              setQuery(selected?.displayName ?? "");
            }}
            className="w-full rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface)] py-2 pl-3 pr-9 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls="player-assignee-list"
          />
          {(query || selected) && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              aria-label="Clear player search"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {open ? (
          <ul
            id="player-assignee-list"
            role="listbox"
            className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface)] py-1 shadow-lg"
          >
            <li>
              <button
                type="button"
                role="option"
                aria-selected={selected == null}
                className={`flex w-full px-3 py-2 text-left text-sm ${
                  selected == null
                    ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
                }`}
                onClick={() => {
                  setSelected(null);
                  setQuery("");
                  setOpen(false);
                }}
              >
                Unassigned
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--text-secondary)]">No players found</li>
            ) : (
              filtered.map((player) => (
                <li key={player.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected?.id === player.id}
                    className={`flex w-full px-3 py-2 text-left text-sm ${
                      selected?.id === player.id
                        ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
                    }`}
                    onClick={() => {
                      setSelected(player);
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">{player.displayName}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>

      <div className="pt-5">
        <Button
          type="button"
          onClick={() => void handleUpdate()}
          disabled={!isDirty || saving}
          className={!isDirty ? "opacity-50" : undefined}
        >
          {saving ? "Updating…" : "Update"}
        </Button>
      </div>
    </div>
  );
}
