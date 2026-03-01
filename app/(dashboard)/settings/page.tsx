"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { useMockAuth } from "@/app/hooks/useMockAuth";
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
