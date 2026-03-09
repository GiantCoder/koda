import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { z } from "zod";

const createChildLinkSchema = z.object({
  childUserId: z.string().uuid(),
  relationship: z.string().min(2).max(60).optional(),
});

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.role !== "PARENT" && authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const links = await prisma.guardianLink.findMany({
    where: authUser.role === "ADMIN" ? undefined : { parentId: authUser.id },
    include: {
      parent: { select: { id: true, displayName: true, email: true } },
      child: {
        select: {
          id: true,
          displayName: true,
          email: true,
          role: true,
          isActive: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const children = links
    .filter((link) => link.child.role === "PLAYER" && link.child.isActive)
    .map((link) => ({
      parentId: link.parentId,
      parentName: link.parent.displayName,
      childId: link.childId,
      childName: link.child.displayName,
      childEmail: link.child.email,
      relationship: link.relationship,
      isVerified: link.isVerified,
      createdAt: link.createdAt,
    }));

  return NextResponse.json({ children });
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.role !== "PARENT" && authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsedBody = createChildLinkSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsedBody.error.flatten() },
      { status: 400 }
    );
  }

  const child = await prisma.user.findUnique({
    where: { id: parsedBody.data.childUserId },
    select: { id: true, role: true, isActive: true },
  });
  if (!child || child.role !== "PLAYER" || !child.isActive) {
    return NextResponse.json({ error: "Child player not found" }, { status: 404 });
  }

  try {
    const link = await prisma.guardianLink.create({
      data: {
        parentId: authUser.id,
        childId: child.id,
        relationship: parsedBody.data.relationship ?? "guardian",
      },
      include: {
        child: { select: { id: true, displayName: true, email: true } },
      },
    });
    return NextResponse.json(
      {
        childId: link.childId,
        childName: link.child.displayName,
        childEmail: link.child.email,
        relationship: link.relationship,
        isVerified: link.isVerified,
      },
      { status: 201 }
    );
  } catch (error) {
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2002") {
      return NextResponse.json(
        { error: "This child is already linked to your account" },
        { status: 409 }
      );
    }
    throw error;
  }
}
