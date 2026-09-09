import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";

const registerSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(["ios", "android"]).optional(),
});

/**
 * POST /api/notifications/register-device
 * Added in Phase 8 (mobile) for expo-notifications device registration --
 * see the PushToken model in prisma/schema.prisma and sendPushToUser() in
 * lib/push.ts, which is what actually reads these rows. Web has no
 * equivalent (browser push is a separate, unimplemented capability) so
 * this is mobile-only for now, same shape as the auth refresh-token
 * additions from Phase 1 (additive, `x-koda-client: mobile` is implied by
 * only the mobile client ever calling this).
 *
 * A token is unique per device, not per user -- if the same physical
 * device previously registered under a different signed-in user (a shared
 * family tablet, say), re-registering here reassigns it to the new caller
 * rather than leaving a stale mapping to the old one.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  await prisma.pushToken.upsert({
    where: { token: parsed.data.token },
    create: {
      token: parsed.data.token,
      userId: user.id,
      platform: parsed.data.platform,
    },
    update: {
      userId: user.id,
      platform: parsed.data.platform,
      lastSeenAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/notifications/register-device
 * Called on sign-out so a shared/reset device stops receiving push for the
 * account that just logged out. Deleting a token nobody registered is a
 * harmless no-op, not an error -- the client doesn't need to track whether
 * it successfully registered before.
 */
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.pick({ token: true }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  await prisma.pushToken.deleteMany({
    where: { token: parsed.data.token, userId: user.id },
  });

  return NextResponse.json({ ok: true });
}
