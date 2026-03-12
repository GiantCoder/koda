-- CreateTable
CREATE TABLE `PlayCricketSyncLog` (
    `id` VARCHAR(191) NOT NULL,
    `coachId` VARCHAR(191) NOT NULL,
    `clubId` VARCHAR(191) NOT NULL,
    `season` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `playersUpserted` INTEGER NOT NULL DEFAULT 0,
    `statsRowsUpserted` INTEGER NOT NULL DEFAULT 0,
    `matchesSynced` INTEGER NOT NULL DEFAULT 0,
    `errorMessage` TEXT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,

    INDEX `PlayCricketSyncLog_coachId_clubId_season_idx`(`coachId`, `clubId`, `season`),
    INDEX `PlayCricketSyncLog_startedAt_idx`(`startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlayCricketMatch` (
    `id` VARCHAR(191) NOT NULL,
    `coachId` VARCHAR(191) NOT NULL,
    `clubId` VARCHAR(191) NOT NULL,
    `playCricketMatchId` INTEGER NOT NULL,
    `matchDate` DATETIME(3) NULL,
    `homeTeamId` VARCHAR(191) NULL,
    `awayTeamId` VARCHAR(191) NULL,
    `homeTeamName` VARCHAR(191) NULL,
    `awayTeamName` VARCHAR(191) NULL,
    `resultDescription` VARCHAR(191) NULL,
    `competitionType` VARCHAR(191) NULL,
    `season` VARCHAR(191) NOT NULL,
    `rawPayload` JSON NOT NULL,
    `syncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PlayCricketMatch_playCricketMatchId_key`(`playCricketMatchId`),
    INDEX `PlayCricketMatch_coachId_season_idx`(`coachId`, `season`),
    INDEX `PlayCricketMatch_clubId_idx`(`clubId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlayCricketMatchInning` (
    `id` VARCHAR(191) NOT NULL,
    `matchId` VARCHAR(191) NOT NULL,
    `playCricketPersonId` VARCHAR(191) NOT NULL,
    `inningsNumber` INTEGER NOT NULL,
    `battingPosition` INTEGER NULL,
    `battingRuns` INTEGER NULL,
    `battingBalls` INTEGER NULL,
    `battingFours` INTEGER NULL,
    `battingSixes` INTEGER NULL,
    `battingDismissal` VARCHAR(191) NULL,
    `bowlingOvers` DOUBLE NULL,
    `bowlingMaidens` INTEGER NULL,
    `bowlingRuns` INTEGER NULL,
    `bowlingWickets` INTEGER NULL,
    `fieldingCatches` INTEGER NULL DEFAULT 0,
    `fieldingStumpings` INTEGER NULL DEFAULT 0,
    `fieldingRunOuts` INTEGER NULL DEFAULT 0,

    UNIQUE INDEX `PlayCricketMatchInning_matchId_playCricketPersonId_inningsNumber_key`(`matchId`, `playCricketPersonId`, `inningsNumber`),
    INDEX `PlayCricketMatchInning_playCricketPersonId_idx`(`playCricketPersonId`),
    INDEX `PlayCricketMatchInning_matchId_idx`(`matchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlayCricketInviteToken` (
    `id` VARCHAR(191) NOT NULL,
    `importId` VARCHAR(191) NOT NULL,
    `coachId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PlayCricketInviteToken_importId_key`(`importId`),
    UNIQUE INDEX `PlayCricketInviteToken_token_key`(`token`),
    INDEX `PlayCricketInviteToken_token_idx`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PlayCricketSyncLog` ADD CONSTRAINT `PlayCricketSyncLog_coachId_fkey` FOREIGN KEY (`coachId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlayCricketSyncLog` ADD CONSTRAINT `PlayCricketSyncLog_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlayCricketMatch` ADD CONSTRAINT `PlayCricketMatch_coachId_fkey` FOREIGN KEY (`coachId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlayCricketMatch` ADD CONSTRAINT `PlayCricketMatch_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlayCricketMatchInning` ADD CONSTRAINT `PlayCricketMatchInning_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `PlayCricketMatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlayCricketInviteToken` ADD CONSTRAINT `PlayCricketInviteToken_importId_fkey` FOREIGN KEY (`importId`) REFERENCES `PlayCricketImport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlayCricketInviteToken` ADD CONSTRAINT `PlayCricketInviteToken_coachId_fkey` FOREIGN KEY (`coachId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
