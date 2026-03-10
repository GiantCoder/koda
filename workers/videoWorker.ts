import { Worker, type Job } from "bullmq";
import { Queue } from "bullmq";
import { prisma } from "@/prisma/client";
import Redis from "ioredis";

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
      select: { id: true, userId: true, storagePath: true },
    });
    if (!video || video.userId !== userId) {
      throw new Error("Video not found or ownership mismatch");
    }

    // MVP fallback: emulate FFmpeg pipeline outputs.
    // In production this worker will download, transcode, thumbnail, and inspect metadata.
    const cdnUrl = `${process.env.STORAGE_PUBLIC_URL ?? "http://localhost:9000"}/${process.env.STORAGE_BUCKET_VIDEOS ?? "koda-videos"}/${video.storagePath}`;

    await prisma.video.update({
      where: { id: videoId },
      data: {
        cdnUrl,
        durationSeconds: 12.4,
        resolutionWidth: 1920,
        resolutionHeight: 1080,
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
