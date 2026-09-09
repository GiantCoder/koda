/**
 * Wraps the real notifications backend (GET /api/notifications, PUT
 * /api/notifications/[id]/read, PUT /api/notifications/mark-all-read,
 * DELETE /api/notifications/[id]) -- unlike messaging, this page's backend
 * AND the concept both check out as real; only 4 of 13 NotificationType
 * values are ever actually generated server-side today (achievements,
 * card stat updates, system alerts, season complete), plus NEW_MESSAGE as
 * of this phase's small backend addition (see api/conversations.ts).
 * The rest (TEAM_INVITATION, SESSION_REMINDER, CONSENT_REQUEST, etc.) are
 * dead enum values nothing creates -- mobile doesn't need to special-case
 * them, they simply won't appear in practice.
 */
import { apiFetch } from "./client";

export type NotificationType =
  | "ANALYSIS_COMPLETE"
  | "NEW_MESSAGE"
  | "TEAM_INVITATION"
  | "ACHIEVEMENT_UNLOCKED"
  | "SESSION_REMINDER"
  | "CONSENT_REQUEST"
  | "SYSTEM_ALERT"
  | "CARD_STAT_UPDATE"
  | "LEAGUE_POSITION_CHANGE"
  | "SEASON_ENDING"
  | "SEASON_COMPLETE"
  | "CHALLENGE_LIVE"
  | "CHALLENGE_RESULT";

export interface KodaNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsPage {
  notifications: KodaNotification[];
  unreadCount: number;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function getNotifications(
  opts: { page?: number; limit?: number; unreadOnly?: boolean } = {}
): Promise<NotificationsPage> {
  const params = new URLSearchParams();
  if (opts.page != null) params.set("page", String(opts.page));
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.unreadOnly) params.set("unreadOnly", "true");
  const qs = params.toString();
  return apiFetch<NotificationsPage>(`/api/notifications${qs ? `?${qs}` : ""}`);
}

export async function markNotificationRead(id: string): Promise<KodaNotification> {
  return apiFetch<KodaNotification>(`/api/notifications/${id}/read`, { method: "PUT" });
}

export async function markAllNotificationsRead(): Promise<{ updatedCount: number }> {
  return apiFetch<{ success: boolean; updatedCount: number }>("/api/notifications/mark-all-read", {
    method: "PUT",
  });
}

export async function deleteNotification(id: string): Promise<void> {
  await apiFetch(`/api/notifications/${id}`, { method: "DELETE" });
}
