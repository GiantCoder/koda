import { NextRequest } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { z } from "zod";

const idParamSchema = z.object({
  id: z.string().uuid(),
});

const SSE_STAGES = [
  { stage: "EXTRACTING_FRAMES", progress: 15, message: "Extracting key frames..." },
  { stage: "POSE_ANALYSIS", progress: 45, message: "Analysing body position..." },
  { stage: "SHOT_CLASSIFICATION", progress: 70, message: "Classifying shot type..." },
  { stage: "GENERATING_FEEDBACK", progress: 85, message: "Generating coaching tips..." },
] as const;

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

  if (analysis.video.userId !== user.id) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (const payload of SSE_STAGES) {
        controller.enqueue(
          encoder.encode(`event: stage\ndata: ${JSON.stringify(payload)}\n\n`)
        );
        await new Promise((r) => setTimeout(r, 800));
      }
      controller.enqueue(
        encoder.encode(
          `event: complete\ndata: ${JSON.stringify({ analysisId: id, redirectUrl: `/analysis/${id}` })}\n\n`
        )
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
