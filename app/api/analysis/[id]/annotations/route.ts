import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/get-auth-user";
import { prisma } from "@/prisma/client";
import { canViewUser } from "@/lib/rbac";

const createAnnotationSchema = z.object({
  timestampMs: z.number().int().nonnegative(),
  content: z.string().min(1),
  isPrivate: z.boolean().optional().default(false),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await params;
  const analysis = await prisma.analysis.findUnique({
    where: { id },
    include: { video: { select: { userId: true } } },
  });
  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found", code: "NOT_FOUND" }, { status: 404 });
  }
  if (!canViewUser(user.id, user.role, analysis.video.userId)) {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const annotations = await prisma.annotation.findMany({
    where: {
      analysisId: id,
      OR: [{ isPrivate: false }, { authorId: user.id }],
    },
    orderBy: { timestampMs: "asc" },
    select: {
      id: true,
      authorId: true,
      timestampMs: true,
      content: true,
      isPrivate: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    analysisId: id,
    annotations,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  if (user.role !== "COACH") {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body", code: "BAD_REQUEST" }, { status: 400 });
  }

  const parsed = createAnnotationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id } = await params;
  const analysis = await prisma.analysis.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found", code: "NOT_FOUND" }, { status: 404 });
  }

  const annotation = await prisma.annotation.create({
    data: {
      analysisId: id,
      authorId: user.id,
      timestampMs: parsed.data.timestampMs,
      content: parsed.data.content,
      isPrivate: parsed.data.isPrivate,
    },
    select: {
      id: true,
      analysisId: true,
      authorId: true,
      timestampMs: true,
      content: true,
      isPrivate: true,
      createdAt: true,
    },
  });

  return NextResponse.json(annotation, { status: 201 });
}
