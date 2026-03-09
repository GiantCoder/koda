import { z } from "zod";

export const createTeamPlayerSchema = z.object({
  displayName: z.string().min(1).max(120),
  email: z.string().email().optional(),
  firstName: z.string().max(120).optional(),
  lastName: z.string().max(120).optional(),
  squadId: z.string().uuid().optional(),
});

export const updateTeamPlayerSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  firstName: z.string().max(120).optional().nullable(),
  lastName: z.string().max(120).optional().nullable(),
  dateOfBirth: z.string().datetime().optional().nullable(),
  battingStyle: z.string().max(120).optional().nullable(),
  bowlingStyle: z.string().max(120).optional().nullable(),
  clubOrSchool: z.string().max(200).optional().nullable(),
  primaryPosition: z.string().max(120).optional().nullable(),
  profileVisibility: z
    .enum(["COACHES_PARENTS", "COACHES_ONLY", "PUBLIC"])
    .optional()
    .nullable(),
  ageGroup: z
    .enum(["UNDER_10", "UNDER_12", "UNDER_14", "UNDER_16", "UNDER_18", "SENIOR"])
    .optional()
    .nullable(),
  squadId: z.string().uuid().optional(),
});
