import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { MOCK_PLAY_CRICKET_TEAMS } from "@/app/lib/club-data";
import { getAuthUser } from "@/lib/get-auth-user";

const createTeamSchema = z.object({
  name: z.string().min(1).max(200),
  clubName: z.string().min(1).max(200),
  squadHint: z.string().max(200).optional(),
});

let teamStore = [...MOCK_PLAY_CRICKET_TEAMS];

export async function GET() {
  return NextResponse.json({ teams: teamStore });
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

  const parsed = createTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const createdTeam = {
    id: `manual-${Date.now()}`,
    name: parsed.data.name,
    clubName: parsed.data.clubName,
    squadHint: parsed.data.squadHint || undefined,
  };
  teamStore = [createdTeam, ...teamStore];

  return NextResponse.json({ team: createdTeam }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.role !== "COACH" && authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const teamId = request.nextUrl.searchParams.get("id")?.trim();
  if (!teamId) {
    return NextResponse.json({ error: "Team id is required" }, { status: 400 });
  }

  const previousLength = teamStore.length;
  teamStore = teamStore.filter((team) => team.id !== teamId);
  if (teamStore.length === previousLength) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
