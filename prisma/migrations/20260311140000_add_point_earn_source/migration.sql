-- CreateTable
CREATE TABLE `GameSettings` (
    `id` VARCHAR(191) NOT NULL,
    `pointEarnSource` ENUM('UPLOADS_ONLY', 'SHADOW_BATTING_ONLY', 'BOTH') NOT NULL DEFAULT 'BOTH',
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed default row
INSERT INTO `GameSettings` (`id`, `pointEarnSource`, `updatedAt`) VALUES ('default', 'BOTH', NOW(3));
