import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";

const STAGES = [
  "upload_complete",
  "extracting_frames",
  "pose_analysis",
  "shot_classification",
  "generating_feedback",
  "complete",
] as const;

type ApiStage = (typeof STAGES)[number] | "failed";

function mapDbStatusToStage(dbStatus: string): ApiStage {
  switch (dbStatus) {
    case "QUEUED":
      return "upload_complete";
    case "EXTRACTING_FRAMES":
      return "extracting_frames";
    case "POSE_ANALYSIS":
      return "pose_analysis";
    case "SHOT_CLASSIFICATION":
      return "shot_classification";
    case "GENERATING_FEEDBACK":
      return "generating_feedback";
    case "COMPLETE":
      return "complete";
    case "FAILED":
      return "failed";
    default:
      return "upload_complete";
  }
}

function progressForStage(stage: ApiStage): number {
  switch (stage) {
    case "upload_complete":
      return 10;
    case "extracting_frames":
      return 30;
    case "pose_analysis":
      return 50;
    case "shot_classification":
      return 70;
    case "generating_feedback":
      return 90;
    case "complete":
      return 100;
    case "failed":
      return 100;
    default:
      return 0;
  }
}

/**
 * Mock analysis status endpoint.
 * Uses persisted analysis status when available with mock fallback.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const persistedAnalysis =
    (await prisma.analysis.findUnique({ where: { id } })) ??
    (await prisma.analysis.findUnique({ where: { videoId: id } }));

  if (persistedAnalysis) {
    const mappedStage = mapDbStatusToStage(persistedAnalysis.status);
    const progress = progressForStage(mappedStage);
    const estimatedSecondsRemaining =
      mappedStage === "complete" || mappedStage === "failed"
        ? 0
        : Math.max(10, Math.round((100 - progress) * 0.6));

    return NextResponse.json({
      id: persistedAnalysis.videoId,
      stage: mappedStage,
      progress,
      estimatedSecondsRemaining,
      error: mappedStage === "failed" ? persistedAnalysis.errorMessage : null,
    });
  }

  // Deterministic mock progression so polling can reliably reach completion.
  // When id follows `vid_<epochMs>_<suffix>`, we derive progression from elapsed time.
  const idParts = id.split("_");
  const createdAtMs = Number(idParts[1]);
  const safeCreatedAtMs = Number.isFinite(createdAtMs)
    ? createdAtMs
    : Date.now() - 20_000;
  const elapsedMs = Math.max(0, Date.now() - safeCreatedAtMs);
  const stageDurationMs = 4_000;
  const stageIndex = Math.min(
    Math.floor(elapsedMs / stageDurationMs),
    STAGES.length - 1
  );
  const stage = STAGES[stageIndex];
  const progress = Math.round((stageIndex / (STAGES.length - 1)) * 100);
  const estimatedSecondsRemaining = stage === "complete"
    ? 0
    : (STAGES.length - 1 - stageIndex) * (stageDurationMs / 1000);

  return NextResponse.json({
    id,
    stage,
    progress,
    estimatedSecondsRemaining,
    error: null,
  });
}
