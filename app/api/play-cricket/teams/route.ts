import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { MOCK_PLAY_CRICKET_TEAMS } from "@/app/lib/club-data";
import { getAuthUser } from "@/lib/get-auth-user";
import { prisma } from "@/prisma/client";

const bannerFields = {
  bannerFileName: z.string().max(200).optional().nullable(),
  bannerImageUrl: z.string().max(3_000_000).optional().nullable(),
};

const createTeamSchema = z.object({
  name: z.string().min(1).max(200),
  clubName: z.string().min(1).max(200),
  squadHint: z.string().max(200).optional(),
  ...bannerFields,
});

function requireCoach(user: { id: string; role: string } | null):
  | { error: NextResponse }
  | { user: { id: string; role: string } } {
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (user.role !== "COACH" && user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

function toTeamPayload(team: {
  id: string;
  name: string;
  clubName: string;
  squadHint: string | null;
  bannerFileName: string | null;
  bannerImageUrl: string | null;
}) {
  return {
    id: team.id,
    name: team.name,
    clubName: team.clubName,
    squadHint: team.squadHint ?? undefined,
    bannerFileName: team.bannerFileName ?? undefined,
    bannerImageUrl: team.bannerImageUrl ?? undefined,
    persisted: true,
  };
}

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  const coachCheck = requireCoach(authUser);
  if ("error" in coachCheck) return coachCheck.error;
  const { user } = coachCheck;

  const stored = await prisma.team.findMany({
    where: user.role === "ADMIN" ? {} : { coachId: user.id },
    orderBy: { createdAt: "desc" },
  });
  const storedIds = new Set(stored.map((team) => team.id));
  const mocks = MOCK_PLAY_CRICKET_TEAMS.filter((team) => !storedIds.has(team.id)).map((team) => ({
    id: team.id,
    name: team.name,
    clubName: team.clubName,
    squadHint: team.squadHint,
    persisted: false,
  }));

  return NextResponse.json({ teams: [...stored.map(toTeamPayload), ...mocks] });
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  const coachCheck = requireCoach(authUser);
  if ("error" in coachCheck) return coachCheck.error;
  const { user } = coachCheck;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const createdTeam = await prisma.team.create({
    data: {
      name: parsed.data.name,
      clubName: parsed.data.clubName,
      squadHint: parsed.data.squadHint || null,
      bannerFileName: parsed.data.bannerFileName ?? null,
      bannerImageUrl: parsed.data.bannerImageUrl ?? null,
      coachId: user.id,
    },
  });

  return NextResponse.json({ team: toTeamPayload(createdTeam) }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const authUser = await getAuthUser(request);
  const coachCheck = requireCoach(authUser);
  if ("error" in coachCheck) return coachCheck.error;
  const { user } = coachCheck;

  const teamId = request.nextUrl.searchParams.get("id")?.trim();
  if (!teamId) {
    return NextResponse.json({ error: "Team id is required" }, { status: 400 });
  }

  const existing = await prisma.team.findUnique({ where: { id: teamId } });
  if (!existing) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }
  if (existing.coachId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.team.delete({ where: { id: teamId } });
  return NextResponse.json({ success: true });
}
