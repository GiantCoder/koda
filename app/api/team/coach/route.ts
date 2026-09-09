import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";

/**
 * GET /api/team/coach
 * Mobile Phase 6 addition: previously there was no way for a PLAYER or
 * PARENT to discover their coach's identity through any real endpoint --
 * GET /api/squads is coach/admin-only (403 for anyone else), and
 * GET /api/team/players only ever returns the requester's own record for a
 * PLAYER. That gap blocked Phase 5's messaging from letting a player/parent
 * start a conversation with their own coach (they could only reply to ones
 * a coach started). Small, additive, read-only: returns the coach(es) of
 * the requesting PLAYER's squad(s), or of a PARENT's linked children's
 * squad(s). Deduplicated since a player/parent could plausibly have more
 * than one coach across squads/children.
 */
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const coachSelect = { id: true, displayName: true, isActive: true } as const;

  if (authUser.role === "PLAYER") {
    const memberships = await prisma.squadMember.findMany({
      where: { userId: authUser.id },
      select: { squad: { select: { coach: { select: coachSelect } } } },
    });
    const coaches = dedupeCoaches(memberships.map((m) => m.squad.coach));
    return NextResponse.json({ coaches });
  }

  if (authUser.role === "PARENT") {
    const links = await prisma.guardianLink.findMany({
      where: { parentId: authUser.id },
      select: { child: { select: { id: true, isActive: true, role: true } } },
    });
    const childIds = links
      .filter((l) => l.child.isActive && l.child.role === "PLAYER")
      .map((l) => l.child.id);
    if (childIds.length === 0) {
      return NextResponse.json({ coaches: [] });
    }
    const memberships = await prisma.squadMember.findMany({
      where: { userId: { in: childIds } },
      select: { squad: { select: { coach: { select: coachSelect } } } },
    });
    const coaches = dedupeCoaches(memberships.map((m) => m.squad.coach));
    return NextResponse.json({ coaches });
  }

  return NextResponse.json({ coaches: [] });
}

function dedupeCoaches(
  coaches: Array<{ id: string; displayName: string; isActive: boolean }>
): Array<{ id: string; displayName: string }> {
  const map = new Map<string, { id: string; displayName: string }>();
  for (const coach of coaches) {
    if (!coach.isActive) continue;
    if (!map.has(coach.id)) map.set(coach.id, { id: coach.id, displayName: coach.displayName });
  }
  return Array.from(map.values());
}
