/**
 * Age and consent logic per PRD 4.1 / 4.2.
 * - Under 13: PENDING, block until guardian approves
 * - 13–17: lighter teen consent (parents notified, not blocking)
 * - 18+: NOT_REQUIRED
 */

import { ConsentStatus } from "@prisma/client";

export function getAgeFromDateOfBirth(dateOfBirth: Date | string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export function getConsentStatusForAge(age: number | null): ConsentStatus {
  if (age === null) return ConsentStatus.PENDING; // unknown age = require consent
  if (age < 13) return ConsentStatus.PENDING;
  if (age < 18) return ConsentStatus.PENDING; // MVP: treat 13–17 same as under 13 for simplicity
  return ConsentStatus.NOT_REQUIRED;
}

export function requiresGuardianConsent(age: number | null): boolean {
  return age !== null && age < 18;
}
