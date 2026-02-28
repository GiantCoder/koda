import { NextRequest, NextResponse } from "next/server";
import { userSchema } from "../schema";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { canViewUser } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!canViewUser(authUser.id, authUser.role, id)) {
    return NextResponse.json(
      { error: "Forbidden - insufficient permissions to view this user" },
      { status: 403 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user)
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );

  return NextResponse.json(user);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const validation = userSchema.safeParse(body);
  if (!validation.success)
    return NextResponse.json(validation.error.issues, {
      status: 400,
    });

  const user = await prisma.user.findUnique({
    where: { id }
  });

  if (!user)
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: body.name,
      email: body.email
    }
  })

  return NextResponse.json(updatedUser);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id }
  })
  
  if (!user)
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );

  await prisma.user.delete({ 
    where: { id: user.id }
  });

  return NextResponse.json({});
}