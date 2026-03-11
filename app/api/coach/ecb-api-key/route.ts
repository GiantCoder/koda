import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/get-auth-user";
import { prisma } from "@/prisma/client";
import { encryptApiKey, decryptApiKey, maskApiKey } from "@/lib/encrypt";

const saveKeySchema = z.object({
  apiKey: z.string().min(10).max(200),
});

export async function GET(request: NextRequest) {
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
      ecbApiKeyVerifiedAt: true,
    },
  });

  if (
    !user ||
    !user.ecbApiKeyEncrypted ||
    !user.ecbApiKeyIv ||
    !user.ecbApiKeyTag
  ) {
    return NextResponse.json({
      hasKey: false,
      maskedKey: null,
      verifiedAt: null,
    });
  }

  try {
    const plaintext = decryptApiKey({
      ciphertext: user.ecbApiKeyEncrypted,
      iv: user.ecbApiKeyIv,
      tag: user.ecbApiKeyTag,
    });
    const maskedKey = maskApiKey(plaintext);
    return NextResponse.json({
      hasKey: true,
      maskedKey,
      verifiedAt: user.ecbApiKeyVerifiedAt?.toISOString() ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to read stored key" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.role !== "COACH" && authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = saveKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const payload = encryptApiKey(parsed.data.apiKey);
    await prisma.user.update({
      where: { id: authUser.id },
      data: {
        ecbApiKeyEncrypted: payload.ciphertext,
        ecbApiKeyIv: payload.iv,
        ecbApiKeyTag: payload.tag,
        ecbApiKeyVerifiedAt: null,
      },
    });
    const maskedKey = maskApiKey(parsed.data.apiKey);
    return NextResponse.json({ success: true, maskedKey });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("[POST /api/coach/ecb-api-key] Save failed", err);

    if (err.message.includes("ECB_API_KEY_SECRET")) {
      return NextResponse.json(
        { error: "Server configuration error: ECB_API_KEY_SECRET must be a 64-character hex string." },
        { status: 500 }
      );
    }
    if (err.message?.includes("Unknown column") || err.message?.includes("column") || (err as { code?: string }).code === "P2009") {
      return NextResponse.json(
        { error: "Database schema may be out of date. Run: npx prisma migrate dev" },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to save API key" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.role !== "COACH" && authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: authUser.id },
    data: {
      ecbApiKeyEncrypted: null,
      ecbApiKeyIv: null,
      ecbApiKeyTag: null,
      ecbApiKeyVerifiedAt: null,
    },
  });
  return NextResponse.json({ success: true });
}
