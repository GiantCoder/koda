-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('QUEUED', 'EXTRACTING_FRAMES', 'POSE_ANALYSIS', 'SHOT_CLASSIFICATION', 'GENERATING_FEEDBACK', 'COMPLETE', 'FAILED');

-- CreateEnum
CREATE TYPE "ShotType" AS ENUM ('COVER_DRIVE', 'OFF_DRIVE', 'STRAIGHT_DRIVE', 'ON_DRIVE', 'SWEEP', 'REVERSE_SWEEP', 'PULL', 'HOOK', 'CUT', 'GLANCE', 'DEFENSIVE', 'LATE_CUT', 'FLICK', 'SCOOP', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalFormat" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "cdnUrl" TEXT,
    "fileSizeBytes" BIGINT NOT NULL,
    "durationSeconds" DOUBLE PRECISION,
    "resolutionWidth" INTEGER,
    "resolutionHeight" INTEGER,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'QUEUED',
    "shotType" "ShotType",
    "shotConfidence" DOUBLE PRECISION,
    "gradeOverall" DOUBLE PRECISION,
    "gradeLetter" TEXT,
    "scoreBacklift" DOUBLE PRECISION,
    "scoreWeightTransfer" DOUBLE PRECISION,
    "scoreHeadPosition" DOUBLE PRECISION,
    "scoreFollowThrough" DOUBLE PRECISION,
    "scoreTiming" DOUBLE PRECISION,
    "scoreBalance" DOUBLE PRECISION,
    "scoreFootwork" DOUBLE PRECISION,
    "scoreShotSelection" DOUBLE PRECISION,
    "poseDataPath" TEXT,
    "skeletonOverlayPath" TEXT,
    "coachingTips" JSONB,
    "rawGeminiResponse" JSONB,
    "rawOpenAiResponse" JSONB,
    "analysisVersion" TEXT NOT NULL DEFAULT '1.0',
    "processingMs" INTEGER,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Video_userId_idx" ON "Video"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Analysis_videoId_key" ON "Analysis"("videoId");

-- CreateIndex
CREATE INDEX "Analysis_status_idx" ON "Analysis"("status");

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
