import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { analysisCreateSchema } from "./schema";
import { Queue } from "bullmq";

const queueConnection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };
const analysisQueue = new Queue("analysis", { connection: queueConnection });

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const validation = analysisCreateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const { videoId } = validation.data;

  const video = await prisma.video.findFirst({
    where: { id: videoId, userId: user.id, isDeleted: false },
  });

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const existing = await prisma.analysis.findUnique({
    where: { videoId },
  });

  if (existing) {
    return NextResponse.json(
      {
        id: existing.id,
        videoId: existing.videoId,
        status: existing.status,
        message: "Analysis already exists for this video",
      },
      { status: 200 }
    );
  }

  const analysis = await prisma.analysis.create({
    data: {
      videoId,
      status: "QUEUED",
    },
  });

  await analysisQueue.add("analysis.pipeline", {
    videoId,
    userId: user.id,
    analysisId: analysis.id,
  });

  return NextResponse.json({
    id: analysis.id,
    videoId: analysis.videoId,
    status: analysis.status,
    createdAt: analysis.createdAt,
  });
}
