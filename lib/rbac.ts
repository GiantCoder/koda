/**
 * RBAC helpers for user access control.
 * - Admin: full access
 * - Coach: can view other users (squad members in full schema; MVP: minimal rule allows coach view)
 * - Player/Parent: own profile only
 * - Parent linked child: requires GuardianLink (not in schema yet; placeholder returns false)
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

/**
 * Progress/statistics RBAC per PRD 4.8:
 * - Players: own progress
 * - Parents: linked children (GuardianLink not in schema; use canViewUser for MVP)
 * - Coaches: squad members (SquadMember not in schema; use canViewUser for MVP)
 */
export function canViewProgress(
  viewerId: string,
  viewerRole: string,
  targetUserId: string,
  isLinkedChild?: boolean
): boolean {
  if (viewerId === targetUserId) return true;
  if (viewerRole === "ADMIN") return true;
  if (viewerRole === "COACH") return true;
  if (viewerRole === "PARENT" && isLinkedChild) return true;
  return false;
}
