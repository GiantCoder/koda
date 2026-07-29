"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { buildMockAuthHeaders } from "@/app/lib/mock-auth-headers";
import type { MockUser } from "@/app/lib/mock-auth";

interface VideoTagsEditorProps {
  user: MockUser | null;
  videoId: string;
  tags: string[];
  onSaved: (tags: string[]) => void;
  onError?: (message: string) => void;
}

export function VideoTagsEditor({
  user,
  videoId,
  tags,
  onSaved,
  onError,
}: VideoTagsEditorProps) {
  const [draft, setDraft] = useState<string[]>(tags);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(tags);
  }, [tags]);

  const isDirty =
    draft.length !== tags.length || draft.some((t, i) => t !== tags[i]);

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/^#/, "");
    if (!tag) return;
    if (draft.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setInput("");
      return;
    }
    if (draft.length >= 20) return;
    setDraft((prev) => [...prev, tag]);
    setInput("");
  };

  const removeTag = (tag: string) => {
    setDraft((prev) => prev.filter((t) => t !== tag));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim()) addTag(input);
  };

  const handleSave = async () => {
    if (!user || !isDirty) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/videos/${videoId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...buildMockAuthHeaders(user),
        },
        body: JSON.stringify({ tags: draft }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Failed to save tags");
      }
      const data = (await res.json()) as { tags: string[] };
      onSaved(data.tags ?? draft);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Failed to save tags");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--surface-secondary)] bg-[var(--surface)] p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Video tags</h3>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void handleSave()}
          disabled={!isDirty || saving}
          className="text-xs"
        >
          {saving ? "Saving…" : "Save tags"}
        </Button>
      </div>

      <div className="mb-2 flex flex-wrap gap-2">
        {draft.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)]">No tags yet — add some below.</p>
        ) : (
          draft.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-secondary)] px-2.5 py-1 text-xs text-[var(--text-primary)]"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-[var(--text-secondary)] hover:text-[var(--danger)]"
                aria-label={`Remove tag ${tag}`}
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(input);
            }
          }}
          placeholder="Add a tag and press Enter"
          maxLength={40}
          className="min-w-0 flex-1 rounded-md border border-[var(--surface-secondary)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
        />
        <Button type="button" variant="secondary" onClick={() => addTag(input)}>
          Add
        </Button>
      </form>
    </div>
  );
}
