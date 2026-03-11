import type { BadgeDefinition, CardTier, UserBadge } from "@prisma/client";
import { prisma } from "@/prisma/client";

export interface GamificationNotificationPayload {
  pointsAwarded: number;
  newBadges: Array<UserBadge & { badgeDefinition: BadgeDefinition }>;
  tierChange?: { from: CardTier; to: CardTier };
  /** When set, send CARD_STAT_UPDATE (card was recalculated from analyses). */
  cardUpdated?: { newTier: CardTier };
}

/**
 * Send gamification-related notifications: ACHIEVEMENT_UNLOCKED for new badges and tier upgrades,
 * and CARD_STAT_UPDATE when the player card was auto-updated.
 */
export async function sendGamificationNotifications(
  userId: string,
  payload: GamificationNotificationPayload
): Promise<void> {
  const { newBadges, tierChange, cardUpdated } = payload;

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

  // CARD_STAT_UPDATE only when card was updated and tier did not change (avoid duplicate with ACHIEVEMENT_UNLOCKED for tier)
  if (cardUpdated && !tierChange) {
    await prisma.notification.create({
      data: {
        userId,
        type: "CARD_STAT_UPDATE",
        title: "Player card updated",
        message: `Your card stats have been recalculated from your latest analyses. You're now ${cardUpdated.newTier} tier.`,
        actionUrl: "/profile",
        metadata: { newTier: cardUpdated.newTier },
      },
    });
  }
}
