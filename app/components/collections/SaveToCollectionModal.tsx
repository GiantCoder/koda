"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";

interface Collection {
  id: string;
  name: string;
  clipCount: number;
}

interface SaveToCollectionModalProps {
  videoId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function SaveToCollectionModal({
  videoId,
  isOpen,
  onClose,
  onSaved,
}: SaveToCollectionModalProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCollections();
    }
  }, [isOpen]);

  const fetchCollections = async () => {
    try {
      const response = await fetch("/api/collections");
      if (!response.ok) throw new Error("Failed to fetch collections");
      const data = await response.json();
      setCollections(data.collections);
    } catch (err) {
      setError("Failed to load collections");
    }
  };

  const handleSaveToCollection = async (collectionId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/collections/${collectionId}/clips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save clip");
      }

      onSaved?.();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndSave = async () => {
    if (!newCollectionName.trim()) {
      setError("Collection name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create collection
      const createResponse = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCollectionName,
          description: newCollectionDescription || undefined,
        }),
      });

      if (!createResponse.ok) {
        throw new Error("Failed to create collection");
      }

      const { collection } = await createResponse.json();

      // Add clip to new collection
      await handleSaveToCollection(collection.id);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-[var(--surface-primary)] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            Save to Collection
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-[var(--error)]/10 p-3 text-sm text-[var(--error)]">
            {error}
          </div>
        )}

        {!showNewCollection ? (
          <>
            <div className="mb-4 max-h-64 space-y-2 overflow-y-auto">
              {collections.length > 0 ? (
                collections.map((collection) => (
                  <button
                    key={collection.id}
                    onClick={() => handleSaveToCollection(collection.id)}
                    disabled={loading}
                    className="w-full rounded-lg border border-[var(--surface-secondary)] p-3 text-left transition-colors hover:border-[var(--primary)] hover:bg-[var(--surface-secondary)] disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[var(--text-primary)]">
                        {collection.name}
                      </span>
                      <span className="text-sm text-[var(--text-tertiary)]">
                        {collection.clipCount} clips
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <p className="py-8 text-center text-[var(--text-secondary)]">
                  No collections yet. Create one below!
                </p>
              )}
            </div>

            <Button
              onClick={() => setShowNewCollection(true)}
              variant="secondary"
              className="w-full"
            >
              + Create New Collection
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                Collection Name
              </label>
              <Input
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="e.g., Cover Drives"
                maxLength={100}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                Description (optional)
              </label>
              <textarea
                value={newCollectionDescription}
                onChange={(e) => setNewCollectionDescription(e.target.value)}
                placeholder="Add a description..."
                maxLength={500}
                rows={3}
                className="w-full rounded-lg border border-[var(--surface-secondary)] bg-[var(--surface-primary)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setShowNewCollection(false)}
                variant="secondary"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleCreateAndSave}
                disabled={loading || !newCollectionName.trim()}
                className="flex-1"
              >
                {loading ? "Creating..." : "Create & Save"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
