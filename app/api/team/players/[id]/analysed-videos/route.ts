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
  // Treat null/unclear/other gate results as batting so we don't hide videos.
  return "batting";
}

function activityWhereForCategory(category: VideoCategory) {
  switch (category) {
    case "bowling":
      return { activityType: "BOWLING" as const };
    case "fielding":
      return { activityType: "FIELDING" as const };
    case "keeping":
      return { activityType: "KEEPING" as const };
    case "batting":
      return {
        OR: [{ activityType: null }, { activityType: { in: ["BATTING", "UNCLEAR"] } }],
      } as const;
    default:
      return {};
  }
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
  const page = Math.max(1, Number(sp.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(1, Number(sp.get("pageSize") ?? "10") || 10));
  const search = (sp.get("search") ?? "").trim();
  const categoryRaw = (sp.get("category") ?? "all").toLowerCase();
  const sortRaw = (sp.get("sort") ?? "uploadedAt").toLowerCase();
  const order = sp.get("order") === "asc" ? "asc" : "desc";

  const category: "all" | VideoCategory =
    categoryRaw === "all"
      ? "all"
      : categoryRaw === "batting" || categoryRaw === "bowling" || categoryRaw === "fielding" || categoryRaw === "keeping"
        ? (categoryRaw as VideoCategory)
        : "all";

  const sort: "uploadedAt" | "filename" | "gradeOverall" =
    sortRaw === "filename" || sortRaw === "gradeoverall" ? (sortRaw === "filename" ? "filename" : "gradeOverall") : "uploadedAt";

  const baseWhere = {
    status: "COMPLETE" as const,
    video: {
      userId: playerId,
      isDeleted: false,
      ...(search
        ? {
            filename: {
              contains: search,
              mode: "insensitive" as const,
            },
          }
        : {}),
    },
  };

  const whereClause =
    category === "all"
      ? baseWhere
      : {
          ...baseWhere,
          ...activityWhereForCategory(category),
        };

  const total = await prisma.analysis.count({ where: whereClause });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const orderBy =
    sort === "uploadedAt"
      ? ({ video: { uploadedAt: order } } as const)
      : sort === "filename"
        ? ({ video: { filename: order } } as const)
        : ({ gradeOverall: order } as const);

  const rows = await prisma.analysis.findMany({
    where: whereClause,
    orderBy,
    skip: (safePage - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      gradeOverall: true,
      gradeLetter: true,
      activityType: true,
      video: {
        select: {
          id: true,
          filename: true,
          uploadedAt: true,
        },
      },
      _count: {
        select: { annotations: true },
      },
    },
  });

  const videos = rows.map((r) => {
    const categoryForVideo = categoryFromActivity(r.activityType);
    return {
      id: r.video.id,
      analysisId: r.id,
      filename: r.video.filename,
      uploadedAt: r.video.uploadedAt.toISOString(),
      thumbnailUrl: `/api/videos/${r.video.id}/stream`,
      category: categoryForVideo,
      gradeLetter: r.gradeLetter,
      gradeOverall: r.gradeOverall,
      commentCount: r._count.annotations,
    };
  });

  return NextResponse.json({
    videos,
    pagination: {
      page: safePage,
      pageSize,
      total,
      totalPages,
    },
  });
}

