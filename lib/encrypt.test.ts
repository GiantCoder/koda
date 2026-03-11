import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  encryptApiKey,
  decryptApiKey,
  maskApiKey,
  type EncryptedPayload,
} from "./encrypt";

const VALID_KEY_HEX =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("encrypt", () => {
  const originalEnv = process.env.ECB_API_KEY_SECRET;

  beforeEach(() => {
    process.env.ECB_API_KEY_SECRET = VALID_KEY_HEX;
  });

  afterEach(() => {
    process.env.ECB_API_KEY_SECRET = originalEnv;
  });

  describe("encryptApiKey", () => {
    it("returns distinct IV each call", () => {
      const a = encryptApiKey("my-secret-key");
      const b = encryptApiKey("my-secret-key");
      expect(a.iv).not.toBe(b.iv);
      expect(a.ciphertext).not.toBe(b.ciphertext);
      expect(a.tag).not.toBe(b.tag);
    });

    it("returns valid hex strings for ciphertext, iv, and tag", () => {
      const out = encryptApiKey("test");
      expect(out.iv).toMatch(/^[0-9a-f]+$/);
      expect(out.ciphertext).toMatch(/^[0-9a-f]+$/);
      expect(out.tag).toMatch(/^[0-9a-f]+$/);
      expect(Buffer.from(out.iv, "hex").length).toBe(12);
      expect(Buffer.from(out.tag, "hex").length).toBe(16);
    });
  });

  describe("decryptApiKey", () => {
    it("round-trips correctly with encryptApiKey", () => {
      const plain = "my-ecb-api-key-12345";
      const encrypted = encryptApiKey(plain);
      const decrypted = decryptApiKey(encrypted);
      expect(decrypted).toBe(plain);
    });

    it("throws on tampered ciphertext", () => {
      const encrypted = encryptApiKey("secret");
      const tampered: EncryptedPayload = {
        ...encrypted,
        ciphertext: encrypted.ciphertext.slice(0, -2) + "ff",
      };
      expect(() => decryptApiKey(tampered)).toThrow();
    });

    it("throws on tampered tag", () => {
      const encrypted = encryptApiKey("secret");
      const tampered: EncryptedPayload = {
        ...encrypted,
        tag: encrypted.tag.slice(0, -2) + "ff",
      };
      expect(() => decryptApiKey(tampered)).toThrow();
    });

    it("throws on tampered iv", () => {
      const encrypted = encryptApiKey("secret");
      const tampered: EncryptedPayload = {
        ...encrypted,
        iv: encrypted.iv.slice(0, -2) + "ff",
      };
      expect(() => decryptApiKey(tampered)).toThrow();
    });
  });

  describe("maskApiKey", () => {
    it("hides all but the last 4 characters", () => {
      expect(maskApiKey("abcdefgh12")).toBe("••••••••gh12");
      expect(maskApiKey("abcd")).toBe("••••");
    });

    it("returns •••• when length <= 4", () => {
      expect(maskApiKey("")).toBe("••••");
      expect(maskApiKey("a")).toBe("••••");
      expect(maskApiKey("ab12")).toBe("••••");
    });
  });

  describe("getKey (via encryptApiKey/decryptApiKey)", () => {
    it("throws if ECB_API_KEY_SECRET is missing", () => {
      delete process.env.ECB_API_KEY_SECRET;
      expect(() => encryptApiKey("x")).toThrow(
        "ECB_API_KEY_SECRET must be a 64-character hex string (32 bytes)"
      );
    });

    it("throws if ECB_API_KEY_SECRET is wrong length", () => {
      process.env.ECB_API_KEY_SECRET = "tooshort";
      expect(() => encryptApiKey("x")).toThrow(
        "ECB_API_KEY_SECRET must be a 64-character hex string (32 bytes)"
      );
      process.env.ECB_API_KEY_SECRET = VALID_KEY_HEX + "extra";
      expect(() => encryptApiKey("x")).toThrow(
        "ECB_API_KEY_SECRET must be a 64-character hex string (32 bytes)"
      );
    });
  });
});
