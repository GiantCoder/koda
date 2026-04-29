import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Role } from "@prisma/client";
import { Queue } from "bullmq";
import { prisma } from "@/prisma/client";
import { uploadToStorage } from "@/src/lib/storage";
import { getAuthUser } from "@/lib/get-auth-user";

const queueConnection = {
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
};

/**
 * Shadow Batting upload endpoint.
 * Stores the recording and enqueues the same video-processing → analysis pipeline as dashboard uploads
 * (FFmpeg probe → frame extract → MediaPipe → Gemini).
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const shotTypeRaw = formData.get("shotType") as string | null;
    const durationRaw = formData.get("duration") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!shotTypeRaw) {
      return NextResponse.json(
        { error: "Shot type is required" },
        { status: 400 }
      );
    }

    const authUser = await getAuthUser(request);
    const fallbackUser = authUser
      ? null
      : await prisma.user.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });
    let userId = authUser?.id ?? fallbackUser?.id;

    if (!userId && process.env.NODE_ENV !== "production") {
      const headerRoleRaw = request.headers.get("x-auth-role")?.toUpperCase() ?? "";
      const role =
        headerRoleRaw === "PLAYER" ||
        headerRoleRaw === "PARENT" ||
        headerRoleRaw === "COACH" ||
        headerRoleRaw === "ADMIN"
          ? (headerRoleRaw as Role)
          : Role.COACH;

      const generatedEmail = `shadow-batting+${Date.now()}@local.koda`;
      const seededUser = await prisma.user.create({
        data: {
          email: generatedEmail,
          role,
          displayName: "Shadow Batting Test User",
        },
        select: { id: true },
      });
      userId = seededUser.id;
    }

    if (!userId) {
      return NextResponse.json(
        { error: "No active user available" },
        { status: 500 }
      );
    }

    const uploadId = randomUUID();
    let storagePath = `shadow-batting/${userId}/${uploadId}/${file.name}`;
    let storageWarning: string | null = null;
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    try {
      await uploadToStorage(storagePath, fileBuffer, file.type || "video/webm");
    } catch (error) {
      storageWarning =
        error instanceof Error ? error.message : "Storage upload failed";
      storagePath = `shadow-batting/local-fallback/${userId}/${uploadId}/${file.name}`;
      console.warn("Shadow batting storage fallback:", storageWarning);
    }

    const durationSeconds = durationRaw ? parseFloat(durationRaw) : null;

    const [video, analysis] = await prisma.$transaction(async (tx) => {
      const createdVideo = await tx.video.create({
        data: {
          userId,
          filename: file.name,
          originalFormat: file.name.split(".").pop() ?? "webm",
          storagePath,
          fileSizeBytes: BigInt(file.size),
          durationSeconds: Number.isFinite(durationSeconds ?? NaN) ? durationSeconds : null,
        },
        select: {
          id: true,
        },
      });

      const createdAnalysis = await tx.analysis.create({
        data: {
          videoId: createdVideo.id,
          status: "QUEUED",
          playerDeclaredShotType: shotTypeRaw,
        },
        select: {
          id: true,
        },
      });

      return [createdVideo, createdAnalysis] as const;
    });

    const videoQueue = new Queue("video-processing", {
      connection: queueConnection,
    });

    await videoQueue.add("video.process", {
      videoId: video.id,
      userId,
      analysisId: analysis.id,
    });

    return NextResponse.json({
      id: video.id,
      analysisId: analysis.id,
      status: "QUEUED",
      async: true,
      warning: storageWarning,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
