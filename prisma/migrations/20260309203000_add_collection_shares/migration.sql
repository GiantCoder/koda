-- CreateTable
CREATE TABLE `CollectionShare` (
    `id` VARCHAR(191) NOT NULL,
    `collectionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `sharedByUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CollectionShare_collectionId_userId_key`(`collectionId`, `userId`),
    INDEX `CollectionShare_collectionId_idx`(`collectionId`),
    INDEX `CollectionShare_userId_idx`(`userId`),
    INDEX `CollectionShare_sharedByUserId_idx`(`sharedByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CollectionShare` ADD CONSTRAINT `CollectionShare_collectionId_fkey` FOREIGN KEY (`collectionId`) REFERENCES `Collection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CollectionShare` ADD CONSTRAINT `CollectionShare_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CollectionShare` ADD CONSTRAINT `CollectionShare_sharedByUserId_fkey` FOREIGN KEY (`sharedByUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
