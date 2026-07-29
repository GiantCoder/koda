import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";

const idParamSchema = z.object({
  id: z.string().uuid(),
});

type VideoCategory = "batting" | "bowling" | "fielding" | "keeping";

function categoryFromActivity(activityType: string | null): VideoCategory {
  if (activityType === "BOWLING") return "bowling";
  if (activityType === "FIELDING") return "fielding";
  if (activityType === "KEEPING") return "keeping";
  return "batting";
}

async function canCoachManagePlayer(coachId: string, playerId: string): Promise<boolean> {
  const membership = await prisma.squadMember.findFirst({
    where: {
      userId: playerId,
      squad: { coachId },
    },
    select: { id: true },
  });
  return Boolean(membership);
}

async function canParentManagePlayer(parentId: string, playerId: string): Promise<boolean> {
  const link = await prisma.guardianLink.findFirst({
    where: {
      parentId,
      childId: playerId,
    },
    select: { id: true },
  });
  return Boolean(link);
}

async function authorizeTeamPlayerAccess(request: NextRequest, playerId: string) {
  const authUser = await getAuthUser(request);
  if (!authUser) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const existingPlayer = await prisma.user.findUnique({
    where: { id: playerId },
    select: { id: true, role: true, isActive: true },
  });

  if (!existingPlayer || existingPlayer.role !== "PLAYER" || !existingPlayer.isActive) {
    return { error: NextResponse.json({ error: "Player not found" }, { status: 404 }) };
  }

  if (authUser.role === "COACH") {
    const allowed = await canCoachManagePlayer(authUser.id, playerId);
    if (!allowed) {
      return {
        error: NextResponse.json(
          { error: "Forbidden: Player is not in your squads" },
          { status: 403 }
        ),
      };
    }
  } else if (authUser.role === "PARENT") {
    const allowed = await canParentManagePlayer(authUser.id, playerId);
    if (!allowed) {
      return {
        error: NextResponse.json(
          { error: "Forbidden: Player is not linked to your account" },
          { status: 403 }
        ),
      };
    }
  } else if (authUser.role !== "ADMIN" && authUser.id !== playerId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { authUser };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const parsedParams = idParamSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid player id" }, { status: 400 });
  }
  const playerId = parsedParams.data.id;

  const authz = await authorizeTeamPlayerAccess(request, playerId);
  if ("error" in authz) return authz.error;

  const sp = request.nextUrl.searchParams;
  const limit = Math.min(200, Math.max(1, Number(sp.get("limit") ?? "100") || 100));

  const rows = await prisma.analysis.findMany({
    where: {
      status: "COMPLETE",
      video: { userId: playerId, isDeleted: false },
    },
    orderBy: { video: { uploadedAt: "asc" } },
    take: limit,
    select: {
      id: true,
      gradeOverall: true,
      gradeLetter: true,
      activityType: true,
      video: {
        select: {
          id: true,
          uploadedAt: true,
        },
      },
    },
  });

  const points = rows.map((r) => ({
    analysisId: r.id,
    videoId: r.video.id,
    uploadedAt: r.video.uploadedAt.toISOString(),
    category: categoryFromActivity(r.activityType),
    gradeLetter: r.gradeLetter,
    gradeOverall: r.gradeOverall,
  }));

  return NextResponse.json({ points });
}

