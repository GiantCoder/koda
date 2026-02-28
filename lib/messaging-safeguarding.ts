/**
 * Safeguarding logic for messaging (PRD 4.7, 9.3).
 * - When recipient is under 18: messages/conversations marked PARENT_VISIBLE
 * - Include parent visibility metadata in responses
 */

import { MessageVisibility } from "@prisma/client";
import { getAgeFromDateOfBirth, isMinor } from "./age-consent";
import type { User } from "@prisma/client";

export function getMessageVisibilityForRecipient(
  recipient: Pick<User, "dateOfBirth"> | null
): MessageVisibility {
  if (!recipient) return MessageVisibility.STANDARD;
  const age = getAgeFromDateOfBirth(recipient.dateOfBirth);
  return isMinor(age) ? MessageVisibility.PARENT_VISIBLE : MessageVisibility.STANDARD;
}

/** Returns parent visibility metadata for API responses */
export function getParentVisibilityMetadata(
  recipient: Pick<User, "dateOfBirth"> | null,
  visibility: MessageVisibility
): { parentVisible: boolean; reason?: string } {
  const age = recipient ? getAgeFromDateOfBirth(recipient.dateOfBirth) : null;
  const isMinorRecipient = isMinor(age);
  return {
    parentVisible: visibility === MessageVisibility.PARENT_VISIBLE || isMinorRecipient,
    reason: isMinorRecipient ? "Recipient is under 18; messages visible to linked guardians" : undefined,
  };
}
