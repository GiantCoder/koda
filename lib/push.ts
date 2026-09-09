/**
 * Minimal Expo push client. No new dependency: Expo's push API is a plain
 * HTTPS/JSON endpoint (https://docs.expo.dev/push-notifications/sending-notifications/)
 * that accepts a batch of `{to, title, body, data}` messages, so a bare
 * `fetch` covers it -- no need for the `expo-server-sdk` package for a
 * single small helper like this.
 *
 * Added in Phase 8 (mobile) alongside the PushToken model and
 * notifyUser() in lib/notifications.ts, which is what actually calls this.
 */
import { prisma } from "@/prisma/client";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/** Sends a push to every device a user has registered. Best-effort: a
 * failure here should never fail the caller's request/job -- it always
 * catches and logs rather than throwing. Also prunes tokens Expo reports
 * as permanently invalid (DeviceNotRegistered), since a user who
 * uninstalls the app or revokes permission leaves a dead token behind
 * otherwise. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  try {
    const tokens = await prisma.pushToken.findMany({ where: { userId } });
    if (tokens.length === 0) return;

    const messages = tokens.map((t: { token: string }) => ({
      to: t.token,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
    }));

    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      console.error(`[push] Expo push API returned ${response.status}`);
      return;
    }

    const result = (await response.json()) as {
      data?: Array<{ status: string; details?: { error?: string } }>;
    };
    const invalidTokens: string[] = [];
    (result.data ?? []).forEach((ticket, i) => {
      if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
        invalidTokens.push(tokens[i].token);
      }
    });
    if (invalidTokens.length > 0) {
      await prisma.pushToken.deleteMany({ where: { token: { in: invalidTokens } } });
    }
  } catch (err) {
    console.error("[push] Failed to send push notification:", err);
  }
}
