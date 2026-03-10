import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { createSquadSchema } from "./schema";
import { getAgeFromDateOfBirth, isMinor } from "@/lib/age-consent";

function requireCoach(user: { id: string; role: string } | null):
  | { error: NextResponse }
  | { user: { id: string; role: string } } {
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (user.role !== "COACH" && user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden: Coach role required" }, { status: 403 }) };
  }
  return { user };
}

function derivePlayerRating(userId: string): number {
  const seed = userId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const normalized = 3 + (seed % 21) / 10;
  return Number(normalized.toFixed(1));
}

/** GET /api/squads - List coach's squads */
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  const coachCheck = requireCoach(authUser);
  if ("error" in coachCheck) return coachCheck.error;
  const { user } = coachCheck;

  const squads = await prisma.squad.findMany({
    where: { coachId: user.id },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              avatarUrl: true,
              dateOfBirth: true,
              ageGroup: true,
              role: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const payload = squads.map((squad) => ({
    id: squad.id,
    name: squad.name,
    ageGroup: squad.ageGroup,
    clubName: squad.clubName,
    isActive: squad.isActive,
    createdAt: squad.createdAt,
    updatedAt: squad.updatedAt,
    members: squad.members.map((m) => {
      const age = getAgeFromDateOfBirth(m.user.dateOfBirth);
      return {
        id: m.user.id,
        displayName: m.user.displayName,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        rating: derivePlayerRating(m.user.id),
        ageGroup: m.user.ageGroup,
        role: m.user.role,
        joinedAt: m.joinedAt,
        isMinor: isMinor(age),
      };
    }),
  }));

  return NextResponse.json({ squads: payload });
}

/** POST /api/squads - Create squad */
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

  const parsed = createSquadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const squad = await prisma.squad.create({
    data: {
      name: parsed.data.name,
      coachId: user.id,
      ageGroup: parsed.data.ageGroup ?? null,
      clubName: parsed.data.clubName ?? null,
    },
  });

  return NextResponse.json(squad, { status: 201 });
}
