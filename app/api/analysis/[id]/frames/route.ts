import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { canViewUser } from "@/lib/rbac";
import type { FrameManifestEntry } from "@/src/lib/analysis/frame-persistence";

const idParamSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  // Match /api/analysis/[id]/pose: allow unauthenticated reads in local non-production
  if (!user && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paramResult = idParamSchema.safeParse(await params);
  if (!paramResult.success) {
    return NextResponse.json(
      { error: "Invalid analysis ID", details: paramResult.error.flatten() },
      { status: 400 }
    );
  }

  const { id } = paramResult.data;
  const analysis = await prisma.analysis.findUnique({
    where: { id },
    include: {
      video: { select: { userId: true } },
    },
  });

  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  if (user && !canViewUser(user.id, user.role, analysis.video.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!analysis.frameManifest) {
    return NextResponse.json(
      { error: "Frame gallery unavailable for this analysis" },
      { status: 404 }
    );
  }

  const manifest = analysis.frameManifest as FrameManifestEntry[];
  return NextResponse.json(
    {
      analysisId: id,
      frames: manifest.map((f) => ({
        index: f.index,
        timestampMs: f.timestampMs,
        url: `/api/analysis/${id}/frames/${f.index}`,
      })),
    },
    { headers: { "Cache-Control": "private, max-age=60" } }
  );
}
