import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/get-auth-user";
import { parseRequestBody } from "@/lib/parse-request-body";
import { prisma } from "@/prisma/client";
import { inngest } from "@/inngest/client";

const syncSchema = z.object({
  clubId: z.string().uuid(),
  season: z.string().regex(/^\d{4}$/).optional(),
});

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.role !== "COACH" && authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await parseRequestBody(request);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { clubId, season: reqSeason } = parsed.data;
  const season = reqSeason ?? new Date().getFullYear().toString();

  const club = await prisma.club.findFirst({
    where: { id: clubId, coachId: authUser.id },
  });
  if (!club) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      ecbApiKeyEncrypted: true,
      ecbApiKeyIv: true,
      ecbApiKeyTag: true,
    },
  });
  if (
    !user ||
    !user.ecbApiKeyEncrypted ||
    !user.ecbApiKeyIv ||
    !user.ecbApiKeyTag
  ) {
    return NextResponse.json({ error: "no_api_key" }, { status: 400 });
  }

  const syncLog = await prisma.playCricketSyncLog.create({
    data: {
      coachId: authUser.id,
      clubId,
      season,
      status: "PENDING",
      startedAt: new Date(),
    },
  });

  await inngest.send({
    name: "play-cricket/sync.requested",
    data: {
      coachId: authUser.id,
      clubId,
      season,
      requestedAt: new Date().toISOString(),
    },
  });

  return NextResponse.json({
    success: true,
    syncLogId: syncLog.id,
    message:
      "Sync started. Players and match data will update in the background.",
  });
}
