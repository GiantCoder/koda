"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useMockAuth } from "@/app/hooks/useMockAuth";
import { buildMockAuthHeaders } from "@/app/lib/mock-auth-headers";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { PreferencesSection } from "@/app/components/dashboard/PreferencesSection";
import AvatarGalleryModal from "@/app/components/profile/AvatarGalleryModal";
import { clearAuthToken, setProfileAvatarUrl } from "@/app/lib/auth";
import { useProfileAvatar } from "@/app/hooks/useProfileAvatar";

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

function HelpIcon({ className = "text-blue-500" }: { className?: string }) {
  return (
    <svg className={`h-5 w-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ChatIcon({ className = "text-[var(--success)]" }: { className?: string }) {
  return (
    <svg className={`h-5 w-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function BookIcon({ className = "text-purple-500" }: { className?: string }) {
  return (
    <svg className={`h-5 w-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function BugIcon({ className = "text-[var(--warning)]" }: { className?: string }) {
  return (
    <svg className={`h-5 w-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function EyeIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-5 w-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function EyeOffIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-5 w-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

const ECB_API_DOCS_URL =
  process.env.NEXT_PUBLIC_ECB_API_DOCS_URL ??
  "https://play-cricket.ecb.co.uk/hc/en-us/sections/360000978518-API-Experienced-Developers-Only";

type EcbKeyState = {
  hasKey: boolean;
  maskedKey: string | null;
  verifiedAt: string | null;
};

export default function SettingsPage() {
  const { user, role, setRole } = useMockAuth();
  const selectedAvatarUrl = useProfileAvatar();
  const [isAvatarGalleryOpen, setIsAvatarGalleryOpen] = useState(false);
  const [dataConsent, setDataConsent] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState(true);
  const [newMessages, setNewMessages] = useState(true);
  const [trainingReminders, setTrainingReminders] = useState(true);
  const [progressUpdates, setProgressUpdates] = useState(false);

  const [ecbKey, setEcbKey] = useState<EcbKeyState>({ hasKey: false, maskedKey: null, verifiedAt: null });
  const [ecbKeyInput, setEcbKeyInput] = useState("");
  const [ecbKeyVisible, setEcbKeyVisible] = useState(false);
  const [ecbShowInput, setEcbShowInput] = useState(false);
  const [ecbSaving, setEcbSaving] = useState(false);
  const [ecbValidating, setEcbValidating] = useState(false);
  const [ecbError, setEcbError] = useState<string | null>(null);
  const [ecbSuccess, setEcbSuccess] = useState<string | null>(null);

  const clearEcbFeedback = useCallback(() => {
    setEcbError(null);
    setEcbSuccess(null);
  }, []);

  useEffect(() => {
    if (ecbKeyInput) clearEcbFeedback();
  }, [ecbKeyInput, clearEcbFeedback]);

  useEffect(() => {
    if (role !== "coach" || !user) return;
    const headers = buildMockAuthHeaders(user);
    fetch("/api/coach/ecb-api-key", { headers })
      .then((res) => (res.ok ? res.json() : { hasKey: false, maskedKey: null, verifiedAt: null }))
      .then((data: EcbKeyState) => setEcbKey(data))
      .catch(() => setEcbKey({ hasKey: false, maskedKey: null, verifiedAt: null }));
  }, [role, user?.id]);

  const dismissEcbFeedbackAfter = useCallback((ms: number) => {
    setTimeout(() => {
      setEcbError(null);
      setEcbSuccess(null);
    }, ms);
  }, []);

  const handleSaveEcbKey = async () => {
    if (!user || ecbSaving || !ecbKeyInput.trim()) return;
    setEcbSaving(true);
    setEcbError(null);
    setEcbSuccess(null);
    try {
      const res = await fetch("/api/coach/ecb-api-key", {
        method: "POST",
        headers: { ...buildMockAuthHeaders(user), "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: ecbKeyInput.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEcbError((data as { error?: string }).error ?? "Failed to save key");
        return;
      }
      setEcbKey({ hasKey: true, maskedKey: (data as { maskedKey?: string }).maskedKey ?? null, verifiedAt: null });
      setEcbKeyInput("");
      setEcbShowInput(false);
      setEcbSuccess("Key saved. Verifying…");
      const validateRes = await fetch("/api/coach/ecb-api-key/validate", {
        method: "POST",
        headers: buildMockAuthHeaders(user),
      });
      const validateData = await validateRes.json().catch(() => ({}));
      if (validateData.valid && validateData.verifiedAt) {
        setEcbKey((prev) => ({ ...prev, verifiedAt: validateData.verifiedAt }));
        setEcbSuccess("Key saved and verified successfully.");
      } else {
        setEcbSuccess("Key saved. You can verify it later.");
      }
      dismissEcbFeedbackAfter(5000);
    } catch {
      setEcbError("Failed to save key");
    } finally {
      setEcbSaving(false);
    }
  };

  const handleValidateEcbKey = async () => {
    if (!user || ecbValidating) return;
    setEcbValidating(true);
    setEcbError(null);
    setEcbSuccess(null);
    try {
      const res = await fetch("/api/coach/ecb-api-key/validate", {
        method: "POST",
        headers: buildMockAuthHeaders(user),
      });
      const data = await res.json().catch(() => ({}));
      if (data.valid && data.verifiedAt) {
        setEcbKey((prev) => ({ ...prev, verifiedAt: data.verifiedAt }));
        setEcbSuccess("Key verified successfully.");
      } else {
        const reason = (data as { reason?: string }).reason;
        if (reason === "invalid_key") {
          setEcbError("Your key was rejected by Play-Cricket. Please check you've copied it correctly.");
        } else {
          setEcbError("Could not reach the Play-Cricket API. Please try again in a few minutes.");
        }
      }
      dismissEcbFeedbackAfter(5000);
    } catch {
      setEcbError("Could not reach the Play-Cricket API. Please try again in a few minutes.");
      dismissEcbFeedbackAfter(5000);
    } finally {
      setEcbValidating(false);
    }
  };

  const handleRemoveEcbKey = async () => {
    if (!user || !window.confirm("Remove your saved ECB API key? You can add it again later.")) return;
    setEcbError(null);
    setEcbSuccess(null);
    try {
      const res = await fetch("/api/coach/ecb-api-key", {
        method: "DELETE",
        headers: buildMockAuthHeaders(user),
      });
      if (res.ok) {
        setEcbKey({ hasKey: false, maskedKey: null, verifiedAt: null });
        setEcbSuccess("API key removed.");
        dismissEcbFeedbackAfter(5000);
      } else {
        setEcbError("Failed to remove key");
      }
    } catch {
      setEcbError("Failed to remove key");
    }
  };

  const formatVerifiedAt = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) + " at " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return iso;
    }
  };

  const displayName = user
    ? `${user.firstName} ${user.lastName}`
    : "User";
  const joinedAt = user?.joinedAt ?? "—";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Profile & Settings
        </h1>
        <p className="mt-1 text-[var(--text-secondary)]">
          Manage your account, privacy settings, and preferences
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

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <CardHeader className="mb-0">Personal Details</CardHeader>
              <button
                type="button"
                className="flex items-center gap-1 text-sm font-medium text-[var(--primary)] hover:underline"
              >
                Edit
              </button>
            </div>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="First Name"
                  value={user?.firstName ?? ""}
                  readOnly
                />
                <Input
                  label="Last Name"
                  value={user?.lastName ?? ""}
                  readOnly
                />
                <Input
                  label="Email"
                  type="email"
                  value={user?.email ?? ""}
                  readOnly
                  className="sm:col-span-2"
                />
                <Input
                  label="Phone"
                  value="+44 7700 900123"
                  readOnly
                  className="sm:col-span-2"
                />
              </div>
            </CardContent>
          </Card>

          {role === "coach" && (
            <Card>
              <CardHeader>Role & Team Management</CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-[var(--surface-secondary)] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                        <span className="text-lg">👤</span>
                      </div>
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">
                          Head Coach
                        </p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          Riverside Cricket Club - U14 Team
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                      Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-[var(--surface-secondary)] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                        <span className="text-lg">👥</span>
                      </div>
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">
                          Assistant Coach
                        </p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          Riverside Cricket Club - U16 Team
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300">
                      Active
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {role === "coach" && (
            <Card>
              <CardHeader>Integrations</CardHeader>
              <CardContent>
                <div className="rounded-lg border border-[var(--surface-secondary)] p-4">
                  <div className="flex items-center gap-2 text-lg font-medium text-[var(--text-primary)]">
                    <span aria-hidden>🏏</span>
                    Play-Cricket / ECB API
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Connect your ECB API key to import players and match data from Play-Cricket.
                  </p>
                  <a
                    href={ECB_API_DOCS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-sm font-medium text-[var(--primary)] hover:underline"
                  >
                    Learn more ↗
                  </a>

                  {ecbKey.hasKey && !ecbShowInput && (
                    <div className="mt-4 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {ecbKey.verifiedAt ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300">
                            ✓ Connected
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                            ⚠ Not verified
                          </span>
                        )}
                        <span className="font-mono text-sm text-[var(--text-secondary)]">
                          {ecbKey.maskedKey ?? "••••••••"}
                        </span>
                        <button
                          type="button"
                          onClick={handleRemoveEcbKey}
                          className="text-sm font-medium text-[var(--danger)] hover:underline"
                        >
                          Remove
                        </button>
                        <button
                          type="button"
                          onClick={() => setEcbShowInput(true)}
                          className="text-sm font-medium text-[var(--primary)] hover:underline"
                        >
                          Replace key
                        </button>
                      </div>
                      {ecbKey.verifiedAt && (
                        <p className="text-sm text-[var(--text-secondary)]">
                          Verified: {formatVerifiedAt(ecbKey.verifiedAt)}
                        </p>
                      )}
                      {!ecbKey.verifiedAt && (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={ecbValidating}
                          onClick={handleValidateEcbKey}
                        >
                          {ecbValidating ? "Validating…" : "Validate now"}
                        </Button>
                      )}
                    </div>
                  )}

                  {(!ecbKey.hasKey || ecbShowInput) && (
                    <div className="mt-4 space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            type={ecbKeyVisible ? "text" : "password"}
                            placeholder="Paste your ECB API key here..."
                            value={ecbKeyInput}
                            onChange={(e) => setEcbKeyInput(e.target.value)}
                            aria-label="ECB API key"
                          />
                        </div>
                        <Button
                          variant="secondary"
                          size="md"
                          type="button"
                          onClick={() => setEcbKeyVisible((v) => !v)}
                          aria-label={ecbKeyVisible ? "Hide key" : "Show key"}
                        >
                          {ecbKeyVisible ? <EyeOffIcon /> : <EyeIcon />}
                        </Button>
                      </div>
                      <Button
                        variant="primary"
                        disabled={ecbSaving || !ecbKeyInput.trim()}
                        onClick={handleSaveEcbKey}
                      >
                        {ecbSaving ? "Saving…" : "Save Key"}
                      </Button>
                    </div>
                  )}

                  {ecbError && (
                    <p className="mt-2 text-sm text-[var(--danger)]" role="alert">
                      {ecbError}
                    </p>
                  )}
                  {ecbSuccess && (
                    <p className="mt-2 text-sm text-green-600 dark:text-green-400" role="status">
                      {ecbSuccess}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {role === "parent" && (
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <CardHeader className="mb-0">Linked Child Accounts</CardHeader>
                <Button variant="primary" className="text-sm">
                  + Add Child
                </Button>
              </div>
              <CardContent>
                <div className="flex items-center justify-between rounded-lg border border-[var(--surface-secondary)] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-sm font-semibold text-[var(--primary)]">
                      EJ
                    </div>
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">
                        Emma Johnson
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        Age 12 • U14 Team
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    Verified
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <PreferencesSection
            title="Privacy & Consent Management"
            toggles={[
              {
                id: "data",
                label: "Data Processing Consent",
                description:
                  "Allow Koda Cricket to process your data for training analytics",
                checked: dataConsent,
                onToggle: setDataConsent,
              },
              {
                id: "marketing",
                label: "Marketing Communications",
                description:
                  "Receive updates about new features and cricket tips",
                checked: marketing,
                onToggle: setMarketing,
              },
              ...(role === "coach"
                ? [
                    {
                      id: "visibility",
                      label: "Profile Visibility",
                      description:
                        "Make your coaching profile visible to other clubs",
                      checked: profileVisibility,
                      onToggle: setProfileVisibility,
                    },
                  ]
                : []),
            ]}
          />

          <PreferencesSection
            title="Notification Preferences"
            toggles={[
              {
                id: "messages",
                label: "New Messages",
                description: "Get notified when you receive new messages",
                checked: newMessages,
                onToggle: setNewMessages,
              },
              {
                id: "reminders",
                label: "Training Reminders",
                description: "Reminders for upcoming training sessions",
                checked: trainingReminders,
                onToggle: setTrainingReminders,
              },
              ...(role === "coach"
                ? [
                    {
                      id: "progress",
                      label: "Player Progress Updates",
                      description:
                        "Weekly progress summaries for your players",
                      checked: progressUpdates,
                      onToggle: setProgressUpdates,
                    },
                  ]
                : []),
            ]}
          />

          <Card>
            <CardHeader>Help & Support</CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <a
                  href="#"
                  className="flex items-center gap-3 rounded-lg border border-[var(--surface-secondary)] p-4 transition-colors hover:bg-[var(--surface-secondary)]"
                >
                  <HelpIcon />
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">
                      FAQ & Help Center
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Find answers to common questions
                    </p>
                  </div>
                </a>
                <a
                  href="#"
                  className="flex items-center gap-3 rounded-lg border border-[var(--surface-secondary)] p-4 transition-colors hover:bg-[var(--surface-secondary)]"
                >
                  <ChatIcon />
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">
                      Contact Support
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Get help from our support team
                    </p>
                  </div>
                </a>
                <a
                  href="#"
                  className="flex items-center gap-3 rounded-lg border border-[var(--surface-secondary)] p-4 transition-colors hover:bg-[var(--surface-secondary)]"
                >
                  <BookIcon />
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">
                      User Guide
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Learn how to use Koda Cricket
                    </p>
                  </div>
                </a>
                <a
                  href="#"
                  className="flex items-center gap-3 rounded-lg border border-[var(--surface-secondary)] p-4 transition-colors hover:bg-[var(--surface-secondary)]"
                >
                  <BugIcon />
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">
                      Report a Bug
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Help us improve the app
                    </p>
                  </div>
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>Role (for testing)</CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-[var(--text-secondary)]">
                Switch role to preview coach/player/parent views
              </p>
              <div className="flex gap-2">
                {(["coach", "player", "parent"] as const).map((r) => (
                  <Button
                    key={r}
                    variant={role === r ? "primary" : "secondary"}
                    onClick={() => setRole(r)}
                  >
                    {r}
                  </Button>
                ))}
              </div>
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
