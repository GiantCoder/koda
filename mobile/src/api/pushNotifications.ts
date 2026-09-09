/**
 * Wraps POST/DELETE /api/notifications/register-device (Phase 8, new
 * backend endpoint -- see prisma/schema.prisma's PushToken model and
 * lib/push.ts). See src/hooks/usePushRegistration.ts for when these are
 * actually called (on sign-in and sign-out).
 */
import { apiFetch } from "./client";

export async function registerPushToken(token: string, platform: "ios" | "android"): Promise<void> {
  await apiFetch("/api/notifications/register-device", {
    method: "POST",
    body: { token, platform },
  });
}

export async function unregisterPushToken(token: string): Promise<void> {
  await apiFetch("/api/notifications/register-device", {
    method: "DELETE",
    body: { token },
  });
}
