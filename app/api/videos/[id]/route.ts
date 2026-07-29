import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { canAccessVideo } from "@/src/lib/videos/access";
import { z } from "zod";
import { parseVideoTags, patchVideoSchema } from "./schema";

const idParamSchema = z.object({
  id: z.string().uuid(),
});

async function assertAssignablePlayer(
  authUser: { id: string; role: string },
  assigneeUserId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const assignee = await prisma.user.findUnique({
    where: { id: assigneeUserId },
    select: { id: true, role: true, isActive: true },
  });
  if (!assignee || !assignee.isActive || assignee.role !== "PLAYER") {
    return { ok: false, status: 404, error: "Assigned player not found" };
  }

  if (authUser.role === "ADMIN") {
    return { ok: true };
  }

  if (authUser.role === "COACH") {
    const membership = await prisma.squadMember.findFirst({
      where: {
        userId: assignee.id,
        squad: { coachId: authUser.id },
      },
      select: { id: true },
    });
    if (!membership) {
      return {
        ok: false,
        status: 403,
        error: "Forbidden: Player is not in your squad",
      };
    }
    return { ok: true };
  }

  if (authUser.role === "PARENT") {
    const link = await prisma.guardianLink.findFirst({
      where: { parentId: authUser.id, childId: assignee.id },
      select: { id: true },
    });
    if (!link) {
      return {
        ok: false,
        status: 403,
        error: "Forbidden: Assigned player is not linked to your account",
      };
    }
    return { ok: true };
  }

  if (authUser.role === "PLAYER") {
    if (assignee.id !== authUser.id) {
      return {
        ok: false,
        status: 403,
        error: "Forbidden: Players can only assign videos to themselves",
      };
    }
    return { ok: true };
  }

  return { ok: false, status: 403, error: "Forbidden" };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paramResult = idParamSchema.safeParse(await params);
  if (!paramResult.success) {
    return NextResponse.json(
      { error: "Invalid video ID", details: paramResult.error.flatten() },
      { status: 400 }
    );
  }

  const { id } = paramResult.data;

  const video = await prisma.video.findFirst({
    where: { id, isDeleted: false },
    select: {
      id: true,
      userId: true,
      filename: true,
      originalFormat: true,
      storagePath: true,
      cdnUrl: true,
      fileSizeBytes: true,
      durationSeconds: true,
      resolutionWidth: true,
      resolutionHeight: true,
      uploadedAt: true,
      tags: true,
      user: {
        select: {
          id: true,
          displayName: true,
          role: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  if (!(await canAccessVideo(user, video.userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { user: assignedUser, tags, ...rest } = video;
  const isPlayerAssignee = assignedUser.role === "PLAYER";

  return NextResponse.json({
    ...rest,
    fileSizeBytes: BigInt.prototype.toString.call(video.fileSizeBytes),
    tags: parseVideoTags(tags),
    assignedPlayer: isPlayerAssignee
      ? {
          id: assignedUser.id,
          displayName: assignedUser.displayName,
          avatarUrl: assignedUser.avatarUrl,
        }
      : null,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paramResult = idParamSchema.safeParse(await params);
  if (!paramResult.success) {
    return NextResponse.json(
      { error: "Invalid video ID", details: paramResult.error.flatten() },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = patchVideoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id } = paramResult.data;
  const video = await prisma.video.findFirst({
    where: { id, isDeleted: false },
    select: { id: true, userId: true },
  });

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  if (!(await canAccessVideo(user, video.userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data: { userId?: string; tags?: string[] } = {};

  if (parsed.data.assigneeUserId !== undefined) {
    if (parsed.data.assigneeUserId === null) {
      // Unassigned — park ownership on the acting coach/parent/admin.
      data.userId = user.id;
    } else {
      const check = await assertAssignablePlayer(user, parsed.data.assigneeUserId);
      if (!check.ok) {
        return NextResponse.json({ error: check.error }, { status: check.status });
      }
      data.userId = parsed.data.assigneeUserId;
    }
  }

  if (parsed.data.tags !== undefined) {
    data.tags = parsed.data.tags.map((t) => t.trim()).filter(Boolean);
  }

  const updated = await prisma.video.update({
    where: { id },
    data,
    select: {
      id: true,
      userId: true,
      tags: true,
      user: {
        select: {
          id: true,
          displayName: true,
          role: true,
          avatarUrl: true,
        },
      },
    },
  });

  const isPlayerAssignee = updated.user.role === "PLAYER";

  return NextResponse.json({
    id: updated.id,
    userId: updated.userId,
    tags: parseVideoTags(updated.tags),
    assignedPlayer: isPlayerAssignee
      ? {
          id: updated.user.id,
          displayName: updated.user.displayName,
          avatarUrl: updated.user.avatarUrl,
        }
      : null,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paramResult = idParamSchema.safeParse(await params);
  if (!paramResult.success) {
    return NextResponse.json(
      { error: "Invalid video ID", details: paramResult.error.flatten() },
      { status: 400 }
    );
  }

  const { id } = paramResult.data;

  const video = await prisma.video.findFirst({
    where: { id, isDeleted: false },
    select: { id: true, userId: true },
  });

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  if (!(await canAccessVideo(user, video.userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.video.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });

  return NextResponse.json({ success: true, message: "Video soft-deleted" });
}
