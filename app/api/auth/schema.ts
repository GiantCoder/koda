import { z } from "zod";

// Phone autofill rarely submits the address alone. Common wrappers are
// "mailto:user@gmail.com", "Name <user@gmail.com>", a trailing ".", or
// fullwidth punctuation. Pull the address out of that text, then let
// z.string().email() check what remains.
function isSkippableEmailChar(code: number): boolean {
  return (
    code <= 0x20 ||
    code === 0x7f ||
    code === 0xa0 ||
    code === 0xad ||
    code === 0xfeff ||
    (code >= 0x2000 && code <= 0x200f) ||
    (code >= 0x2028 && code <= 0x202f) ||
    (code >= 0x205f && code <= 0x2069) ||
    code === 0x3000
  );
}

function normalizeEmail(value: string): string {
  const compat = typeof value.normalize === "function" ? value.normalize("NFKC") : value;
  let cleaned = "";
  for (const char of compat) {
    const code = char.codePointAt(0) ?? 0;
    if (!isSkippableEmailChar(code)) cleaned += char;
  }
  const match = cleaned.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  return (match?.[0] ?? cleaned).replace(/\.{2,}/g, ".").replace(/^\.+|\.+$/g, "").toLowerCase();
}

const emailSchema = z.string().overwrite(normalizeEmail).email();

const roleEnum = z.enum(["PLAYER", "PARENT", "COACH"]);
const privacySchema = z.object({
  performanceAnalytics: z.boolean().default(true),
  marketingCommunications: z.boolean().default(false),
  coachParentComms: z.boolean().default(true),
});

export const registerSchema = z.object({
  email: emailSchema,
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
  inviteToken: z.string().length(64).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
