/**
 * Auth utilities for JWT and password hashing.
 * MVP: HS256 JWT. Production should use RS256 per PRD.
 */

import * as bcrypt from "bcrypt";
import * as jose from "jose";

const BCRYPT_COST = 12;
const JWT_EXPIRY = "15m";
const JWT_SECRET = process.env.JWT_SECRET ?? "koda-dev-secret-change-in-production";

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
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(secret);
}

export async function verifyJwt(token: string): Promise<{
  sub: string;
  userId: string;
  role: string;
} | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    return {
      sub: payload.sub as string,
      userId: payload.userId as string,
      role: payload.role as string,
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
