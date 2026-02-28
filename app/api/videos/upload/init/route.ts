import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { uploadInitSchema } from "../../schema";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const validation = uploadInitSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const { filename, fileSizeBytes } = validation.data;
  const userId = validation.data.userId ?? user.id;

  // Ensure user can only init upload for themselves
  if (userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const uploadId = randomUUID();
  const storagePath = `uploads/${userId}/${uploadId}/${filename}`;

  const video = await prisma.video.create({
    data: {
      userId,
      filename,
      originalFormat: filename.split(".").pop() ?? "mp4",
      storagePath,
      fileSizeBytes: BigInt(fileSizeBytes),
    },
  });

  return NextResponse.json({
    uploadId,
    videoId: video.id,
    uploadUrl: `/api/videos/upload/${uploadId}`,
    storagePath,
  });
}
