-- RenameIndex
ALTER TABLE `PlayCricketMatchInning` RENAME INDEX `PCMInn_matchId_idx` TO `PlayCricketMatchInning_matchId_idx`;

-- RenameIndex
ALTER TABLE `PlayCricketMatchInning` RENAME INDEX `PCMInn_match_person_inn_key` TO `PlayCricketMatchInning_matchId_playCricketPersonId_inningsNu_key`;

-- RenameIndex
ALTER TABLE `PlayCricketMatchInning` RENAME INDEX `PCMInn_playCricketPersonId_idx` TO `PlayCricketMatchInning_playCricketPersonId_idx`;
