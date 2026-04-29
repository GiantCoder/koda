-- Upload flow: user-declared shot count and per-shot hints for multi-stroke clips.

ALTER TABLE `Analysis` ADD COLUMN `declaredShotCount` INTEGER NULL;
ALTER TABLE `Analysis` ADD COLUMN `playerDeclaredShotHints` JSON NULL;
