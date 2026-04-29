import { Worker, type Job } from "bullmq";
import { Queue } from "bullmq";
import { prisma } from "@/prisma/client";
import Redis from "ioredis";
import { downloadFromStorage } from "@/src/lib/storage";
import {
  probeVideoFile,
  removeTempPath,
  writeTempVideoFile,
} from "@/src/lib/analysis/video-frames";

interface VideoJobData {
  videoId: string;
  userId: string;
  analysisId?: string;
}

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };
const analysisQueue = new Queue("analysis", { connection });
const redisPublisher = new Redis(connection.url, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableReadyCheck: true,
  lazyConnect: false,
});

redisPublisher.on("error", (err) => {
  console.error("Redis connection error:", err.message);
});

redisPublisher.on("connect", () => {
  console.log("Redis publisher connected");
});

export const videoWorker = new Worker<VideoJobData>(
  "video-processing",
  async (job: Job<VideoJobData>) => {
    const { videoId, userId, analysisId: queuedAnalysisId } = job.data;
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, userId: true, storagePath: true, originalFormat: true },
    });
    if (!video || video.userId !== userId) {
      throw new Error("Video not found or ownership mismatch");
    }

    const bucket = process.env.STORAGE_BUCKET_VIDEOS ?? "koda-videos";
    const cdnUrl = `${process.env.STORAGE_PUBLIC_URL ?? "http://localhost:9000"}/${bucket}/${video.storagePath}`;

    let durationSeconds = 12.4;
    let resolutionWidth = 1920;
    let resolutionHeight = 1080;

    const ext = (video.originalFormat || "mp4").replace(/[^a-z0-9]/gi, "") || "mp4";
    let tempPath: string | null = null;
    try {
      const buffer = await downloadFromStorage(video.storagePath);
      tempPath = await writeTempVideoFile(buffer, ext);
      const probe = await probeVideoFile(tempPath);
      if (probe.durationSeconds > 0) {
        durationSeconds = probe.durationSeconds;
      }
      if (probe.width > 0 && probe.height > 0) {
        resolutionWidth = probe.width;
        resolutionHeight = probe.height;
      }
      console.log(
        `[videoWorker] probed video ${videoId}: ${durationSeconds.toFixed(2)}s ${resolutionWidth}x${resolutionHeight}`
      );
    } catch (err) {
      console.warn(
        `[videoWorker] ffprobe/download skipped for ${videoId}, using defaults:`,
        err instanceof Error ? err.message : err
      );
    } finally {
      if (tempPath) {
        await removeTempPath(tempPath);
      }
    }

    await prisma.video.update({
      where: { id: videoId },
      data: {
        cdnUrl,
        durationSeconds,
        resolutionWidth,
        resolutionHeight,
      },
    });

    const analysisCreateData = queuedAnalysisId
      ? { id: queuedAnalysisId, videoId, status: "QUEUED" as const }
      : { videoId, status: "QUEUED" as const };

    const analysis = await prisma.analysis.upsert({
      where: { videoId },
      update: {
        status: "QUEUED",
        errorMessage: null,
        startedAt: null,
        completedAt: null,
      },
      create: analysisCreateData,
      select: { id: true },
    });

    await redisPublisher.publish(
      `analysis:${analysis.id}`,
      JSON.stringify({
        stage: "QUEUED",
        progress: 5,
        message: "Video ready for analysis",
      })
    );

    await analysisQueue.add("analysis.pipeline", {
      videoId,
      userId,
      analysisId: analysis.id,
    });
  },
  { connection, concurrency: 3 }
);
