import { z } from "zod";

const userSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
});

/** Profile update for PUT /api/users/me */
export const profileUpdateSchema = z.object({
  displayName: z.string().min(1).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  clubOrSchool: z.string().optional(),
  primaryPosition: z.string().optional(),
  battingStyle: z.string().optional(),
  bowlingStyle: z.string().optional(),
  profileVisibility: z
    .enum(["COACHES_PARENTS", "COACHES_ONLY", "PUBLIC"])
    .optional(),
});

/** Avatar upload - MVP placeholder accepts URL string */
export const avatarUpdateSchema = z.object({
  avatarUrl: z.string().url().optional(),
});

export { userSchema };