-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PLAYER', 'PARENT', 'COACH', 'ADMIN');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NOT_REQUIRED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "displayName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" "Role" NOT NULL DEFAULT 'PLAYER';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ageGroup" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "clubOrSchool" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "primaryPosition" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "battingStyle" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bowlingStyle" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profileVisibility" TEXT NOT NULL DEFAULT 'COACHES_PARENTS';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ConsentRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guardianName" TEXT,
    "guardianEmail" TEXT,
    "guardianRelationship" TEXT,
    "consentStatus" "ConsentStatus" NOT NULL DEFAULT 'PENDING',
    "verificationToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PrivacyPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "performanceAnalytics" BOOLEAN NOT NULL DEFAULT true,
    "marketingCommunications" BOOLEAN NOT NULL DEFAULT false,
    "coachParentComms" BOOLEAN NOT NULL DEFAULT true,
    "profileVisibility" TEXT NOT NULL DEFAULT 'COACHES_PARENTS',
    "consentVersion" TEXT NOT NULL DEFAULT '1.0',
    "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ConsentRecord_userId_key" ON "ConsentRecord"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "ConsentRecord_verificationToken_key" ON "ConsentRecord"("verificationToken");
CREATE UNIQUE INDEX IF NOT EXISTS "PrivacyPreferences_userId_key" ON "PrivacyPreferences"("userId");

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrivacyPreferences" ADD CONSTRAINT "PrivacyPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
