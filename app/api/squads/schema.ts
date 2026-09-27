import { z } from "zod";

const ageGroupEnum = z.enum([
  "UNDER_10",
  "UNDER_12",
  "UNDER_14",
  "UNDER_16",
  "UNDER_18",
  "SENIOR",
]);

const bannerFields = {
  bannerFileName: z.string().max(200).optional().nullable(),
  bannerImageUrl: z.string().max(3_000_000).optional().nullable(),
};

/** POST /api/squads - Create squad */
export const createSquadSchema = z.object({
  name: z.string().min(1).max(200),
  ageGroup: ageGroupEnum.optional(),
  clubName: z.string().max(200).optional(),
  ...bannerFields,
});

/** PUT /api/squads/:id - Update squad */
export const updateSquadSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  ageGroup: ageGroupEnum.optional().nullable(),
  clubName: z.string().max(200).optional().nullable(),
  isActive: z.boolean().optional(),
  ...bannerFields,
});

/** POST /api/squads/:id/members - Add member */
export const addMemberSchema = z.object({
  userId: z.string().uuid(),
});
