import { z } from "zod";

export const consentRequestSchema = z.object({
  guardianName: z.string().min(1, "Guardian name is required"),
  guardianEmail: z.string().email(),
  guardianRelationship: z
    .enum(["mother", "father", "guardian", "other"])
    .optional()
    .default("guardian"),
});

export const privacyUpdateSchema = z.object({
  performanceAnalytics: z.boolean().optional(),
  marketingCommunications: z.boolean().optional(),
  coachParentComms: z.boolean().optional(),
  profileVisibility: z
    .enum(["COACHES_PARENTS", "COACHES_ONLY", "PUBLIC"])
    .optional(),
});

export const profileUpdateSchema = z.object({
  displayName: z.string().min(1).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  clubOrSchool: z.string().optional(),
  primaryPosition: z.string().optional(),
  battingStyle: z.string().optional(),
  bowlingStyle: z.string().optional(),
});

export const consentVerifySchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export type ConsentRequestInput = z.infer<typeof consentRequestSchema>;
export type PrivacyUpdateInput = z.infer<typeof privacyUpdateSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
