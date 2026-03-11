import type { BadgeDefinition, CardTier, UserBadge } from "@prisma/client";
import { prisma } from "@/prisma/client";

export interface GamificationNotificationPayload {
  pointsAwarded: number;
  newBadges: Array<UserBadge & { badgeDefinition: BadgeDefinition }>;
  tierChange?: { from: CardTier; to: CardTier };
}

/**
 * Send gamification-related notifications: ACHIEVEMENT_UNLOCKED for new badges and tier upgrades.
 */
export async function sendGamificationNotifications(
  userId: string,
  payload: GamificationNotificationPayload
): Promise<void> {
  const { newBadges, tierChange } = payload;

  for (const ub of newBadges) {
    const badge = ub.badgeDefinition;
    await prisma.notification.create({
      data: {
        userId,
        type: "ACHIEVEMENT_UNLOCKED",
        title: `Badge Earned: ${badge.name}`,
        message: `You've unlocked the ${badge.name} badge! +${badge.pointsValue} points added.`,
        actionUrl: "/profile#badges",
        metadata: { badgeKey: badge.key, userBadgeId: ub.id },
      },
    });
  }

  if (tierChange) {
    const { to } = tierChange;
    await prisma.notification.create({
      data: {
        userId,
        type: "ACHIEVEMENT_UNLOCKED",
        title: `You've reached ${to} tier!`,
        message: `Your card has been upgraded to ${to} tier. Keep practising to climb higher!`,
        actionUrl: "/player-card",
        metadata: { from: tierChange.from, to },
      },
    });
  }
}
