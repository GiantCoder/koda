import { NextRequest, NextResponse } from "next/server";
import type { BgMode, CardRole, CardTier, PlayerCard, SportIcon } from "@prisma/client";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { deriveCardStats, deriveCardTier } from "@/lib/player-card-stats";
import { getSignedUrl } from "@/src/lib/storage";
import type { PlayerCardDto } from "@/types/player-card";
import { updatePlayerCardSchema } from "@/types/player-card";

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

function toDto(card: {
  id: string | null;
  userId: string;
  displayName: string;
  tier: CardTier;
  role: CardRole;
  sportIcon: SportIcon;
  statTec: number;
  statPow: number;
  statTim: number;
  statCon: number;
  statPac: number;
  statFie: number;
  profilePhotoUrl: string | null;
  backgroundUrl: string | null;
  backgroundMode: BgMode;
}): PlayerCardDto {
  return {
    ...card,
    overall: computeOverall(card),
  };
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

function toStorageReference(value: string | null | undefined): string | null | undefined {
  if (value == null) {
    return value;
  }
  if (isStorageObjectKey(value)) {
    return value;
  }
  const extractedKey = extractStorageKeyFromUrl(value);
  return extractedKey ?? value;
}

async function resolveAssetUrl(value: string | null): Promise<string | null> {
  if (!value) {
    return null;
  }

  if (isStorageObjectKey(value)) {
    return getSignedUrl(value, ASSET_SIGNED_URL_TTL_SECONDS);
  }

  const extractedKey = extractStorageKeyFromUrl(value);
  if (extractedKey) {
    return getSignedUrl(extractedKey, ASSET_SIGNED_URL_TTL_SECONDS);
  }

  return value;
}

async function toDtoFromModel(card: PlayerCard): Promise<PlayerCardDto> {
  const [profilePhotoUrl, backgroundUrl] = await Promise.all([
    resolveAssetUrl(card.profilePhotoUrl),
    resolveAssetUrl(card.backgroundUrl),
  ]);

  return toDto({
    id: card.id,
    userId: card.userId,
    displayName: card.displayName,
    tier: card.tier,
    role: card.role,
    sportIcon: card.sportIcon,
    statTec: card.statTec,
    statPow: card.statPow,
    statTim: card.statTim,
    statCon: card.statCon,
    statPac: card.statPac,
    statFie: card.statFie,
    profilePhotoUrl,
    backgroundUrl,
    backgroundMode: card.backgroundMode,
  });
}

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existingCard = await prisma.playerCard.findUnique({
    where: { userId: authUser.id },
  });

  if (existingCard) {
    return NextResponse.json(await toDtoFromModel(existingCard));
  }

  const [userProfile, analyses] = await Promise.all([
    prisma.user.findUnique({
      where: { id: authUser.id },
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
          userId: authUser.id,
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
      authUser.email.split("@")[0] ||
      "Player";

  return NextResponse.json(
    toDto({
      id: null,
      userId: authUser.id,
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
    })
  );
}

export async function PUT(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    where: { userId: authUser.id },
    create: {
      userId: authUser.id,
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

  return NextResponse.json(await toDtoFromModel(saved));
}
