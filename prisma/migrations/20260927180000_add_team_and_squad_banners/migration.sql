-- AlterTable
ALTER TABLE `Squad` ADD COLUMN `bannerFileName` VARCHAR(191) NULL,
    ADD COLUMN `bannerImageUrl` LONGTEXT NULL;

-- CreateTable
CREATE TABLE `Team` (
    `id` VARCHAR(191) NOT NULL,
    `coachId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `clubName` VARCHAR(191) NOT NULL,
    `squadHint` VARCHAR(191) NULL,
    `bannerFileName` VARCHAR(191) NULL,
    `bannerImageUrl` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Team_coachId_idx`(`coachId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Team` ADD CONSTRAINT `Team_coachId_fkey` FOREIGN KEY (`coachId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
