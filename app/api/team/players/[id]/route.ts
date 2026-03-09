import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { updateTeamPlayerSchema } from "../schema";
import { z } from "zod";

const idParamSchema = z.object({
  id: z.string().uuid(),
});

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.role !== "COACH" && authUser.role !== "ADMIN" && authUser.role !== "PARENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsedParams = idParamSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid player id" }, { status: 400 });
  }
  const playerId = parsedParams.data.id;

  const existingPlayer = await prisma.user.findUnique({
    where: { id: playerId },
    select: { id: true, role: true, isActive: true },
  });
  if (!existingPlayer || existingPlayer.role !== "PLAYER" || !existingPlayer.isActive) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  if (authUser.role === "COACH") {
    const allowed = await canCoachManagePlayer(authUser.id, playerId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Forbidden: Player is not in your squads" },
        { status: 403 }
      );
    }
  }
  if (authUser.role === "PARENT") {
    const allowed = await canParentManagePlayer(authUser.id, playerId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Forbidden: Player is not linked to your account" },
        { status: 403 }
      );
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsedBody = updateTeamPlayerSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsedBody.error.flatten() },
      { status: 400 }
    );
  }

  const { squadId, ...updates } = parsedBody.data;
  const updateData: Record<string, unknown> = {};
  if (updates.displayName !== undefined) updateData.displayName = updates.displayName;
  if (updates.firstName !== undefined) updateData.firstName = updates.firstName;
  if (updates.lastName !== undefined) updateData.lastName = updates.lastName;
  if (updates.dateOfBirth !== undefined) {
    updateData.dateOfBirth = updates.dateOfBirth ? new Date(updates.dateOfBirth) : null;
  }
  if (updates.battingStyle !== undefined) updateData.battingStyle = updates.battingStyle;
  if (updates.bowlingStyle !== undefined) updateData.bowlingStyle = updates.bowlingStyle;
  if (updates.clubOrSchool !== undefined) updateData.clubOrSchool = updates.clubOrSchool;
  if (updates.primaryPosition !== undefined) updateData.primaryPosition = updates.primaryPosition;
  if (updates.profileVisibility !== undefined) updateData.profileVisibility = updates.profileVisibility;
  if (updates.ageGroup !== undefined) updateData.ageGroup = updates.ageGroup;

  const updated = await prisma.user.update({
    where: { id: playerId },
    data: updateData,
    select: { id: true, displayName: true, email: true },
  });

  if (squadId && authUser.role !== "PARENT") {
    if (authUser.role === "COACH") {
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
    await prisma.squadMember.upsert({
      where: { squadId_userId: { squadId, userId: playerId } },
      create: { squadId, userId: playerId },
      update: {},
    });
  }

  return NextResponse.json({ player: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.role !== "COACH" && authUser.role !== "ADMIN" && authUser.role !== "PARENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsedParams = idParamSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid player id" }, { status: 400 });
  }
  const playerId = parsedParams.data.id;

  if (authUser.role === "COACH") {
    const removed = await prisma.squadMember.deleteMany({
      where: {
        userId: playerId,
        squad: { coachId: authUser.id },
      },
    });
    if (removed.count === 0) {
      return NextResponse.json(
        { error: "Player is not in your squads" },
        { status: 404 }
      );
    }
    return NextResponse.json({ message: "Player removed from your team" });
  }

  if (authUser.role === "PARENT") {
    const deleted = await prisma.guardianLink.deleteMany({
      where: { parentId: authUser.id, childId: playerId },
    });
    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "Player is not linked to your account" },
        { status: 404 }
      );
    }
    return NextResponse.json({ message: "Player link removed from your account" });
  }

  await prisma.user.update({
    where: { id: playerId },
    data: { isActive: false },
  });
  return NextResponse.json({ message: "Player account deactivated" });
}
