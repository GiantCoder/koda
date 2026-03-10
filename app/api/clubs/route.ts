import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/get-auth-user";
import { prisma } from "@/prisma/client";
import type { ClubRecord } from "@/app/lib/club-data";

const createClubSchema = z.object({
  name: z.string().min(1).max(200),
  website: z.string().url(),
  playCricketUrl: z.string().url(),
  playCricketId: z.string().min(1).max(120),
  address: z.string().min(1).max(240),
  postcode: z.string().min(1).max(30),
  badgeFileName: z.string().max(200).optional(),
  bannerFileName: z.string().max(200).optional(),
  badgeImageUrl: z.string().max(3_000_000).optional(),
  bannerImageUrl: z.string().max(3_000_000).optional(),
});

const updateClubSchema = createClubSchema.partial();

function derivePlayerRating(userId: string): number {
  const seed = userId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const normalized = 3 + (seed % 21) / 10;
  return Number(normalized.toFixed(1));
}

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.role !== "COACH" && authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const whereClause = authUser.role === "ADMIN" ? {} : { coachId: authUser.id };
  const clubs = await prisma.club.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
  });

  const clubNames = clubs.map((club) => club.name).filter(Boolean);
  const players = clubNames.length
    ? await prisma.user.findMany({
        where: {
          role: "PLAYER",
          isActive: true,
          clubOrSchool: { in: clubNames },
        },
        select: {
          id: true,
          ageGroup: true,
          clubOrSchool: true,
        },
      })
    : [];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const sessions = clubNames.length
    ? await prisma.session.findMany({
        where: {
          coachId: authUser.role === "ADMIN" ? undefined : authUser.id,
          scheduledAt: { gte: monthStart, lt: monthEnd },
          squad: { is: { clubName: { in: clubNames } } },
        },
        select: {
          squad: { select: { clubName: true } },
        },
      })
    : [];

  const playerMap = new Map<string, typeof players>();
  for (const clubName of clubNames) {
    playerMap.set(
      clubName,
      players.filter((player) => player.clubOrSchool === clubName)
    );
  }
  const sessionMap = new Map<string, number>();
  for (const session of sessions) {
    const name = session.squad?.clubName;
    if (!name) continue;
    sessionMap.set(name, (sessionMap.get(name) ?? 0) + 1);
  }

  const payload: ClubRecord[] = clubs.map((club) => {
    const clubPlayers = playerMap.get(club.name) ?? [];
    const seniors = clubPlayers.filter((player) => player.ageGroup === "SENIOR").length;
    const juniors = clubPlayers.length - seniors;
    const averageRating =
      clubPlayers.length > 0
        ? Number(
            (
              clubPlayers.reduce((sum, player) => sum + derivePlayerRating(player.id), 0) /
              clubPlayers.length
            ).toFixed(1)
          )
        : 0;

    return {
      id: club.id,
      name: club.name,
      website: club.website,
      playCricketUrl: club.playCricketUrl,
      playCricketId: club.playCricketId,
      address: club.address,
      postcode: club.postcode,
      badgeFileName: club.badgeFileName ?? undefined,
      bannerFileName: club.bannerFileName ?? undefined,
      badgeImageUrl: club.badgeImageUrl ?? undefined,
      bannerImageUrl: club.bannerImageUrl ?? undefined,
      stats: {
        seniors,
        juniors,
        playersCoached: clubPlayers.length,
        averageRating,
        sessionsThisMonth: sessionMap.get(club.name) ?? 0,
      },
    };
  });

  return NextResponse.json({ clubs: payload });
}

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
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createClubSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const createdClub = await prisma.club.create({
      data: {
        coachId: authUser.id,
        name: parsed.data.name,
        website: parsed.data.website,
        playCricketUrl: parsed.data.playCricketUrl,
        playCricketId: parsed.data.playCricketId,
        address: parsed.data.address,
        postcode: parsed.data.postcode,
        badgeFileName: parsed.data.badgeFileName ?? null,
        bannerFileName: parsed.data.bannerFileName ?? null,
        badgeImageUrl: parsed.data.badgeImageUrl ?? null,
        bannerImageUrl: parsed.data.bannerImageUrl ?? null,
      },
    });

    const payload: ClubRecord = {
      id: createdClub.id,
      name: createdClub.name,
      website: createdClub.website,
      playCricketUrl: createdClub.playCricketUrl,
      playCricketId: createdClub.playCricketId,
      address: createdClub.address,
      postcode: createdClub.postcode,
      badgeFileName: createdClub.badgeFileName ?? undefined,
      bannerFileName: createdClub.bannerFileName ?? undefined,
      badgeImageUrl: createdClub.badgeImageUrl ?? undefined,
      bannerImageUrl: createdClub.bannerImageUrl ?? undefined,
      stats: {
        seniors: 0,
        juniors: 0,
        playersCoached: 0,
        averageRating: 0,
        sessionsThisMonth: 0,
      },
    };

    return NextResponse.json({ club: payload }, { status: 201 });
  } catch (error) {
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2002") {
      return NextResponse.json({ error: "A club with this name already exists" }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.role !== "COACH" && authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clubId = request.nextUrl.searchParams.get("id")?.trim();
  if (!clubId) {
    return NextResponse.json({ error: "Club id is required" }, { status: 400 });
  }

  const deleted = await prisma.club.deleteMany({
    where: {
      id: clubId,
      coachId: authUser.role === "ADMIN" ? undefined : authUser.id,
    },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function PUT(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.role !== "COACH" && authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clubId = request.nextUrl.searchParams.get("id")?.trim();
  if (!clubId) {
    return NextResponse.json({ error: "Club id is required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateClubSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.website !== undefined) updateData.website = data.website;
  if (data.playCricketUrl !== undefined) updateData.playCricketUrl = data.playCricketUrl;
  if (data.playCricketId !== undefined) updateData.playCricketId = data.playCricketId;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.postcode !== undefined) updateData.postcode = data.postcode;
  if (data.badgeFileName !== undefined) updateData.badgeFileName = data.badgeFileName;
  if (data.bannerFileName !== undefined) updateData.bannerFileName = data.bannerFileName;
  if (data.badgeImageUrl !== undefined) updateData.badgeImageUrl = data.badgeImageUrl;
  if (data.bannerImageUrl !== undefined) updateData.bannerImageUrl = data.bannerImageUrl;

  try {
    const updated = await prisma.club.updateMany({
      where: {
        id: clubId,
        coachId: authUser.role === "ADMIN" ? undefined : authUser.id,
      },
      data: updateData,
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    return NextResponse.json({ club });
  } catch (error) {
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2002") {
      return NextResponse.json({ error: "A club with this name already exists" }, { status: 409 });
    }
    throw error;
  }
}
