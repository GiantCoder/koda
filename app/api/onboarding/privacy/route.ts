import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { privacyUpdateSchema } from "../schema";
import { getAuthUser } from "@/lib/get-auth-user";

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
