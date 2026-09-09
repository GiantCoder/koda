/**
 * Wraps GET/PUT /api/users/me -- the endpoint the web app's Profile screen
 * uses for real, ongoing profile editing (as opposed to ./onboarding.ts's
 * updateProfile(), which hits /api/onboarding/profile and is only used
 * during first-time setup). Two different endpoints on the backend, so two
 * thin wrappers here rather than conflating them.
 */
import { z } from "zod";
import { apiFetch } from "./client";

export interface MyProfile {
  id: string;
  email: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  role: "PLAYER" | "PARENT" | "COACH" | "ADMIN";
  dateOfBirth: string | null;
  ageGroup: string | null;
  clubOrSchool: string | null;
  primaryPosition: string | null;
  battingStyle: string | null;
  bowlingStyle: string | null;
  profileVisibility: "COACHES_PARENTS" | "COACHES_ONLY" | "PUBLIC";
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export async function getMyProfile(): Promise<MyProfile> {
  return apiFetch<MyProfile>("/api/users/me");
}

export const myProfileUpdateSchema = z.object({
  displayName: z.string().min(1).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  clubOrSchool: z.string().optional(),
  primaryPosition: z.string().optional(),
  battingStyle: z.string().optional(),
  bowlingStyle: z.string().optional(),
  profileVisibility: z.enum(["COACHES_PARENTS", "COACHES_ONLY", "PUBLIC"]).optional(),
});
export type MyProfileUpdateInput = z.infer<typeof myProfileUpdateSchema>;

export async function updateMyProfile(input: MyProfileUpdateInput): Promise<MyProfile> {
  const parsed = myProfileUpdateSchema.parse(input);
  return apiFetch<MyProfile>("/api/users/me", { method: "PUT", body: parsed });
}
