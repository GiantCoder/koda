-- CreateTable
CREATE TABLE `Collection` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Collection_userId_idx`(`userId`),
    INDEX `Collection_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SavedClip` (
    `id` VARCHAR(191) NOT NULL,
    `collectionId` VARCHAR(191) NOT NULL,
    `videoId` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `savedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SavedClip_collectionId_idx`(`collectionId`),
    INDEX `SavedClip_videoId_idx`(`videoId`),
    INDEX `SavedClip_savedAt_idx`(`savedAt`),
    UNIQUE INDEX `SavedClip_collectionId_videoId_key`(`collectionId`, `videoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlayerCard` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `tier` ENUM('BRONZE', 'SILVER', 'GOLD', 'ELITE') NOT NULL DEFAULT 'BRONZE',
    `role` ENUM('BAT', 'BWL', 'ALL', 'WKT') NOT NULL DEFAULT 'BAT',
    `sportIcon` ENUM('BAT_ICON', 'BALL_ICON', 'GLOVES_ICON') NOT NULL DEFAULT 'BAT_ICON',
    `statTec` INTEGER NOT NULL DEFAULT 50,
    `statPow` INTEGER NOT NULL DEFAULT 50,
    `statTim` INTEGER NOT NULL DEFAULT 50,
    `statCon` INTEGER NOT NULL DEFAULT 50,
    `statPac` INTEGER NOT NULL DEFAULT 50,
    `statFie` INTEGER NOT NULL DEFAULT 50,
    `profilePhotoUrl` VARCHAR(191) NULL,
    `backgroundUrl` VARCHAR(191) NULL,
    `backgroundMode` ENUM('DEFAULT', 'UPLOAD', 'AI') NOT NULL DEFAULT 'DEFAULT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PlayerCard_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Collection` ADD CONSTRAINT `Collection_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SavedClip` ADD CONSTRAINT `SavedClip_collectionId_fkey` FOREIGN KEY (`collectionId`) REFERENCES `Collection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SavedClip` ADD CONSTRAINT `SavedClip_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlayerCard` ADD CONSTRAINT `PlayerCard_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
