-- CreateTable
CREATE TABLE `Club` (
  `id` VARCHAR(191) NOT NULL,
  `coachId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `website` VARCHAR(191) NOT NULL,
  `playCricketUrl` VARCHAR(191) NOT NULL,
  `playCricketId` VARCHAR(191) NOT NULL,
  `address` VARCHAR(191) NOT NULL,
  `postcode` VARCHAR(191) NOT NULL,
  `badgeFileName` VARCHAR(191) NULL,
  `bannerFileName` VARCHAR(191) NULL,
  `badgeImageUrl` LONGTEXT NULL,
  `bannerImageUrl` LONGTEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `Club_coachId_name_key`(`coachId`, `name`),
  INDEX `Club_coachId_idx`(`coachId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Club` ADD CONSTRAINT `Club_coachId_fkey` FOREIGN KEY (`coachId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
