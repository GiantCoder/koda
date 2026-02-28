import { NextResponse } from "next/server";

/**
 * Refresh JWT.
 * MVP: Placeholder. Full implementation requires:
 * - Refresh token in HttpOnly cookie
 * - Redis storage for refresh tokens with rotation
 * - Reuse detection
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Refresh not implemented",
      message:
        "Refresh token flow requires Redis and cookie-based refresh tokens. Use login to obtain a new access token.",
    },
    { status: 501 }
  );
}
