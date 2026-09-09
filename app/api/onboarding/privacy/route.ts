import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { privacyUpdateSchema } from "../schema";
import { getAuthUser } from "@/lib/get-auth-user";

// Schema defaults (prisma/schema.prisma PrivacyPreferences) mirrored here so
// a user who hasn't saved preferences yet still gets a sensible response
// instead of a 404 -- this is what the web onboarding screen's local state
// initializes to, so GET and the pre-save UI now agree.
const DEFAULT_PRIVACY_PREFERENCES = {
  performanceAnalytics: true,
  marketingCommunications: false,
  coachParentComms: true,
  profileVisibility: "COACHES_PARENTS" as const,
};

/**
 * GET /api/onboarding/privacy
 * Added for the mobile Settings screen, which (unlike the web app's privacy
 * toggles, which are local-only state that's never read back) needs to show
 * a user's actual saved preferences rather than always resetting to
 * defaults on every visit. Read-only, no side effects, additive to the
 * existing PUT below.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefs = await prisma.privacyPreferences.findUnique({
    where: { userId: user.id },
    select: {
      performanceAnalytics: true,
      marketingCommunications: true,
      coachParentComms: true,
      profileVisibility: true,
    },
  });

  return NextResponse.json(prefs ?? DEFAULT_PRIVACY_PREFERENCES);
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const validation = privacyUpdateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const data = validation.data;
  const update: Record<string, boolean | string> = {};
  if (data.performanceAnalytics !== undefined)
    update.performanceAnalytics = data.performanceAnalytics;
  if (data.marketingCommunications !== undefined)
    update.marketingCommunications = data.marketingCommunications;
  if (data.coachParentComms !== undefined)
    update.coachParentComms = data.coachParentComms;
  if (data.profileVisibility !== undefined)
    update.profileVisibility = data.profileVisibility;

  const prefs = await prisma.privacyPreferences.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      ...update,
    },
    update,
  });

  return NextResponse.json({
    performanceAnalytics: prefs.performanceAnalytics,
    marketingCommunications: prefs.marketingCommunications,
    coachParentComms: prefs.coachParentComms,
    profileVisibility: prefs.profileVisibility,
  });
}
