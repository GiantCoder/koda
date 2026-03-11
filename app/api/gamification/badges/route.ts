import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";

/**
 * GET /api/gamification/badges
 * Full badge catalogue with earned status for the current user, ordered by sortOrder.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [definitions, userBadges] = await Promise.all([
    prisma.badgeDefinition.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.userBadge.findMany({
      where: { userId: user.id },
      select: { badgeDefinitionId: true, earnedAt: true },
    }),
  ]);

  const earnedMap = new Map(
    userBadges.map((ub) => [ub.badgeDefinitionId, ub.earnedAt])
  );

  const badges = definitions.map((definition) => ({
    definition,
    earned: earnedMap.has(definition.id),
    earnedAt: earnedMap.get(definition.id) ?? null,
  }));

  return NextResponse.json({ badges });
}
