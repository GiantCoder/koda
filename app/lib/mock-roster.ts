/**
 * Mock roster data for coach view.
 * Replace with API calls when backend is ready.
 */

export type PlayerStatus = "in_progress" | "review_needed" | "excellent";
export type ActivityLevel = "active" | "moderate" | "inactive";

export interface MockPlayer {
  id: string;
  name: string;
  position: string;
  avatarInitials: string;
  latestGrade: string;
  lastSession: string;
  activity: ActivityLevel;
  status: PlayerStatus;
  squad?: string;
}

export const MOCK_PLAYERS: MockPlayer[] = [
  {
    id: "1",
    name: "James Anderson",
    position: "Fast Bowler",
    avatarInitials: "JA",
    latestGrade: "A-",
    lastSession: "2 hours ago",
    activity: "active",
    status: "in_progress",
    squad: "Senior",
  },
  {
    id: "2",
    name: "Sarah Taylor",
    position: "Wicket Keeper",
    avatarInitials: "ST",
    latestGrade: "B+",
    lastSession: "1 day ago",
    activity: "moderate",
    status: "review_needed",
    squad: "Under-16",
  },
  {
    id: "3",
    name: "Ben Stokes",
    position: "All Rounder",
    avatarInitials: "BS",
    latestGrade: "A",
    lastSession: "3 hours ago",
    activity: "active",
    status: "excellent",
    squad: "Senior",
  },
  {
    id: "4",
    name: "Joe Root",
    position: "Batsman",
    avatarInitials: "JR",
    latestGrade: "A+",
    lastSession: "5 hours ago",
    activity: "active",
    status: "excellent",
    squad: "Senior",
  },
  {
    id: "5",
    name: "Emma Wilson",
    position: "Spin Bowler",
    avatarInitials: "EW",
    latestGrade: "B",
    lastSession: "2 days ago",
    activity: "moderate",
    status: "review_needed",
    squad: "Under-14",
  },
];

export const MOCK_ROSTER_STATS = {
  totalPlayers: 24,
  activeSessions: 8,
  avgGrade: "B+",
  pendingReviews: 3,
};
