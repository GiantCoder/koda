import { NextRequest, NextResponse } from "next/server";

const STAGES = [
  "upload_complete",
  "extracting_frames",
  "pose_analysis",
  "shot_classification",
  "generating_feedback",
  "complete",
] as const;

/**
 * Mock analysis status endpoint.
 * In production, this would read from DB/queue.
 * For demo: returns incremental progress based on request count (stored in cookie or query).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  // Simulate pipeline progress: each poll advances one stage (for demo)
  const stageIndex = Math.min(
    Math.floor(Math.random() * 2) + 2, // Random-ish for demo variety
    STAGES.length - 1
  );
  const stage = STAGES[stageIndex];
  const progress = Math.round((stageIndex / (STAGES.length - 1)) * 100);
  const estimatedSecondsRemaining = stage === "complete" ? 0 : (STAGES.length - 1 - stageIndex) * 15;

  return NextResponse.json({
    id,
    stage,
    progress,
    estimatedSecondsRemaining,
    error: null,
  });
}
