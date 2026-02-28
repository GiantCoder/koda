import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { updateSquadSchema } from "../schema";

function requireCoach(user: { id: string; role: string } | null):
  | { error: NextResponse }
  | { user: { id: string; role: string } } {
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (user.role !== "COACH" && user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden: Coach role required" }, { status: 403 }) };
  }
  return { user };
}

/** PUT /api/squads/:id - Update squad */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser(request);
  const coachCheck = requireCoach(authUser);
  if ("error" in coachCheck) return coachCheck.error;
  const { user } = coachCheck;

  const { id } = await params;

  const existing = await prisma.squad.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Squad not found" }, { status: 404 });
  }

  if (existing.coachId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Not your squad" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateSquadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.ageGroup !== undefined) data.ageGroup = parsed.data.ageGroup;
  if (parsed.data.clubName !== undefined) data.clubName = parsed.data.clubName;
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;

  const updated = await prisma.squad.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}
