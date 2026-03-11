-- AlterTable: extend NotificationType enum
ALTER TABLE `Notification` MODIFY COLUMN `type` ENUM('ANALYSIS_COMPLETE', 'NEW_MESSAGE', 'TEAM_INVITATION', 'ACHIEVEMENT_UNLOCKED', 'SESSION_REMINDER', 'CONSENT_REQUEST', 'SYSTEM_ALERT', 'CARD_STAT_UPDATE', 'LEAGUE_POSITION_CHANGE', 'SEASON_ENDING', 'SEASON_COMPLETE', 'CHALLENGE_LIVE', 'CHALLENGE_RESULT') NOT NULL;

-- CreateTable: UserPoints
CREATE TABLE `UserPoints` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `totalPoints` INTEGER NOT NULL DEFAULT 0,
    `currentSeasonPts` INTEGER NOT NULL DEFAULT 0,
    `goldStarCount` INTEGER NOT NULL DEFAULT 0,
    `practiceStreakDays` INTEGER NOT NULL DEFAULT 0,
    `lastPracticeDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserPoints_userId_key`(`userId`),
    INDEX `UserPoints_totalPoints_idx`(`totalPoints`),
    INDEX `UserPoints_currentSeasonPts_idx`(`currentSeasonPts`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: PointTransaction
CREATE TABLE `PointTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `points` INTEGER NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `referenceId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PointTransaction_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: BadgeDefinition
CREATE TABLE `BadgeDefinition` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `rarity` ENUM('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY') NOT NULL DEFAULT 'COMMON',
    `iconKey` VARCHAR(191) NOT NULL,
    `pointsValue` INTEGER NOT NULL DEFAULT 25,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BadgeDefinition_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: UserBadge
CREATE TABLE `UserBadge` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `badgeDefinitionId` VARCHAR(191) NOT NULL,
    `earnedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `referenceId` VARCHAR(191) NULL,

    UNIQUE INDEX `UserBadge_userId_badgeDefinitionId_key`(`userId`, `badgeDefinitionId`),
    INDEX `UserBadge_userId_idx`(`userId`),
    INDEX `UserBadge_earnedAt_idx`(`earnedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: League
CREATE TABLE `League` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `scope` ENUM('CLUB', 'CUSTOM', 'GLOBAL') NOT NULL DEFAULT 'CUSTOM',
    `clubId` VARCHAR(191) NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `joinCode` VARCHAR(191) NULL,
    `ageGroup` ENUM('UNDER_10', 'UNDER_12', 'UNDER_14', 'UNDER_16', 'UNDER_18', 'SENIOR') NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `League_joinCode_key`(`joinCode`),
    INDEX `League_scope_idx`(`scope`),
    INDEX `League_clubId_idx`(`clubId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: LeagueSeason
CREATE TABLE `LeagueSeason` (
    `id` VARCHAR(191) NOT NULL,
    `leagueId` VARCHAR(191) NOT NULL,
    `seasonNumber` INTEGER NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `LeagueSeason_leagueId_seasonNumber_key`(`leagueId`, `seasonNumber`),
    INDEX `LeagueSeason_leagueId_isActive_idx`(`leagueId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: LeagueMember
CREATE TABLE `LeagueMember` (
    `id` VARCHAR(191) NOT NULL,
    `leagueId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `LeagueMember_leagueId_userId_key`(`leagueId`, `userId`),
    INDEX `LeagueMember_leagueId_idx`(`leagueId`),
    INDEX `LeagueMember_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: LeagueEntry
CREATE TABLE `LeagueEntry` (
    `id` VARCHAR(191) NOT NULL,
    `leagueSeasonId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `points` INTEGER NOT NULL DEFAULT 0,
    `goldStars` INTEGER NOT NULL DEFAULT 0,
    `topScore` DOUBLE NULL,
    `analysisCount` INTEGER NOT NULL DEFAULT 0,
    `currentRank` INTEGER NULL,
    `previousRank` INTEGER NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LeagueEntry_leagueSeasonId_userId_key`(`leagueSeasonId`, `userId`),
    INDEX `LeagueEntry_leagueSeasonId_points_idx`(`leagueSeasonId`, `points`),
    INDEX `LeagueEntry_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Challenge
CREATE TABLE `Challenge` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'JUDGING', 'COMPLETE', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `shotType` ENUM('COVER_DRIVE', 'OFF_DRIVE', 'STRAIGHT_DRIVE', 'ON_DRIVE', 'SWEEP', 'REVERSE_SWEEP', 'PULL', 'HOOK', 'CUT', 'GLANCE', 'DEFENSIVE', 'LATE_CUT', 'FLICK', 'SCOOP', 'UNKNOWN') NULL,
    `targetScore` DOUBLE NULL,
    `targetDimension` VARCHAR(191) NULL,
    `targetDimScore` DOUBLE NULL,
    `prizeDesc` VARCHAR(191) NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `clubId` VARCHAR(191) NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `maxEntries` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Challenge_status_startsAt_idx`(`status`, `startsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: ChallengeSubmission
CREATE TABLE `ChallengeSubmission` (
    `id` VARCHAR(191) NOT NULL,
    `challengeId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `analysisId` VARCHAR(191) NOT NULL,
    `score` DOUBLE NOT NULL,
    `isApproved` BOOLEAN NOT NULL DEFAULT false,
    `approvedByUserId` VARCHAR(191) NULL,
    `isShowcased` BOOLEAN NOT NULL DEFAULT false,
    `finalRank` INTEGER NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ChallengeSubmission_challengeId_userId_key`(`challengeId`, `userId`),
    INDEX `ChallengeSubmission_challengeId_score_idx`(`challengeId`, `score`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey: PointTransaction -> UserPoints (via userId)
ALTER TABLE `PointTransaction` ADD CONSTRAINT `PointTransaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `UserPoints`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: UserPoints -> User
ALTER TABLE `UserPoints` ADD CONSTRAINT `UserPoints_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: UserBadge -> User
ALTER TABLE `UserBadge` ADD CONSTRAINT `UserBadge_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: UserBadge -> BadgeDefinition
ALTER TABLE `UserBadge` ADD CONSTRAINT `UserBadge_badgeDefinitionId_fkey` FOREIGN KEY (`badgeDefinitionId`) REFERENCES `BadgeDefinition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: League -> User
ALTER TABLE `League` ADD CONSTRAINT `League_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: LeagueSeason -> League
ALTER TABLE `LeagueSeason` ADD CONSTRAINT `LeagueSeason_leagueId_fkey` FOREIGN KEY (`leagueId`) REFERENCES `League`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: LeagueMember -> League
ALTER TABLE `LeagueMember` ADD CONSTRAINT `LeagueMember_leagueId_fkey` FOREIGN KEY (`leagueId`) REFERENCES `League`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: LeagueMember -> User
ALTER TABLE `LeagueMember` ADD CONSTRAINT `LeagueMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: LeagueEntry -> LeagueSeason
ALTER TABLE `LeagueEntry` ADD CONSTRAINT `LeagueEntry_leagueSeasonId_fkey` FOREIGN KEY (`leagueSeasonId`) REFERENCES `LeagueSeason`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: LeagueEntry -> User
ALTER TABLE `LeagueEntry` ADD CONSTRAINT `LeagueEntry_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Challenge -> User
ALTER TABLE `Challenge` ADD CONSTRAINT `Challenge_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: ChallengeSubmission -> Challenge
ALTER TABLE `ChallengeSubmission` ADD CONSTRAINT `ChallengeSubmission_challengeId_fkey` FOREIGN KEY (`challengeId`) REFERENCES `Challenge`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ChallengeSubmission -> User
ALTER TABLE `ChallengeSubmission` ADD CONSTRAINT `ChallengeSubmission_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
