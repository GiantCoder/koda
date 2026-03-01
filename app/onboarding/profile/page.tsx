"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Select } from "@/app/components/ui/Select";
import { setOnboardingComplete } from "@/app/lib/auth";

const POSITIONS = [
  { value: "batsman", label: "Batsman" },
  { value: "bowler", label: "Bowler" },
  { value: "all-rounder", label: "All-rounder" },
  { value: "wicket-keeper", label: "Wicket-keeper" },
];

const BATTING_STYLES = [
  { value: "right", label: "Right-handed" },
  { value: "left", label: "Left-handed" },
];

const BOWLING_STYLES = [
  { value: "fast", label: "Fast" },
  { value: "medium", label: "Medium" },
  { value: "spin", label: "Spin" },
  { value: "na", label: "N/A" },
];

const PRIVACY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "coaches-parents", label: "Coaches & Parents Only" },
  { value: "private", label: "Private" },
];

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

export default function ProfilePage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [position, setPosition] = useState("");
  const [battingStyle, setBattingStyle] = useState("");
  const [bowlingStyle, setBowlingStyle] = useState("");
  const [clubSchool, setClubSchool] = useState("");
  const [privacy, setPrivacy] = useState("coaches-parents");
  const [avatarCategories, setAvatarCategories] = useState<AvatarCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(null);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
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
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const activeCategoryData = useMemo(
    () => avatarCategories.find((category) => category.key === activeCategory) ?? avatarCategories[0],
    [activeCategory, avatarCategories]
  );

  const handleFinish = () => {
    setOnboardingComplete(true);
    router.push("/dashboard");
  };

  return (
    <Card>
      <CardHeader>Complete Your Profile</CardHeader>
      <CardContent>
        <p className="mb-6 text-sm text-[var(--text-secondary)]">
          Add a few details to personalise your experience.
        </p>
        <div className="mb-6 flex flex-col gap-4">
          <div className="rounded-lg border-2 border-dashed border-[var(--surface-secondary)] p-8 text-center">
            <div className="relative mx-auto mb-3 h-24 w-24">
              {selectedAvatarUrl ? (
                <Image
                  src={selectedAvatarUrl}
                  alt="Selected avatar"
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-xs text-[var(--text-secondary)]">
                  No avatar
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-md transition-opacity hover:opacity-90"
                aria-label="Choose avatar"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7h4l2-2h4l2 2h4v12H4z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Click the camera icon to choose an avatar from the gallery.
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Avatar categories update automatically from <code>/public/avatars</code>.
            </p>
          </div>
          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How others see you"
          />
          <div className="rounded-lg bg-[var(--surface-secondary)] p-4">
            <p className="mb-3 text-sm font-medium text-[var(--text-primary)]">
              Player Details
            </p>
            <div className="flex flex-col gap-3">
              <Select
                label="Primary Position"
                options={POSITIONS}
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
              <Select
                label="Batting Style"
                options={BATTING_STYLES}
                value={battingStyle}
                onChange={(e) => setBattingStyle(e.target.value)}
              />
              <Select
                label="Bowling Style"
                options={BOWLING_STYLES}
                value={bowlingStyle}
                onChange={(e) => setBowlingStyle(e.target.value)}
              />
              <Input
                label="Club / School"
                value={clubSchool}
                onChange={(e) => setClubSchool(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <Select
            label="Privacy"
            options={PRIVACY_OPTIONS}
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => router.push("/onboarding/privacy")}>
            Back
          </Button>
          <Button onClick={handleFinish}>
            Finish Setup
          </Button>
        </div>
      </CardContent>
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-xl bg-[var(--surface)]">
            <div className="flex items-center justify-between border-b border-[var(--surface-secondary)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Choose an Avatar</h3>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
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
              {activeCategoryData?.avatars?.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {activeCategoryData.avatars.map((avatar) => {
                    const isSelected = avatar.url === selectedAvatarUrl;
                    return (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => setSelectedAvatarUrl(avatar.url)}
                        className={`rounded-lg border p-3 transition-colors ${
                          isSelected
                            ? "border-[var(--primary)] bg-[var(--surface-secondary)]"
                            : "border-[var(--surface-secondary)] hover:border-[var(--text-secondary)]"
                        }`}
                      >
                        <Image
                          src={avatar.url}
                          alt={avatar.name}
                          width={96}
                          height={96}
                          className="mx-auto h-20 w-20 rounded-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">
                  No avatars found in this category yet.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--surface-secondary)] px-4 py-3">
              <Button variant="secondary" onClick={() => setIsAvatarModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsAvatarModalOpen(false)} disabled={!selectedAvatarUrl}>
                Use Avatar
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
