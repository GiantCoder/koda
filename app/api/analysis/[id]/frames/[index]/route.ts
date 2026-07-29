import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { canViewUser } from "@/lib/rbac";
import { downloadFromStorage } from "@/src/lib/storage";
import type { FrameManifestEntry } from "@/src/lib/analysis/frame-persistence";

const paramsSchema = z.object({
  id: z.string().uuid(),
  index: z
    .string()
    .regex(/^\d+$/, "Frame index must be a non-negative integer")
    .transform((v) => Number(v))
    .refine((n) => Number.isInteger(n) && n >= 0, {
      message: "Frame index must be a non-negative integer",
    }),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  const user = await getAuthUser(request);
  if (!user && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paramResult = paramsSchema.safeParse(await params);
  if (!paramResult.success) {
    return NextResponse.json(
      { error: "Invalid parameters", details: paramResult.error.flatten() },
      { status: 400 }
    );
  }

  const { id, index: idx } = paramResult.data;
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
  const entry = manifest.find((f) => f.index === idx);
  if (!entry) {
    return NextResponse.json({ error: "Frame not found" }, { status: 404 });
  }

  try {
    const buffer = await downloadFromStorage(entry.storageKey);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load frame" },
      { status: 500 }
    );
  }
}
