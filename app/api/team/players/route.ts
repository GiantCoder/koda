import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { createTeamPlayerSchema } from "./schema";

interface TeamPlayerDto {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  clubOrSchool?: string | null;
  primaryPosition?: string | null;
  battingStyle?: string | null;
  bowlingStyle?: string | null;
  profileVisibility?: string | null;
  ageGroup?: string | null;
  squadNames?: string[];
}

function dedupePlayers(players: TeamPlayerDto[]): TeamPlayerDto[] {
  const map = new Map<string, TeamPlayerDto>();
  for (const player of players) {
    const existing = map.get(player.id);
    if (!existing) {
      map.set(player.id, player);
      continue;
    }
    const mergedSquads = new Set([...(existing.squadNames ?? []), ...(player.squadNames ?? [])]);
    map.set(player.id, {
      ...existing,
      squadNames: Array.from(mergedSquads),
    });
  }
  return Array.from(map.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (authUser.role === "COACH" || authUser.role === "ADMIN") {
    const members = await prisma.squadMember.findMany({
      where: {
        squad: authUser.role === "ADMIN" ? undefined : { coachId: authUser.id },
        user: { role: "PLAYER", isActive: true },
      },
      include: {
        squad: {
          select: { name: true },
        },
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            dateOfBirth: true,
            clubOrSchool: true,
            primaryPosition: true,
            battingStyle: true,
            bowlingStyle: true,
            profileVisibility: true,
            ageGroup: true,
          },
        },
      },
    });

    const players = dedupePlayers(
      members.map((member) => ({
        id: member.user.id,
        displayName: member.user.displayName,
        email: member.user.email,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        avatarUrl: member.user.avatarUrl,
        dateOfBirth: member.user.dateOfBirth?.toISOString() ?? null,
        clubOrSchool: member.user.clubOrSchool,
        primaryPosition: member.user.primaryPosition,
        battingStyle: member.user.battingStyle,
        bowlingStyle: member.user.bowlingStyle,
        profileVisibility: member.user.profileVisibility,
        ageGroup: member.user.ageGroup,
        squadNames: [member.squad.name],
      }))
    );

    return NextResponse.json({ players });
  }

  if (authUser.role === "PARENT") {
    const links = await prisma.guardianLink.findMany({
      where: { parentId: authUser.id },
      include: {
        child: {
          select: {
            id: true,
            displayName: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            dateOfBirth: true,
            clubOrSchool: true,
            primaryPosition: true,
            battingStyle: true,
            bowlingStyle: true,
            profileVisibility: true,
            ageGroup: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    const players = dedupePlayers(
      links
        .filter((link) => link.child.isActive && link.child.role === "PLAYER")
        .map((link) => ({
          id: link.child.id,
          displayName: link.child.displayName,
          email: link.child.email,
          firstName: link.child.firstName,
          lastName: link.child.lastName,
          avatarUrl: link.child.avatarUrl,
          dateOfBirth: link.child.dateOfBirth?.toISOString() ?? null,
          clubOrSchool: link.child.clubOrSchool,
          primaryPosition: link.child.primaryPosition,
          battingStyle: link.child.battingStyle,
          bowlingStyle: link.child.bowlingStyle,
          profileVisibility: link.child.profileVisibility,
          ageGroup: link.child.ageGroup,
        }))
    );

    return NextResponse.json({ players });
  }

  if (authUser.role === "PLAYER") {
    const me = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, displayName: true, email: true, isActive: true },
    });
    const players = me && me.isActive ? [{ id: me.id, displayName: me.displayName, email: me.email }] : [];
    return NextResponse.json({ players });
  }

  return NextResponse.json({ players: [] });
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

  const parsed = createTeamPlayerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  let squadId = parsed.data.squadId;
  if (authUser.role === "COACH") {
    if (!squadId) {
      const defaultSquad = await prisma.squad.findFirst({
        where: { coachId: authUser.id, isActive: true },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });
      if (!defaultSquad) {
        return NextResponse.json(
          { error: "Create a squad before adding players" },
          { status: 400 }
        );
      }
      squadId = defaultSquad.id;
    } else {
      const ownedSquad = await prisma.squad.findFirst({
        where: { id: squadId, coachId: authUser.id },
        select: { id: true },
      });
      if (!ownedSquad) {
        return NextResponse.json(
          { error: "Forbidden: Squad is not managed by this coach" },
          { status: 403 }
        );
      }
    }
  }

  try {
    const fallbackEmail = `player+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@koda.local`;
    const player = await prisma.user.create({
      data: {
        email: (parsed.data.email ?? fallbackEmail).toLowerCase(),
        role: "PLAYER",
        displayName: parsed.data.displayName,
        firstName: parsed.data.firstName ?? null,
        lastName: parsed.data.lastName ?? null,
        isActive: true,
        emailVerified: false,
      },
      select: { id: true, displayName: true, email: true },
    });

    if (squadId) {
      await prisma.squadMember.create({
        data: { squadId, userId: player.id },
      });
    }

    return NextResponse.json({ player }, { status: 201 });
  } catch (error) {
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2002") {
      return NextResponse.json(
        { error: "A player with this email already exists" },
        { status: 409 }
      );
    }
    throw error;
  }
}
