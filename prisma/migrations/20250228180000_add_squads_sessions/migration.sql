-- CreateEnum
CREATE TYPE "AgeGroup" AS ENUM ('UNDER_10', 'UNDER_12', 'UNDER_14', 'UNDER_16', 'UNDER_18', 'SENIOR');

-- CreateTable
CREATE TABLE "Squad" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "ageGroup" "AgeGroup",
    "clubName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Squad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SquadMember" (
    "id" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SquadMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "squadId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "attendees" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PlayerSessions" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SquadMember_squadId_userId_key" ON "SquadMember"("squadId", "userId");

-- CreateIndex
CREATE INDEX "Squad_coachId_idx" ON "Squad"("coachId");

-- CreateIndex
CREATE INDEX "SquadMember_squadId_idx" ON "SquadMember"("squadId");

-- CreateIndex
CREATE INDEX "SquadMember_userId_idx" ON "SquadMember"("userId");

-- CreateIndex
CREATE INDEX "Session_coachId_idx" ON "Session"("coachId");

-- CreateIndex
CREATE INDEX "Session_squadId_idx" ON "Session"("squadId");

-- CreateIndex
CREATE INDEX "Session_scheduledAt_idx" ON "Session"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "_PlayerSessions_AB_unique" ON "_PlayerSessions"("A", "B");

-- CreateIndex
CREATE INDEX "_PlayerSessions_B_index" ON "_PlayerSessions"("B");

-- AddForeignKey
ALTER TABLE "Squad" ADD CONSTRAINT "Squad_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadMember" ADD CONSTRAINT "SquadMember_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadMember" ADD CONSTRAINT "SquadMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PlayerSessions" ADD CONSTRAINT "_PlayerSessions_A_fkey" FOREIGN KEY ("A") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PlayerSessions" ADD CONSTRAINT "_PlayerSessions_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
