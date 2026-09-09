import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { deriveCardStats, deriveCardTier } from "@/lib/player-card-stats";
import { getSignedUrl } from "@/src/lib/storage";
import { updatePlayerCardSchema } from "@/types/player-card";
import { notifyUser } from "@/lib/notifications";

const idParamSchema = z.object({
  id: z.string().uuid(),
});

const STORAGE_BUCKET = process.env.STORAGE_BUCKET_VIDEOS ?? "koda-videos";
const ASSET_SIGNED_URL_TTL_SECONDS = 60 * 15;

function computeOverall(card: {
  statTec: number;
  statPow: number;
  statTim: number;
  statCon: number;
  statPac: number;
  statFie: number;
}): number {
  return Math.round(
    (card.statTec + card.statPow + card.statTim + card.statCon + card.statPac + card.statFie) / 6
  );
}

async function canCoachManagePlayer(coachId: string, playerId: string): Promise<boolean> {
  const membership = await prisma.squadMember.findFirst({
    where: {
      userId: playerId,
      squad: { coachId },
    },
    select: { id: true },
  });
  return Boolean(membership);
}

async function canParentManagePlayer(parentId: string, playerId: string): Promise<boolean> {
  const link = await prisma.guardianLink.findFirst({
    where: {
      parentId,
      childId: playerId,
    },
    select: { id: true },
  });
  return Boolean(link);
}

function extractStorageKeyFromUrl(rawValue: string): string | null {
  try {
    const parsedUrl = new URL(rawValue);
    const normalizedPath = parsedUrl.pathname.replace(/^\/+/, "");

    if (normalizedPath.startsWith(`${STORAGE_BUCKET}/`)) {
      return normalizedPath.slice(STORAGE_BUCKET.length + 1);
    }

    if (normalizedPath.startsWith("player-cards/")) {
      return normalizedPath;
    }

    return null;
  } catch {
    return null;
  }
}

function isStorageObjectKey(value: string): boolean {
  return value.startsWith("player-cards/") && !value.includes("://");
}

async function resolveAssetUrl(value: string | null): Promise<string | null> {
  if (!value) return null;
  if (isStorageObjectKey(value)) {
    return getSignedUrl(value, ASSET_SIGNED_URL_TTL_SECONDS);
  }
  const extractedKey = extractStorageKeyFromUrl(value);
  if (extractedKey) {
    return getSignedUrl(extractedKey, ASSET_SIGNED_URL_TTL_SECONDS);
  }
  return value;
}

function toStorageReference(value: string | null | undefined): string | null | undefined {
  if (value == null) return value;
  if (isStorageObjectKey(value)) return value;
  return extractStorageKeyFromUrl(value) ?? value;
}

async function getPlayerCardResponse(playerId: string) {
  const existingCard = await prisma.playerCard.findUnique({
    where: { userId: playerId },
  });

  if (existingCard) {
    const [profilePhotoUrl, backgroundUrl] = await Promise.all([
      resolveAssetUrl(existingCard.profilePhotoUrl),
      resolveAssetUrl(existingCard.backgroundUrl),
    ]);
    return {
      id: existingCard.id,
      userId: existingCard.userId,
      displayName: existingCard.displayName,
      tier: existingCard.tier,
      role: existingCard.role,
      sportIcon: existingCard.sportIcon,
      statTec: existingCard.statTec,
      statPow: existingCard.statPow,
      statTim: existingCard.statTim,
      statCon: existingCard.statCon,
      statPac: existingCard.statPac,
      statFie: existingCard.statFie,
      profilePhotoUrl,
      backgroundUrl,
      backgroundMode: existingCard.backgroundMode,
      overall: computeOverall(existingCard),
    };
  }

  const [userProfile, analyses] = await Promise.all([
    prisma.user.findUnique({
      where: { id: playerId },
      select: {
        displayName: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    }),
    prisma.analysis.findMany({
      where: {
        status: "COMPLETE",
        video: {
          userId: playerId,
          isDeleted: false,
        },
      },
      select: {
        scoreBacklift: true,
        scoreHeadPosition: true,
        scoreBalance: true,
        scoreWeightTransfer: true,
        scoreTiming: true,
        scoreShotSelection: true,
        scoreFootwork: true,
        scoreFollowThrough: true,
        gradeOverall: true,
      },
      orderBy: { completedAt: "desc" },
      take: 20,
    }),
  ]);

  const stats = deriveCardStats(analyses);
  const validGrades = analyses
    .map((analysis) => analysis.gradeOverall)
    .filter((grade): grade is number => grade != null);
  const avgGrade =
    validGrades.length > 0
      ? validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length
      : null;

  const fallbackName = userProfile?.displayName?.trim()
    ? userProfile.displayName
    : [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(" ").trim() ||
      userProfile?.email?.split("@")[0] ||
      "Player";

  return {
    id: null,
    userId: playerId,
    displayName: fallbackName,
    tier: deriveCardTier(avgGrade),
    role: "BAT",
    sportIcon: "BAT_ICON",
    statTec: stats.statTec,
    statPow: stats.statPow,
    statTim: stats.statTim,
    statCon: stats.statCon,
    statPac: stats.statPac,
    statFie: stats.statFie,
    profilePhotoUrl: null,
    backgroundUrl: null,
    backgroundMode: "DEFAULT",
    overall: computeOverall(stats),
  };
}

async function authorizeTeamPlayerAccess(request: NextRequest, playerId: string) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const existingPlayer = await prisma.user.findUnique({
    where: { id: playerId },
    select: { id: true, role: true, isActive: true },
  });
  if (!existingPlayer || existingPlayer.role !== "PLAYER" || !existingPlayer.isActive) {
    return { error: NextResponse.json({ error: "Player not found" }, { status: 404 }) };
  }

  if (authUser.role === "COACH") {
    const allowed = await canCoachManagePlayer(authUser.id, playerId);
    if (!allowed) {
      return {
        error: NextResponse.json(
          { error: "Forbidden: Player is not in your squads" },
          { status: 403 }
        ),
      };
    }
  } else if (authUser.role === "PARENT") {
    const allowed = await canParentManagePlayer(authUser.id, playerId);
    if (!allowed) {
      return {
        error: NextResponse.json(
          { error: "Forbidden: Player is not linked to your account" },
          { status: 403 }
        ),
      };
    }
  } else if (authUser.role !== "ADMIN" && authUser.id !== playerId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { authUser };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const parsedParams = idParamSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid player id" }, { status: 400 });
  }
  const playerId = parsedParams.data.id;

  const authz = await authorizeTeamPlayerAccess(request, playerId);
  if ("error" in authz) {
    return authz.error;
  }

  return NextResponse.json(await getPlayerCardResponse(playerId));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const parsedParams = idParamSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid player id" }, { status: 400 });
  }
  const playerId = parsedParams.data.id;

  const authz = await authorizeTeamPlayerAccess(request, playerId);
  if ("error" in authz) {
    return authz.error;
  }

  if (authz.authUser.role !== "COACH" && authz.authUser.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only coaches/admins can update a player's card." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = updatePlayerCardSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const saved = await prisma.playerCard.upsert({
    where: { userId: playerId },
    create: {
      userId: playerId,
      ...validation.data,
      profilePhotoUrl: toStorageReference(validation.data.profilePhotoUrl),
      backgroundUrl: toStorageReference(validation.data.backgroundUrl),
    },
    update: {
      ...validation.data,
      profilePhotoUrl: toStorageReference(validation.data.profilePhotoUrl),
      backgroundUrl: toStorageReference(validation.data.backgroundUrl),
    },
  });

  await notifyUser({
    userId: playerId,
    type: "SYSTEM_ALERT",
    title: "Player card updated",
    message: "Your coach has updated your player card.",
    actionUrl: "/player-card",
    metadata: {
      updatedByUserId: authz.authUser.id,
      playerCardId: saved.id,
    },
  });

  return NextResponse.json(await getPlayerCardResponse(playerId));
}
