import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { prisma } from "@/prisma/client";
import { decryptApiKey } from "@/lib/encrypt";

const PLAY_CRICKET_CLUBS_URL =
  "https://play-cricket.com/api/v2/clubs.json";
const VALIDATE_TIMEOUT_MS = 10_000;

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.role !== "COACH" && authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      ecbApiKeyEncrypted: true,
      ecbApiKeyIv: true,
      ecbApiKeyTag: true,
    },
  });

  if (
    !user ||
    !user.ecbApiKeyEncrypted ||
    !user.ecbApiKeyIv ||
    !user.ecbApiKeyTag
  ) {
    return NextResponse.json(
      { error: "No ECB API key saved. Save a key first." },
      { status: 400 }
    );
  }

  let apiKey: string;
  try {
    apiKey = decryptApiKey({
      ciphertext: user.ecbApiKeyEncrypted,
      iv: user.ecbApiKeyIv,
      tag: user.ecbApiKeyTag,
    });
  } catch (e) {
    console.error("[validate] Decrypt failed", e);
    return NextResponse.json(
      { valid: false, reason: "invalid_key" },
      { status: 200 }
    );
  }

  const url = `${PLAY_CRICKET_CLUBS_URL}?api_token=${encodeURIComponent(apiKey)}&offset=0&limit=1`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VALIDATE_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json(
        { valid: false, reason: "invalid_key" },
        { status: 200 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { valid: false, reason: "unreachable" },
        { status: 200 }
      );
    }

    await res.json();
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === "AbortError") {
      return NextResponse.json(
        { valid: false, reason: "unreachable" },
        { status: 200 }
      );
    }
    console.error("[validate] Play-Cricket request failed", e);
    return NextResponse.json(
      { valid: false, reason: "unreachable" },
      { status: 200 }
    );
  }

  const verifiedAt = new Date();
  await prisma.user.update({
    where: { id: authUser.id },
    data: { ecbApiKeyVerifiedAt: verifiedAt },
  });

  return NextResponse.json({
    valid: true,
    verifiedAt: verifiedAt.toISOString(),
  });
}
