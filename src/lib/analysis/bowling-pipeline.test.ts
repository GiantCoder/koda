import { describe, expect, it, vi } from "vitest";
import { runBowlingAnalysisBranch } from "./bowling-pipeline";
import type { ActivityClassificationResult } from "@/src/lib/llm/activityClassification";

vi.mock("@/src/lib/storage", () => ({
  uploadToStorage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/src/lib/analysis/video-frames", () => ({
  removeTempPath: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/src/lib/analysis/pipeline-log", () => ({
  logMediaPipeOutcome: vi.fn(),
  logPoseSummaryForLlm: vi.fn(),
}));

describe("runBowlingAnalysisBranch", () => {
  it("uses raw pose and does not call batting masking / far-end ROI helpers", async () => {
    const assessPoseTrackingSubject = vi.fn();
    const maskForegroundSubjectInFrames = vi.fn();
    const cropFramesToFarEndBatterRoi = vi.fn();
    const estimatePoseFromFrames = vi.fn().mockResolvedValue({
      landmarks: [{ frameIndex: 0, points: [] }],
      batsman_bbox: null,
      processingMs: 12,
    });
    const buildPoseSummaryForLlm = vi.fn().mockReturnValue("pose summary");
    const classifyBowlingActionWithGemini = vi.fn().mockResolvedValue({
      bowlingArm: "RIGHT_ARM",
      bowlingType: "PACE",
      deliveryType: "YORKER",
      confidence: 0.9,
      reasons: ["clear action"],
      noBowlerVisible: false,
      rawResponseText: "{}",
    });
    const scoreBowlingBiomechanicsWithGemini = vi.fn().mockResolvedValue({
      scores: [70, 72, 74, 76, 78, 80, 82, 84],
      rawResponseText: "{}",
    });

    const prismaUpdate = vi.fn().mockResolvedValue({});
    const publishStage = vi.fn().mockResolvedValue(undefined);

    const activityResult: ActivityClassificationResult = {
      activityType: "BOWLING",
      hasBatterWithBat: false,
      confidence: 0.1,
      isBatting: false,
      bowlerActionVisible: true,
      bowlingConfidence: 0.9,
      isBowling: true,
      reasons: ["bowling action"],
      rawResponseText: "{}",
    };

    const outcome = await runBowlingAnalysisBranch({
      analysisId: "an-1",
      videoId: "vid-1",
      framesBase64: ["f1", "f2"],
      width: 640,
      height: 360,
      sampleFps: 8,
      filename: "bowl.mp4",
      durationSeconds: 3,
      activityResult,
      pipelineStart: Date.now() - 100,
      tempPath: null,
      prisma: { analysis: { update: prismaUpdate } },
      publishStage,
      deps: {
        estimatePoseFromFrames,
        buildPoseSummaryForLlm,
        classifyBowlingActionWithGemini,
        scoreBowlingBiomechanicsWithGemini,
        assessPoseTrackingSubject,
        maskForegroundSubjectInFrames,
        cropFramesToFarEndBatterRoi,
      },
    });

    expect(outcome.status).toBe("COMPLETE");
    expect(estimatePoseFromFrames).toHaveBeenCalledTimes(1);
    expect(buildPoseSummaryForLlm).toHaveBeenCalledTimes(1);
    expect(classifyBowlingActionWithGemini).toHaveBeenCalledTimes(1);
    expect(scoreBowlingBiomechanicsWithGemini).toHaveBeenCalledTimes(1);
    expect(assessPoseTrackingSubject).not.toHaveBeenCalled();
    expect(maskForegroundSubjectInFrames).not.toHaveBeenCalled();
    expect(cropFramesToFarEndBatterRoi).not.toHaveBeenCalled();

    const completeUpdate = prismaUpdate.mock.calls.find(
      (call) => (call[0] as { data?: { status?: string } }).data?.status === "COMPLETE"
    );
    expect(completeUpdate).toBeTruthy();
    const data = (completeUpdate![0] as { data: Record<string, unknown> }).data;
    expect(data.activityType).toBe("BOWLING");
    expect(data.bowlingArm).toBe("RIGHT_ARM");
    expect(data.deliveryType).toBe("YORKER");
    expect(data.scoreRunUpRhythm).toBe(70);
    expect(data.scoreBalance).toBe(84);
  });
});
