import { generateKeyPairSync } from "crypto";
import { generateAccessToken, verifyAccessToken } from "./auth";

describe("src/lib/auth", () => {
  beforeAll(() => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    process.env.JWT_PRIVATE_KEY = privateKey.export({ type: "pkcs1", format: "pem" }).toString();
    process.env.JWT_PUBLIC_KEY = publicKey.export({ type: "pkcs1", format: "pem" }).toString();
  });

  it("generates and verifies access token", () => {
    const token = generateAccessToken({
      userId: "u-1",
      role: "COACH",
      email: "coach@test.com",
    });

    const payload = verifyAccessToken(token);
    expect(payload.userId).toBe("u-1");
    expect(payload.role).toBe("COACH");
    expect(payload.email).toBe("coach@test.com");
  });
});
