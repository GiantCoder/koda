"use client";

import Link from "next/link";
import { useMockAuth } from "@/app/hooks/useMockAuth";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { StatCard } from "@/app/components/dashboard/StatCard";
import { SessionCard } from "@/app/components/dashboard/SessionCard";
import { ActivityItem } from "@/app/components/dashboard/ActivityItem";
import { QuickActionButton } from "@/app/components/dashboard/QuickActionButton";

function CalendarIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function GroupIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { user, role } = useMockAuth();
  const firstName = user?.firstName ?? "Coach";

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {getGreeting()}, {firstName}!
        </h1>
        <p className="mt-1 text-[var(--text-secondary)]">
          Here&apos;s what&apos;s happening with your squads today
        </p>
      </div>

      {/* Role-aware stub: coach sees full dashboard; player/parent see simplified */}
      {role === "coach" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <CardHeader className="mb-0 flex items-center gap-2">
                  <CalendarIcon />
                  Upcoming Sessions
                </CardHeader>
                <Link
                  href="#"
                  className="text-sm font-medium text-[var(--primary)] hover:underline"
                >
                  View All
                </Link>
              </div>
              <CardContent className="space-y-0">
                <SessionCard
                  day={15}
                  title="Under-14 Batting Practice"
                  time="Today, 4:00 PM - 6:00 PM"
                  attendees="16 players registered"
                  isToday
                />
                <SessionCard
                  day={16}
                  title="Under-16 Match Preparation"
                  time="Tomorrow, 10:00 AM - 12:00 PM"
                  attendees="12 players registered"
                  isToday={false}
                />
              </CardContent>
            </Card>

            <Card>
              <div className="mb-4 flex items-center justify-between">
                <CardHeader className="mb-0 flex items-center gap-2">
                  <GroupIcon />
                  Squad List
                </CardHeader>
              </div>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between rounded-lg border border-[var(--surface-secondary)] p-3">
                    <span className="font-medium text-[var(--text-primary)]">
                      Under-14 Squad
                    </span>
                    <span className="text-sm text-[var(--text-secondary)]">
                      16 players
                    </span>
                  </div>
                  <div className="flex justify-between rounded-lg border border-[var(--surface-secondary)] p-3">
                    <span className="font-medium text-[var(--text-primary)]">
                      Under-16 Squad
                    </span>
                    <span className="text-sm text-[var(--text-secondary)]">
                      12 players
                    </span>
                  </div>
                  <div className="flex justify-between rounded-lg border border-[var(--surface-secondary)] p-3">
                    <span className="font-medium text-[var(--text-primary)]">
                      Senior Squad
                    </span>
                    <span className="text-sm text-[var(--text-secondary)]">
                      18 players
                    </span>
                  </div>
                </div>
                <Button variant="ghost" className="mt-4 w-full text-[var(--primary)]">
                  View All Squads
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>Quick Actions</CardHeader>
              <CardContent className="space-y-2">
                <QuickActionButton
                  label="+ Add New Drill"
                  icon={<PlusIcon />}
                  variant="primary"
                />
                <QuickActionButton
                  label="Manage Squad"
                  icon={<GroupIcon />}
                />
                <QuickActionButton
                  label="View Analytics"
                  icon={<ChartIcon />}
                />
                <QuickActionButton
                  label="Send Message"
                  icon={<MessageIcon />}
                />
              </CardContent>
            </Card>

            <Card>
              <div className="mb-4 flex items-center justify-between">
                <CardHeader className="mb-0 flex items-center gap-2 text-[var(--success)]">
                  <ClockIcon />
                  Recent Activity
                </CardHeader>
                <Link
                  href="#"
                  className="text-sm font-medium text-[var(--primary)] hover:underline"
                >
                  View All
                </Link>
              </div>
              <CardContent>
                <ActivityItem
                  text="Tom Wilson completed batting drill"
                  time="2 hours ago"
                  dotColor="red"
                />
                <ActivityItem
                  text="New message from parent"
                  time="4 hours ago"
                  dotColor="blue"
                />
                <ActivityItem
                  text="Session attendance recorded"
                  time="Yesterday"
                  dotColor="green"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex items-center gap-2 text-[var(--cricket-green)]">
                <TrophyIcon />
                This Week
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Sessions Completed" value="8" />
                  <StatCard label="Total Attendance" value="92%" />
                  <StatCard label="Drills Created" value="12" />
                  <StatCard label="Messages Sent" value="24" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>Welcome, {firstName}!</CardHeader>
          <CardContent>
            <p className="text-[var(--text-secondary)]">
              Your {role} dashboard is coming soon. For now, you can access your
              profile and settings.
            </p>
            <div className="mt-4 flex gap-2">
              <Link href="/profile">
                <Button>View Profile</Button>
              </Link>
              <Link href="/settings">
                <Button variant="secondary">Settings</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
