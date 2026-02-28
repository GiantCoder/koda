import { canViewProgress } from "./rbac";

/**
 * GuardianLink and SquadMember tables are not in the current schema.
 * For MVP, isLinkedChild is always false (parent cannot view child progress).
 * Coach and Admin can view any user's progress.
 */
export async function assertCanViewProgress(
  viewerId: string,
  viewerRole: string,
  targetUserId: string
): Promise<boolean> {
  const isLinkedChild = false;
  return canViewProgress(viewerId, viewerRole, targetUserId, isLinkedChild);
}
