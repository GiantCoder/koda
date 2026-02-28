import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { canViewUser } from "@/lib/rbac";
import { z } from "zod";

const idParamSchema = z.object({
  id: z.string().uuid(),
});

/**
 * GET /api/analysis/:id/report
 * MVP placeholder: PDF report generation not implemented.
 * Returns minimal JSON metadata; full PDF via Puppeteer in future.
 */
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
      { error: "Invalid analysis ID", details: paramResult.error.flatten() },
      { status: 400 }
    );
  }

  const { id } = paramResult.data;

  const analysis = await prisma.analysis.findUnique({
    where: { id },
    include: {
      video: {
        select: { userId: true, filename: true },
      },
    },
  });

  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  if (!canViewUser(user.id, user.role, analysis.video.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    analysisId: analysis.id,
    videoFilename: analysis.video.filename,
    status: "placeholder",
    message:
      "PDF report generation not yet implemented. Use report-generation BullMQ worker when available.",
    _links: {
      analysis: `/api/analysis/${analysis.id}`,
    },
  });
}
