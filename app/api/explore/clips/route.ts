import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { z } from "zod";

const querySchema = z.object({
  search: z.string().optional(),
  shotType: z.string().optional(),
  sort: z.enum(["recent", "top_rated", "most_viewed"]).optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const parsed = querySchema.safeParse({
    search: searchParams.get("search") ?? undefined,
    shotType: searchParams.get("shotType") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { search, shotType, sort = "recent", limit = "20", offset = "0" } = parsed.data;
  const take = Math.min(parseInt(limit, 10), 100);
  const skip = parseInt(offset, 10);

  // Build where clause for public videos with completed analysis
  const where: {
    isDeleted: boolean;
    analysis: {
      status: "COMPLETE";
      shotType?: string;
    };
    filename?: {
      contains: string;
    };
  } = {
    isDeleted: false,
    analysis: {
      status: "COMPLETE",
    },
  };

  // Add search filter
  if (search) {
    where.filename = {
      contains: search,
    };
  }

  // Add shot type filter
  if (shotType && shotType !== "all") {
    where.analysis = {
      ...where.analysis,
      shotType: shotType.toUpperCase().replace(/ /g, "_"),
    };
  }

  // Determine sort order
  let orderBy:
    | { uploadedAt: "desc" }
    | {
        analysis: {
          gradeOverall: "desc";
        };
      } = { uploadedAt: "desc" };
  if (sort === "top_rated") {
    orderBy = { analysis: { gradeOverall: "desc" } };
  } else if (sort === "most_viewed") {
    // For now, use uploadedAt as proxy for views
    orderBy = { uploadedAt: "desc" };
  }

  try {
    const [clips, total] = await Promise.all([
      prisma.video.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
            },
          },
          analysis: {
            select: {
              id: true,
              shotType: true,
              shotConfidence: true,
              gradeOverall: true,
              gradeLetter: true,
              completedAt: true,
            },
          },
        },
        orderBy,
        take,
        skip,
      }),
      prisma.video.count({ where }),
    ]);

    const formattedClips = clips.map((clip) => ({
      id: clip.id,
      title: clip.filename,
      description: `${clip.analysis?.shotType?.replace(/_/g, " ") || "Unknown"} shot`,
      thumbnail: `/api/videos/${clip.id}/thumbnail`,
      duration: clip.durationSeconds,
      grade: clip.analysis?.gradeLetter || "N/A",
      gradeScore: clip.analysis?.gradeOverall || 0,
      shotType: clip.analysis?.shotType || "UNKNOWN",
      views: 124, // Mock for now
      likes: 37, // Mock for now
      uploadedBy: clip.user.displayName,
      uploadedById: clip.user.id,
      uploadedAt: clip.uploadedAt.toISOString(),
    }));

    return NextResponse.json({
      clips: formattedClips,
      total,
      hasMore: skip + take < total,
    });
  } catch (error) {
    console.error("Error fetching explore clips:", error);
    return NextResponse.json(
      { error: "Failed to fetch clips" },
      { status: 500 }
    );
  }
}
