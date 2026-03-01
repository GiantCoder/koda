import { NextRequest } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { z } from "zod";
import Redis from "ioredis";
import { canViewUser } from "@/lib/rbac";

const idParamSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const paramResult = idParamSchema.safeParse(await params);
  if (!paramResult.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid analysis ID",
        details: paramResult.error.flatten(),
      }),
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
    return new Response(JSON.stringify({ error: "Analysis not found" }), {
      status: 404,
    });
  }

  if (!canViewUser(user.id, user.role, analysis.video.userId)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });
  }

  const encoder = new TextEncoder();
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  const subscriber = new Redis(redisUrl);
  const channel = `analysis:${id}`;
  const initialEvent =
    analysis.status === "COMPLETE"
      ? { type: "complete", analysisId: id, redirectUrl: `/analysis/${analysis.videoId}` }
      : analysis.status === "FAILED"
        ? { type: "error", analysisId: id, message: analysis.errorMessage ?? "Analysis failed" }
        : { stage: analysis.status, progress: 10, message: "Analysis queued" };

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;
      const closeStream = async () => {
        if (isClosed) return;
        isClosed = true;
        clearTimeout(timeoutId);
        try {
          await subscriber.unsubscribe(channel);
        } catch {
          // ignore
        }
        try {
          await subscriber.quit();
        } catch {
          // ignore
        }
        controller.close();
      };

      const timeoutId = setTimeout(() => {
        controller.enqueue(
          encoder.encode(`event: timeout\ndata: ${JSON.stringify({ message: "Stream timeout" })}\n\n`)
        );
        void closeStream();
      }, 5 * 60 * 1000);

      subscriber.on("message", (_incomingChannel, message) => {
        controller.enqueue(encoder.encode(`event: stage\ndata: ${message}\n\n`));
        try {
          const payload = JSON.parse(message) as { type?: string };
          if (payload.type === "complete" || payload.type === "error") {
            void closeStream();
          }
        } catch {
          // keep stream alive if event payload is not JSON
        }
      });

      await subscriber.subscribe(channel);

      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({ analysisId: id, status: analysis.status })}\n\n`
        )
      );
      controller.enqueue(encoder.encode(`event: stage\ndata: ${JSON.stringify(initialEvent)}\n\n`));
    },
    async cancel() {
      await subscriber.unsubscribe(channel);
      await subscriber.quit();
    },
  });

  request.signal.addEventListener("abort", async () => {
    try {
      await subscriber.unsubscribe(channel);
      await subscriber.quit();
    } catch {
      // ignore teardown errors
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
