-- AlterTable
ALTER TABLE `Analysis` ADD COLUMN `bowlingArm` VARCHAR(191) NULL,
    ADD COLUMN `bowlingType` VARCHAR(191) NULL,
    ADD COLUMN `deliveryType` VARCHAR(191) NULL,
    ADD COLUMN `deliveryConfidence` DOUBLE NULL,
    ADD COLUMN `scoreRunUpRhythm` DOUBLE NULL,
    ADD COLUMN `scoreLoadUp` DOUBLE NULL,
    ADD COLUMN `scoreBowlingArmAction` DOUBLE NULL,
    ADD COLUMN `scoreDeliveryStride` DOUBLE NULL,
    ADD COLUMN `scoreReleasePoint` DOUBLE NULL,
    ADD COLUMN `scoreAlignment` DOUBLE NULL;
