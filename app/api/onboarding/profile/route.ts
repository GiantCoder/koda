import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { profileUpdateSchema } from "../schema";
import { getAuthUser } from "@/lib/get-auth-user";

export async function PUT(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const validation = profileUpdateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const data = validation.data;
  const update: Record<string, unknown> = {};
  if (data.displayName !== undefined) update.displayName = data.displayName;
  if (data.firstName !== undefined) update.firstName = data.firstName;
  if (data.lastName !== undefined) update.lastName = data.lastName;
  if (data.clubOrSchool !== undefined) update.clubOrSchool = data.clubOrSchool;
  if (data.primaryPosition !== undefined)
    update.primaryPosition = data.primaryPosition;
  if (data.battingStyle !== undefined) update.battingStyle = data.battingStyle;
  if (data.bowlingStyle !== undefined) update.bowlingStyle = data.bowlingStyle;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: update,
    select: {
      id: true,
      displayName: true,
      firstName: true,
      lastName: true,
      clubOrSchool: true,
      primaryPosition: true,
      battingStyle: true,
      bowlingStyle: true,
    },
  });

  return NextResponse.json(updated);
}
