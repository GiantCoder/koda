import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_HEX = process.env.ECB_API_KEY_SECRET ?? "";

function getKey(): Buffer {
  if (KEY_HEX.length !== 64) {
    throw new Error(
      "ECB_API_KEY_SECRET must be a 64-character hex string (32 bytes)"
    );
  }
  return Buffer.from(KEY_HEX, "hex");
}

export interface EncryptedPayload {
  ciphertext: string; // hex
  iv: string; // hex, 12 bytes
  tag: string; // hex, 16 bytes
}

export function encryptApiKey(plaintext: string): EncryptedPayload {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
  };
}

export function decryptApiKey(payload: EncryptedPayload): string {
  const key = getKey();
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(payload.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

/** Returns the last 4 characters of the key for display, e.g. "••••••••ab12" */
export function maskApiKey(plaintext: string): string {
  if (plaintext.length <= 4) return "••••";
  return "••••••••" + plaintext.slice(-4);
}
