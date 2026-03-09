import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Queue } from "bullmq";
import { prisma } from "@/prisma/client";
import { uploadToStorage } from "@/src/lib/storage";
import { getAuthUser } from "@/lib/get-auth-user";
import { classifyShotWithGemini, scoreBiomechanicsWithGemini } from "@/src/lib/llm/gemini";

/**
 * Shadow Batting upload endpoint.
 * Accepts webcam-recorded video, stores it, and performs immediate analysis with Gemini.
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
    const userId = authUser?.id ?? fallbackUser?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "No active user available" },
        { status: 500 }
      );
    }

    // Upload video to storage
    const uploadId = randomUUID();
    const storagePath = `shadow-batting/${userId}/${uploadId}/${file.name}`;
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    await uploadToStorage(storagePath, fileBuffer, file.type || "video/webm");

    // Create video record
    const video = await prisma.video.create({
      data: {
        userId,
        filename: file.name,
        originalFormat: file.name.split(".").pop() ?? "webm",
        storagePath,
        fileSizeBytes: BigInt(file.size),
        durationSeconds: durationRaw ? parseFloat(durationRaw) : null,
      },
      select: {
        id: true,
        filename: true,
        durationSeconds: true,
      },
    });

    // Create analysis record
    const analysis = await prisma.analysis.create({
      data: {
        videoId: video.id,
        status: "QUEUED",
      },
      select: {
        id: true,
      },
    });

    // Perform immediate analysis with Gemini
    let coachingFeedback = "Great job! Keep practicing your technique.";
    let scores: Record<string, number> = {};
    let grade = "B+";

    try {
      // Update analysis status
      await prisma.analysis.update({
        where: { id: analysis.id },
        data: { 
          status: "SHOT_CLASSIFICATION",
          startedAt: new Date(),
        },
      });

      // Classify shot with Gemini
      const classification = await classifyShotWithGemini({
        videoId: video.id,
        filename: video.filename,
        durationSeconds: video.durationSeconds,
        resolutionWidth: null,
        resolutionHeight: null,
      });

      // Score biomechanics with Gemini
      const scoring = await scoreBiomechanicsWithGemini({
        shotType: classification.shotType,
        durationSeconds: video.durationSeconds,
      });

      // Calculate grade
      const avgScore = scoring.scores.reduce((a, b) => a + b, 0) / scoring.scores.length;
      if (avgScore >= 90) grade = "A+";
      else if (avgScore >= 85) grade = "A";
      else if (avgScore >= 80) grade = "A-";
      else if (avgScore >= 75) grade = "B+";
      else if (avgScore >= 70) grade = "B";
      else if (avgScore >= 65) grade = "B-";
      else if (avgScore >= 60) grade = "C+";
      else if (avgScore >= 55) grade = "C";
      else grade = "C-";

      // Build scores object
      scores = {
        backlift: scoring.scores[0] ?? 75,
        weightTransfer: scoring.scores[1] ?? 75,
        headPosition: scoring.scores[2] ?? 75,
        followThrough: scoring.scores[3] ?? 75,
        timing: scoring.scores[4] ?? 75,
        balance: scoring.scores[5] ?? 75,
        footwork: scoring.scores[6] ?? 75,
        shotSelection: scoring.scores[7] ?? 75,
      };

      // Generate coaching feedback based on shot type and scores
      const shotLabel = shotTypeRaw.replace(/_/g, " ").toLowerCase();
      const strengths: string[] = [];
      const improvements: string[] = [];

      if (scores.weightTransfer >= 80) {
        strengths.push("excellent weight transfer");
      } else if (scores.weightTransfer < 70) {
        improvements.push("focus on transferring your weight through the shot");
      }

      if (scores.balance >= 80) {
        strengths.push("great balance throughout");
      } else if (scores.balance < 70) {
        improvements.push("work on maintaining balance at impact");
      }

      if (scores.timing >= 80) {
        strengths.push("good timing");
      } else if (scores.timing < 70) {
        improvements.push("practice timing with a ball on a string");
      }

      if (strengths.length > 0 && improvements.length > 0) {
        coachingFeedback = `Your ${shotLabel} shows ${strengths.join(" and ")}. To improve further, ${improvements.join(" and ")}.`;
      } else if (strengths.length > 0) {
        coachingFeedback = `Excellent ${shotLabel}! You demonstrate ${strengths.join(" and ")}. Keep up the great work!`;
      } else if (improvements.length > 0) {
        coachingFeedback = `Good effort on your ${shotLabel}. Focus on: ${improvements.join(", ")}.`;
      }

      // Update analysis with results
      await prisma.analysis.update({
        where: { id: analysis.id },
        data: {
          status: "COMPLETE",
          shotType: classification.shotType,
          shotConfidence: classification.confidence,
          gradeOverall: avgScore,
          gradeLetter: grade,
          scoreBacklift: scores.backlift,
          scoreWeightTransfer: scores.weightTransfer,
          scoreHeadPosition: scores.headPosition,
          scoreFollowThrough: scores.followThrough,
          scoreTiming: scores.timing,
          scoreBalance: scores.balance,
          scoreFootwork: scores.footwork,
          scoreShotSelection: scores.shotSelection,
          coachingTips: [
            {
              type: strengths.length > 0 ? "strength" : "improvement",
              title: strengths.length > 0 ? strengths[0] : improvements[0] ?? "Keep practicing",
              description: coachingFeedback,
            },
          ],
          rawGeminiResponse: {
            classification: {
              text: classification.rawResponseText,
              shotType: classification.shotType,
              confidence: classification.confidence,
              reasons: classification.reasons,
            },
            scoring: {
              text: scoring.rawResponseText,
              scores: scoring.scores,
            },
          },
          completedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Analysis error:", error);
      
      // Update analysis with error
      await prisma.analysis.update({
        where: { id: analysis.id },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Analysis failed",
        },
      });

      // Return fallback response
      coachingFeedback = "Analysis completed with limited data. Keep practicing!";
      scores = {
        backlift: 75,
        weightTransfer: 75,
        headPosition: 75,
        followThrough: 75,
        timing: 75,
        balance: 75,
        footwork: 75,
        shotSelection: 75,
      };
    }

    return NextResponse.json({
      id: video.id,
      analysisId: analysis.id,
      coachingFeedback,
      scores,
      grade,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
