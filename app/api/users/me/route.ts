import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { profileUpdateSchema } from "../schema";

const safeUserSelect = {
  id: true,
  email: true,
  displayName: true,
  firstName: true,
  lastName: true,
  role: true,
  dateOfBirth: true,
  ageGroup: true,
  clubOrSchool: true,
  primaryPosition: true,
  battingStyle: true,
  bowlingStyle: true,
  profileVisibility: true,
  emailVerified: true,
  createdAt: true,
  lastLoginAt: true,
};

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: safeUserSelect,
  });

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(profile);
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
  if (data.profileVisibility !== undefined)
    update.profileVisibility = data.profileVisibility;

  const updated = await prisma.user.update({
    where: { id: authUser.id },
    data: update,
    select: safeUserSelect,
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Soft-delete: set isActive = false
  await prisma.user.update({
    where: { id: authUser.id },
    data: { isActive: false },
  });

  return NextResponse.json(
    { message: "Account deletion requested. Your account has been deactivated." },
    { status: 200 }
  );
}
