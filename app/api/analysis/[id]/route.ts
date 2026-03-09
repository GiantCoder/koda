import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { z } from "zod";

const idParamSchema = z.object({
  id: z.string().uuid(),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser(request);
  
  const parsedParams = idParamSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid analysis ID" },
      { status: 400 }
    );
  }

  const analysisId = parsedParams.data.id;

  // Find the analysis and its associated video
  const analysis = await prisma.analysis.findUnique({
    where: { id: analysisId },
    include: {
      video: {
        select: {
          id: true,
          userId: true,
        },
      },
    },
  });

  if (!analysis) {
    return NextResponse.json(
      { error: "Analysis not found" },
      { status: 404 }
    );
  }

  // Authorization check: user must own the video
  if (authUser && analysis.video.userId !== authUser.id) {
    // Check if user is a coach with access to this player
    if (authUser.role === "COACH") {
      const hasAccess = await prisma.squadMember.findFirst({
        where: {
          userId: analysis.video.userId,
          squad: { coachId: authUser.id },
        },
        select: { id: true },
      });

      if (!hasAccess) {
        return NextResponse.json(
          { error: "Forbidden: You don't have access to this analysis" },
          { status: 403 }
        );
      }
    } else if (authUser.role === "PARENT") {
      // Check if user is a parent of this player
      const hasAccess = await prisma.guardianLink.findFirst({
        where: {
          parentId: authUser.id,
          childId: analysis.video.userId,
        },
        select: { id: true },
      });

      if (!hasAccess) {
        return NextResponse.json(
          { error: "Forbidden: You don't have access to this analysis" },
          { status: 403 }
        );
      }
    } else if (authUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: You don't have access to this analysis" },
        { status: 403 }
      );
    }
  }

  // Soft delete the analysis
  await prisma.analysis.update({
    where: { id: analysisId },
    data: {
      status: "FAILED",
      errorMessage: "Deleted by user",
    },
  });

  return NextResponse.json({
    message: "Analysis deleted successfully",
  });
}
