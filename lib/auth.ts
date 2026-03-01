/**
 * Auth utilities for JWT and password hashing.
 */

import * as bcrypt from "bcrypt";
import * as jose from "jose";
import { randomUUID } from "crypto";

const BCRYPT_COST = 12;
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";
const JWT_SECRET = process.env.JWT_SECRET ?? "koda-dev-secret-change-in-production";
const ACCESS_AUDIENCE = "koda-access";
const REFRESH_AUDIENCE = "koda-refresh";

export interface AuthTokenPayload {
  sub: string;
  userId: string;
  role: string;
  email?: string;
  ageGroup?: string | null;
  tokenId?: string;
}

function getHmacKey(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signJwt(payload: {
  sub: string;
  userId: string;
  role: string;
}): Promise<string> {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setAudience(ACCESS_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(getHmacKey());
}

export async function generateAccessToken(payload: Omit<AuthTokenPayload, "tokenId">): Promise<string> {
  return signJwt({
    sub: payload.sub ?? payload.userId,
    userId: payload.userId,
    role: payload.role,
  });
}

export async function generateRefreshToken(
  payload: Omit<AuthTokenPayload, "tokenId">
): Promise<{ token: string; tokenId: string }> {
  const tokenId = randomUUID();
  const token = await new jose.SignJWT({ ...payload, tokenId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub ?? payload.userId)
    .setAudience(REFRESH_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(getHmacKey());
  return { token, tokenId };
}

export async function verifyJwt(token: string): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, getHmacKey(), {
      audience: ACCESS_AUDIENCE,
    });
    return {
      sub: payload.sub as string,
      userId: payload.userId as string,
      role: payload.role as string,
      email: payload.email as string | undefined,
      ageGroup: payload.ageGroup as string | null | undefined,
    };
  } catch {
    return null;
  }
}

export async function verifyAccessToken(token: string): Promise<AuthTokenPayload | null> {
  return verifyJwt(token);
}

export async function verifyRefreshToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, getHmacKey(), {
      audience: REFRESH_AUDIENCE,
    });
    return {
      sub: payload.sub as string,
      userId: payload.userId as string,
      role: payload.role as string,
      email: payload.email as string | undefined,
      ageGroup: payload.ageGroup as string | null | undefined,
      tokenId: payload.tokenId as string | undefined,
    };
  } catch {
    return null;
  }
}

export function getBearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}
