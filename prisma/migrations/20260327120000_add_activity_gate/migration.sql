-- Activity gate: vision-based batting validation before shot classification.

ALTER TABLE `Analysis` ADD COLUMN `activityType` VARCHAR(191) NULL;
ALTER TABLE `Analysis` ADD COLUMN `activityConfidence` DOUBLE NULL;
ALTER TABLE `Analysis` ADD COLUMN `rejectionReason` TEXT NULL;

ALTER TABLE `Analysis` MODIFY `status` ENUM(
  'QUEUED',
  'EXTRACTING_FRAMES',
  'ACTIVITY_CLASSIFICATION',
  'POSE_ANALYSIS',
  'SHOT_CLASSIFICATION',
  'GENERATING_FEEDBACK',
  'COMPLETE',
  'FAILED',
  'UNSUPPORTED_CONTENT'
) NOT NULL DEFAULT 'QUEUED';
