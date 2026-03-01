"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/app/components/ui/Button";

interface AvatarItem {
  id: string;
  name: string;
  url: string;
}

interface AvatarCategory {
  key: string;
  label: string;
  avatars: AvatarItem[];
}

interface AvatarGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (avatarUrl: string) => void;
  selectedAvatarUrl: string | null;
}

export default function AvatarGalleryModal({
  isOpen,
  onClose,
  onSelect,
  selectedAvatarUrl,
}: AvatarGalleryModalProps) {
  const [avatarCategories, setAvatarCategories] = useState<AvatarCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadedAvatarIds, setLoadedAvatarIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setLoadedAvatarIds({});
    fetch("/api/avatars")
      .then((response) => response.json())
      .then((payload: { categories?: AvatarCategory[] }) => {
        if (!isMounted) return;
        const categories = payload.categories ?? [];
        setAvatarCategories(categories);
        if (categories.length > 0) {
          setActiveCategory(categories[0].key);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setAvatarCategories([]);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const activeCategoryData = useMemo(
    () => avatarCategories.find((category) => category.key === activeCategory) ?? avatarCategories[0],
    [activeCategory, avatarCategories]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-xl bg-[var(--surface)]">
        <div className="flex items-center justify-between border-b border-[var(--surface-secondary)] px-4 py-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Choose an Avatar</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
          >
            Close
          </button>
        </div>
        <div className="border-b border-[var(--surface-secondary)] px-4 py-2">
          <div className="flex flex-wrap gap-2">
            {avatarCategories.map((category) => (
              <button
                key={category.key}
                type="button"
                onClick={() => setActiveCategory(category.key)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  category.key === activeCategory
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex min-h-[180px] items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--surface-secondary)] border-t-[var(--primary)]" />
                Loading avatars...
              </div>
            </div>
          ) : activeCategoryData?.avatars?.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {activeCategoryData.avatars.map((avatar) => {
                const isSelected = avatar.url === selectedAvatarUrl;
                const isAvatarLoaded = Boolean(loadedAvatarIds[avatar.id]);
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => onSelect(avatar.url)}
                    className={`rounded-lg border p-3 transition-colors ${
                      isSelected
                        ? "border-[var(--primary)] bg-[var(--surface-secondary)]"
                        : "border-[var(--surface-secondary)] hover:border-[var(--text-secondary)]"
                    }`}
                  >
                    <div className="relative mx-auto h-20 w-20">
                      {!isAvatarLoaded && (
                        <span className="absolute inset-0 z-10 m-auto h-6 w-6 animate-spin rounded-full border-2 border-[var(--surface-secondary)] border-t-[var(--primary)]" />
                      )}
                      <Image
                        src={avatar.url}
                        alt={avatar.name}
                        width={96}
                        height={96}
                        onLoad={() =>
                          setLoadedAvatarIds((current) => ({
                            ...current,
                            [avatar.id]: true,
                          }))
                        }
                        onError={() =>
                          setLoadedAvatarIds((current) => ({
                            ...current,
                            [avatar.id]: true,
                          }))
                        }
                        className={`mx-auto h-20 w-20 rounded-full object-cover transition-opacity ${
                          isAvatarLoaded ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">No avatars found in this category yet.</p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--surface-secondary)] px-4 py-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onClose} disabled={!selectedAvatarUrl}>
            Use Avatar
          </Button>
        </div>
      </div>
    </div>
  );
}
