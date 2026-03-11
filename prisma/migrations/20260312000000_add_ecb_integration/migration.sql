-- AlterTable: add ECB / Play-Cricket fields to User
ALTER TABLE `User` ADD COLUMN `ecbApiKeyEncrypted` VARCHAR(191) NULL,
    ADD COLUMN `ecbApiKeyIv` VARCHAR(191) NULL,
    ADD COLUMN `ecbApiKeyTag` VARCHAR(191) NULL,
    ADD COLUMN `ecbApiKeyVerifiedAt` DATETIME(3) NULL,
    ADD COLUMN `playCricketPersonId` VARCHAR(191) NULL;

-- CreateTable: PlayCricketImport
CREATE TABLE `PlayCricketImport` (
    `id` VARCHAR(191) NOT NULL,
    `coachId` VARCHAR(191) NOT NULL,
    `clubId` VARCHAR(191) NOT NULL,
    `playCricketPersonId` VARCHAR(191) NOT NULL,
    `playCricketTeamId` VARCHAR(191) NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `dateOfBirth` DATETIME(3) NULL,
    `battingStyle` VARCHAR(191) NULL,
    `bowlingStyle` VARCHAR(191) NULL,
    `primaryPosition` VARCHAR(191) NULL,
    `rawPayload` JSON NOT NULL,
    `status` ENUM('PENDING', 'INVITED', 'LINKED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `linkedUserId` VARCHAR(191) NULL,
    `invitedAt` DATETIME(3) NULL,
    `importedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PlayCricketImport_coachId_playCricketPersonId_key`(`coachId`, `playCricketPersonId`),
    INDEX `PlayCricketImport_coachId_idx`(`coachId`),
    INDEX `PlayCricketImport_clubId_idx`(`clubId`),
    INDEX `PlayCricketImport_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PlayCricketImport` ADD CONSTRAINT `PlayCricketImport_coachId_fkey` FOREIGN KEY (`coachId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlayCricketImport` ADD CONSTRAINT `PlayCricketImport_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlayCricketImport` ADD CONSTRAINT `PlayCricketImport_linkedUserId_fkey` FOREIGN KEY (`linkedUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
