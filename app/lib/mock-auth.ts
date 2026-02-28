/**
 * Mock auth utility for role-aware rendering stubs.
 * Returns user and role from localStorage. Replace with real auth in production.
 */

export type UserRole = "coach" | "player" | "parent" | "admin";

export interface MockUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  joinedAt: string;
  avatarUrl?: string;
}

const MOCK_USER_KEY = "koda_mock_user";

const DEFAULT_COACH: MockUser = {
  id: "mock-1",
  email: "sarah.johnson@email.com",
  firstName: "Sarah",
  lastName: "Johnson",
  role: "coach",
  joinedAt: "March 2024",
  avatarUrl: undefined,
};

const DEFAULT_PLAYER: MockUser = {
  id: "mock-2",
  email: "tom.wilson@email.com",
  firstName: "Tom",
  lastName: "Wilson",
  role: "player",
  joinedAt: "January 2024",
  avatarUrl: undefined,
};

const DEFAULT_PARENT: MockUser = {
  id: "mock-3",
  email: "parent@email.com",
  firstName: "Emma",
  lastName: "Johnson",
  role: "parent",
  joinedAt: "February 2024",
  avatarUrl: undefined,
};

export function getMockUser(): MockUser | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(MOCK_USER_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as MockUser;
    } catch {
      return DEFAULT_COACH;
    }
  }
  return DEFAULT_COACH;
}

export function setMockUser(user: Partial<MockUser> | UserRole): void {
  if (typeof window === "undefined") return;
  if (typeof user === "string") {
    const roleUser =
      user === "coach"
        ? DEFAULT_COACH
        : user === "player"
          ? DEFAULT_PLAYER
          : user === "parent"
            ? DEFAULT_PARENT
            : DEFAULT_COACH;
    localStorage.setItem(MOCK_USER_KEY, JSON.stringify(roleUser));
  } else {
    const current = getMockUser() ?? DEFAULT_COACH;
    const merged = { ...current, ...user };
    localStorage.setItem(MOCK_USER_KEY, JSON.stringify(merged));
  }
}

export function getMockUserRole(): UserRole {
  return getMockUser()?.role ?? "coach";
}
