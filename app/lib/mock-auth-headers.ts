import type { MockUser } from "@/app/lib/mock-auth";

export function buildMockAuthHeaders(user: MockUser | null): Record<string, string> {
  if (!user) {
    return {};
  }
  return {
    "x-auth-user-id": user.id,
    "x-auth-role": user.role.toUpperCase(),
  };
}
