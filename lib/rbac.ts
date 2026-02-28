/**
 * RBAC helpers for user access control.
 * - Admin: full access
 * - Coach: can view other users (squad members in full schema)
 * - Player/Parent: own profile only
 */

export type Role = "ADMIN" | "COACH" | "PARENT" | "PLAYER";

export function canViewUser(
  viewerId: string,
  viewerRole: string,
  targetUserId: string
): boolean {
  if (viewerId === targetUserId) return true;
  if (viewerRole === "ADMIN") return true;
  if (viewerRole === "COACH") return true;
  return false;
}
