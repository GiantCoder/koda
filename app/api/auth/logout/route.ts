import { NextResponse } from "next/server";

/**
 * Logout: invalidate session.
 * MVP: No server-side session store. Client should discard access token.
 * TODO: Revoke refresh token in Redis when refresh flow is implemented.
 */
export async function POST() {
  return NextResponse.json({ success: true, message: "Logged out" });
}
