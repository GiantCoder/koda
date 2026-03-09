import { Queue, type Worker, type Job } from "bullmq";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import express from "express";
import { analysisWorker } from "./analysisWorker";
import { emailWorker } from "./emailWorker";
import { videoWorker } from "./videoWorker";
import Redis from "ioredis";

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };
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

const videoQueue = new Queue("video-processing", { connection });
const analysisQueue = new Queue("analysis", { connection });
const emailQueue = new Queue("email", { connection });

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/bullboard");

createBullBoard({
  queues: [
    new BullMQAdapter(videoQueue),
    new BullMQAdapter(analysisQueue),
    new BullMQAdapter(emailQueue),
  ],
  serverAdapter,
});

const app = express();
app.use("/bullboard", serverAdapter.getRouter());

const port = 3001;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`BullBoard running on http://localhost:${port}/bullboard`);
});

function attachWorkerErrorLogging(workerName: string, workerInstance: Worker) {
  workerInstance.on("failed", async (job: Job | undefined, error: Error) => {
    const analysisId = (job?.data as { analysisId?: string } | undefined)?.analysisId;
    if (analysisId) {
      await redisPublisher.publish(
        `analysis:${analysisId}`,
        JSON.stringify({
          type: "error",
          message: (error as Error).message,
          code: "WORKER_FAILED",
        })
      );
    }
    // eslint-disable-next-line no-console
    console.error(`[${workerName}] job failed`, error);
  });
}

attachWorkerErrorLogging("videoWorker", videoWorker);
attachWorkerErrorLogging("analysisWorker", analysisWorker);
attachWorkerErrorLogging("emailWorker", emailWorker);
