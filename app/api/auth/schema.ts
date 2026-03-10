import { z } from "zod";

const roleEnum = z.enum(["PLAYER", "PARENT", "COACH"]);
const privacySchema = z.object({
  performanceAnalytics: z.boolean().default(true),
  marketingCommunications: z.boolean().default(false),
  coachParentComms: z.boolean().default(true),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phoneNumber: z.string().optional(),
  displayName: z.string().min(1, "Display name is required"),
  role: roleEnum,
  dateOfBirth: z
    .string()
    .optional()
    .refine(
      (v: string | undefined) => !v || /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(v),
      "Invalid date format (use YYYY-MM-DD or ISO8601)"
    ),
  agreedToTerms: z.literal(true).refine((val) => val === true, {
    message: "You must agree to the terms",
  }),
  privacyPreferences: privacySchema.optional().default({
    performanceAnalytics: true,
    marketingCommunications: false,
    coachParentComms: true,
  }),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
