import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { getSignedUrl, uploadToStorage } from "@/src/lib/storage";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 15;

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image uploads are allowed" }, { status: 400 });
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Image too large. Maximum size is 8MB." },
      { status: 400 }
    );
  }

  const fileExt = file.name.includes(".") ? file.name.split(".").pop() : "png";
  const objectKey = `player-cards/${authUser.id}/${randomUUID()}.${fileExt}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  try {
    await uploadToStorage(objectKey, fileBuffer, file.type);
    const signedUrl = await getSignedUrl(objectKey, SIGNED_URL_TTL_SECONDS);

    return NextResponse.json({
      url: signedUrl,
      storagePath: objectKey,
      expiresInSeconds: SIGNED_URL_TTL_SECONDS,
    });
  } catch (error) {
    const storageError = error as { Code?: string };
    if (storageError.Code === "XMinioStorageFull") {
      return NextResponse.json(
        {
          error:
            "Image upload is temporarily unavailable because local object storage is full. Please free space in MinIO and try again.",
        },
        { status: 507 }
      );
    }

    return NextResponse.json({ error: "Image upload failed." }, { status: 500 });
  }
}
