-- CreateTable
CREATE TABLE `PlayCricketPlayerStats` (
    `id` VARCHAR(191) NOT NULL,
    `importId` VARCHAR(191) NOT NULL,
    `coachId` VARCHAR(191) NOT NULL,
    `clubId` VARCHAR(191) NOT NULL,
    `playCricketPersonId` VARCHAR(191) NOT NULL,
    `playCricketTeamId` VARCHAR(191) NOT NULL,
    `teamName` VARCHAR(191) NOT NULL,
    `season` VARCHAR(191) NOT NULL,
    `competitionType` VARCHAR(191) NOT NULL,
    `battingInnings` INTEGER NOT NULL DEFAULT 0,
    `battingNotOuts` INTEGER NOT NULL DEFAULT 0,
    `battingRuns` INTEGER NOT NULL DEFAULT 0,
    `battingHighest` INTEGER NOT NULL DEFAULT 0,
    `battingAverage` DOUBLE NULL,
    `battingStrikeRate` DOUBLE NULL,
    `battingFifties` INTEGER NOT NULL DEFAULT 0,
    `battingHundreds` INTEGER NOT NULL DEFAULT 0,
    `bowlingOvers` DOUBLE NOT NULL DEFAULT 0,
    `bowlingWickets` INTEGER NOT NULL DEFAULT 0,
    `bowlingRuns` INTEGER NOT NULL DEFAULT 0,
    `bowlingAverage` DOUBLE NULL,
    `bowlingEconomy` DOUBLE NULL,
    `bowlingBestFigures` VARCHAR(191) NULL,
    `bowlingFiveWickets` INTEGER NOT NULL DEFAULT 0,
    `fieldingCatches` INTEGER NOT NULL DEFAULT 0,
    `fieldingStumpings` INTEGER NOT NULL DEFAULT 0,
    `fieldingRunOuts` INTEGER NOT NULL DEFAULT 0,
    `syncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PlayCricketPlayerStats_importId_season_competitionType_key`(`importId`, `season`, `competitionType`),
    INDEX `PlayCricketPlayerStats_coachId_season_idx`(`coachId`, `season`),
    INDEX `PlayCricketPlayerStats_clubId_idx`(`clubId`),
    INDEX `PlayCricketPlayerStats_playCricketPersonId_idx`(`playCricketPersonId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PlayCricketPlayerStats` ADD CONSTRAINT `PlayCricketPlayerStats_importId_fkey` FOREIGN KEY (`importId`) REFERENCES `PlayCricketImport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlayCricketPlayerStats` ADD CONSTRAINT `PlayCricketPlayerStats_coachId_fkey` FOREIGN KEY (`coachId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlayCricketPlayerStats` ADD CONSTRAINT `PlayCricketPlayerStats_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
