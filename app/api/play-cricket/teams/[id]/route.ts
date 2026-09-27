import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { MOCK_PLAY_CRICKET_TEAMS } from "@/app/lib/club-data";
import { getAuthUser } from "@/lib/get-auth-user";
import { prisma } from "@/prisma/client";

const updateTeamSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  clubName: z.string().min(1).max(200).optional(),
  squadHint: z.string().max(200).optional().nullable(),
  bannerFileName: z.string().max(200).optional().nullable(),
  bannerImageUrl: z.string().max(3_000_000).optional().nullable(),
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

/** PUT /api/play-cricket/teams/:id — update a persisted team, or adopt a mock team into the DB. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser(request);
  const coachCheck = requireCoach(authUser);
  if ("error" in coachCheck) return coachCheck.error;
  const { user } = coachCheck;
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.team.findUnique({ where: { id } });
  if (existing) {
    if (existing.coachId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const updated = await prisma.team.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.clubName !== undefined ? { clubName: parsed.data.clubName } : {}),
        ...(parsed.data.squadHint !== undefined ? { squadHint: parsed.data.squadHint } : {}),
        ...(parsed.data.bannerFileName !== undefined ? { bannerFileName: parsed.data.bannerFileName } : {}),
        ...(parsed.data.bannerImageUrl !== undefined ? { bannerImageUrl: parsed.data.bannerImageUrl } : {}),
      },
    });
    return NextResponse.json({ team: toTeamPayload(updated) });
  }

  const mock = MOCK_PLAY_CRICKET_TEAMS.find((team) => team.id === id);
  if (!mock) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const created = await prisma.team.create({
    data: {
      id: mock.id,
      coachId: user.id,
      name: parsed.data.name ?? mock.name,
      clubName: parsed.data.clubName ?? mock.clubName,
      squadHint: parsed.data.squadHint !== undefined ? parsed.data.squadHint : mock.squadHint ?? null,
      bannerFileName: parsed.data.bannerFileName ?? null,
      bannerImageUrl: parsed.data.bannerImageUrl ?? null,
    },
  });

  return NextResponse.json({ team: toTeamPayload(created) });
}
