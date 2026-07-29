"use client";

import React, { useEffect, useRef, useState } from "react";
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
  currentAvatarUrl?: string;
}

export function AvatarGalleryModal({
  isOpen,
  onClose,
  onSelect,
  currentAvatarUrl,
}: AvatarGalleryModalProps) {
  const [activeTab, setActiveTab] = useState<"gallery" | "custom">("gallery");
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(
    currentAvatarUrl || null
  );
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarCategories, setAvatarCategories] = useState<AvatarCategory[]>([]);
  const [isLoadingAvatars, setIsLoadingAvatars] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedAvatarUrl(currentAvatarUrl || null);
    setActiveTab("gallery");
    setUploadedFile(null);
    setUploadPreview(null);
    setLoadError(null);

    let cancelled = false;
    setIsLoadingAvatars(true);
    fetch("/api/avatars")
      .then((response) => response.json())
      .then((payload: { categories?: AvatarCategory[]; error?: string }) => {
        if (cancelled) return;
        setAvatarCategories(payload.categories ?? []);
        if (payload.error && !(payload.categories?.length)) {
          setLoadError(payload.error);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setAvatarCategories([]);
        setLoadError("Failed to load avatars");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAvatars(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, currentAvatarUrl]);

  if (!isOpen) return null;

  const handleAvatarSelect = (url: string) => {
    setSelectedAvatarUrl(url);
    setUploadedFile(null);
    setUploadPreview(null);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      alert("Invalid file type. Only JPG, PNG, WebP, and GIF are allowed.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("File size exceeds 5MB limit");
      return;
    }

    setUploadedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleApplySelection = async () => {
    if (activeTab === "gallery" && selectedAvatarUrl) {
      onSelect(selectedAvatarUrl);
      onClose();
    } else if (activeTab === "custom" && uploadedFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", uploadedFile);

        const response = await fetch("/api/upload/avatar", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to upload avatar");
        }

        const data = (await response.json()) as { url: string };
        onSelect(data.url);
        onClose();
      } catch (error) {
        console.error("Upload error:", error);
        alert(error instanceof Error ? error.message : "Failed to upload avatar");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleRemoveUpload = () => {
    setUploadedFile(null);
    setUploadPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-[var(--surface)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-secondary)] px-5 py-4">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Select or Upload Avatar
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            type="button"
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="border-b border-[var(--border)] bg-[var(--surface-secondary)]">
          <div className="flex px-5">
            <button
              type="button"
              onClick={() => setActiveTab("gallery")}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "gallery"
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Gallery
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("custom")}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "custom"
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "gallery" && (
            <div className="space-y-6">
              {isLoadingAvatars ? (
                <div className="flex min-h-[180px] items-center justify-center gap-3 text-sm text-[var(--text-secondary)]">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--surface-secondary)] border-t-[var(--primary)]" />
                  Loading avatars...
                </div>
              ) : loadError ? (
                <p className="text-sm text-[var(--danger)]">{loadError}</p>
              ) : avatarCategories.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">
                  No avatars found. Add images under public/avatars.
                </p>
              ) : (
                avatarCategories.map((category) => (
                  <div key={category.key}>
                    <h4 className="mb-3 border-b border-[var(--border)] pb-2 text-sm font-semibold uppercase text-[var(--text-secondary)]">
                      {category.label}
                    </h4>
                    <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
                      {category.avatars.map((avatar) => {
                        const isSelected = selectedAvatarUrl === avatar.url;
                        return (
                          <button
                            key={avatar.id}
                            type="button"
                            onClick={() => handleAvatarSelect(avatar.url)}
                            className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                              isSelected
                                ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/30"
                                : "border-[var(--border)] hover:border-[var(--primary)]"
                            }`}
                          >
                            <img
                              src={avatar.url}
                              alt={avatar.name}
                              className="h-full w-full object-cover"
                            />
                            {isSelected && (
                              <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-white">
                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "custom" && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileSelect}
                className="hidden"
              />
              {!uploadPreview ? (
                <div
                  onClick={handleUploadClick}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--surface-secondary)] p-12 transition-colors hover:border-[var(--primary)] hover:bg-[var(--surface)]"
                >
                  <svg
                    className="mb-4 h-16 w-16 text-[var(--text-secondary)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    JPG, PNG, WebP or GIF (max 5MB)
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <img
                        src={uploadPreview}
                        alt="Upload preview"
                        className="h-48 w-48 rounded-full object-cover ring-4 ring-[var(--border)]"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveUpload}
                        className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--danger)] text-white shadow-lg transition-transform hover:scale-110"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {uploadedFile?.name}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {uploadedFile && `${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB`}
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <Button variant="secondary" onClick={handleUploadClick}>
                      Choose Different Image
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border)] bg-[var(--surface-secondary)] px-5 py-4">
          <Button variant="secondary" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleApplySelection}
            disabled={
              isUploading ||
              (activeTab === "gallery" && !selectedAvatarUrl) ||
              (activeTab === "custom" && !uploadedFile)
            }
          >
            {isUploading ? "Uploading..." : "Apply"}
          </Button>
        </div>
      </div>
    </div>
  );
}
