import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { randomUUID } from "crypto";

export interface TokenPayload extends JwtPayload {
  userId: string;
  role: string;
  email: string;
  ageGroup?: string | null;
  tokenId?: string;
}

const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

function getPrivateKey(): string {
  const key = process.env.JWT_PRIVATE_KEY;
  if (!key) {
    throw new Error("JWT_PRIVATE_KEY is not configured");
  }
  return key;
}

function getPublicKey(): string {
  const key = process.env.JWT_PUBLIC_KEY;
  if (!key) {
    throw new Error("JWT_PUBLIC_KEY is not configured");
  }
  return key;
}

export function generateAccessToken(payload: Omit<TokenPayload, "tokenId">): string {
  const options: SignOptions = { algorithm: "RS256", expiresIn: ACCESS_EXPIRES_IN };
  return jwt.sign(payload, getPrivateKey(), options);
}

export function generateRefreshToken(payload: Omit<TokenPayload, "tokenId">): { token: string; tokenId: string } {
  const tokenId = randomUUID();
  const options: SignOptions = { algorithm: "RS256", expiresIn: REFRESH_EXPIRES_IN };
  const token = jwt.sign({ ...payload, tokenId }, getPrivateKey(), options);
  return { token, tokenId };
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, getPublicKey(), { algorithms: ["RS256"] }) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, getPublicKey(), { algorithms: ["RS256"] }) as TokenPayload;
}
