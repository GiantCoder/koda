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
  id: "bea4ab63-eb31-4a64-8650-cbc339fae01b",
  email: "coach@test.com",
  firstName: "Sarah",
  lastName: "Johnson",
  role: "coach",
  joinedAt: "March 2024",
  avatarUrl: undefined,
};

const DEFAULT_PLAYER: MockUser = {
  id: "2298d34b-321a-4200-af3e-0159dd1594ec",
  email: "player@test.com",
  firstName: "Alex",
  lastName: "Johnson",
  role: "player",
  joinedAt: "January 2024",
  avatarUrl: undefined,
};

const DEFAULT_PARENT: MockUser = {
  id: "f3580587-2e11-4a02-b994-fee948a8a630",
  email: "parent@test.com",
  firstName: "Michael",
  lastName: "Thompson",
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
      return null;
    }
  }
  return null;
}

/** API user shape returned by login/register. */
export interface ApiAuthUser {
  id: string;
  email: string;
  displayName?: string | null;
  role: string;
}

/**
 * Sync the displayed user from a successful login/register API response.
 * Ensures the header and dashboard show the actual logged-in user instead of a default.
 */
export function setMockUserFromApiUser(apiUser: ApiAuthUser): void {
  if (typeof window === "undefined") return;
  const display = (apiUser.displayName || apiUser.email || "").trim() || "User";
  const parts = display.split(/\s+/);
  const firstName = parts[0] ?? display;
  const lastName = parts.slice(1).join(" ") || "";
  const role = apiUser.role.toLowerCase() as UserRole;
  const mockUser: MockUser = {
    id: apiUser.id,
    email: apiUser.email,
    firstName,
    lastName,
    role: role === "admin" ? "admin" : role === "coach" ? "coach" : role === "player" ? "player" : "parent",
    joinedAt: new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
    avatarUrl: undefined,
  };
  localStorage.setItem(MOCK_USER_KEY, JSON.stringify(mockUser));
}

export function clearMockUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MOCK_USER_KEY);
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

/** For dev/role switcher: get a default user by role when no one is logged in. */
export function getDefaultMockUser(role: UserRole): MockUser {
  return role === "coach"
    ? DEFAULT_COACH
    : role === "player"
      ? DEFAULT_PLAYER
      : role === "parent"
        ? DEFAULT_PARENT
        : DEFAULT_COACH;
}

export function getMockUserRole(): UserRole {
  return getMockUser()?.role ?? "coach";
}
