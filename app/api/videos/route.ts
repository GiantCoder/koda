import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import {
  getVisibleUserIds,
  videoVisibilityWhere,
} from "@/src/lib/videos/access";
import { processingStateFromAnalysisStatus } from "@/app/lib/uploads-display";

const SORT_FIELDS = ["uploadedAt", "filename", "fileSizeBytes", "durationSeconds"] as const;
type SortField = (typeof SORT_FIELDS)[number];

function mapVideoRow(v: {
  id: string;
  userId: string;
  filename: string;
  originalFormat: string;
  fileSizeBytes: bigint;
  durationSeconds: number | null;
  resolutionWidth: number | null;
  resolutionHeight: number | null;
  uploadedAt: Date;
  cdnUrl: string | null;
  user: { displayName: string };
  analysis: {
    id: string;
    status: string;
    errorMessage: string | null;
    updatedAt: Date;
    shotType: string | null;
    gradeLetter: string | null;
    gradeOverall: number | null;
  } | null;
}) {
  const processingState = processingStateFromAnalysisStatus(v.analysis?.status);
  return {
    id: v.id,
    userId: v.userId,
    filename: v.filename,
    originalFormat: v.originalFormat,
    fileSizeBytes: BigInt.prototype.toString.call(v.fileSizeBytes),
    durationSeconds: v.durationSeconds,
    resolutionWidth: v.resolutionWidth,
    resolutionHeight: v.resolutionHeight,
    uploadedAt: v.uploadedAt.toISOString(),
    cdnUrl: v.cdnUrl,
    thumbnailUrl: `/api/videos/${v.id}/stream`,
    assignedUserDisplayName: v.user.displayName,
    analysis: v.analysis
      ? {
          id: v.analysis.id,
          status: v.analysis.status,
          errorMessage: v.analysis.errorMessage,
          updatedAt: v.analysis.updatedAt.toISOString(),
          shotType: v.analysis.shotType,
          gradeLetter: v.analysis.gradeLetter,
          gradeOverall: v.analysis.gradeOverall,
        }
      : null,
    processingState,
  };
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(params.get("pageSize") ?? params.get("limit") ?? "20") || 20)
  );
  const sortRaw = params.get("sort") ?? "uploadedAt";
  const sort: SortField = SORT_FIELDS.includes(sortRaw as SortField)
    ? (sortRaw as SortField)
    : "uploadedAt";
  const order = params.get("order") === "asc" ? "asc" : "desc";
  const statusFilter = params.get("status") ?? "all";
  const search = (params.get("search") ?? "").trim();

  const visible = await getVisibleUserIds(user);
  const baseWhere = videoVisibilityWhere(user, visible);

  const videos = await prisma.video.findMany({
    where: baseWhere,
    select: {
      id: true,
      analysis: { select: { status: true } },
    },
  });

  let filteredIds = videos.map((v) => v.id);
  if (statusFilter !== "all") {
    filteredIds = videos
      .filter((v) => processingStateFromAnalysisStatus(v.analysis?.status) === statusFilter)
      .map((v) => v.id);
  }

  if (filteredIds.length === 0) {
    return NextResponse.json({
      videos: [],
      pagination: { page, pageSize, total: 0, totalPages: 0 },
    });
  }

  const whereClause = {
    ...baseWhere,
    id: { in: filteredIds },
    ...(search
      ? {
          filename: {
            contains: search,
            mode: "insensitive" as const,
          },
        }
      : {}),
  };

  const total = await prisma.video.count({ where: whereClause });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const rows = await prisma.video.findMany({
    where: whereClause,
    orderBy: { [sort]: order },
    skip: (safePage - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      userId: true,
      filename: true,
      originalFormat: true,
      fileSizeBytes: true,
      durationSeconds: true,
      resolutionWidth: true,
      resolutionHeight: true,
      uploadedAt: true,
      cdnUrl: true,
      user: { select: { displayName: true } },
      analysis: {
        select: {
          id: true,
          status: true,
          errorMessage: true,
          updatedAt: true,
          shotType: true,
          gradeLetter: true,
          gradeOverall: true,
        },
      },
    },
  });

  return NextResponse.json({
    videos: rows.map(mapVideoRow),
    pagination: {
      page: safePage,
      pageSize,
      total,
      totalPages,
    },
  });
}
