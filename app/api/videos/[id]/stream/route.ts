import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { ensureWebSafePlayback } from "@/src/lib/videos/web-safe-playback";

const idParamSchema = z.object({
  id: z.string().uuid(),
});

const storageClient = new S3Client({
  region: process.env.STORAGE_REGION ?? "eu-west-1",
  endpoint: process.env.STORAGE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY ?? "",
    secretAccessKey: process.env.STORAGE_SECRET_KEY ?? "",
  },
  forcePathStyle: true,
});

const videosBucket = process.env.STORAGE_BUCKET_VIDEOS ?? "koda-videos";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  const paramResult = idParamSchema.safeParse(await params);
  if (!paramResult.success) {
    return NextResponse.json(
      { error: "Invalid video ID", details: paramResult.error.flatten() },
      { status: 400 }
    );
  }

  const { id } = paramResult.data;
  const video = user
    ? await prisma.video.findFirst({
        where: { id, userId: user.id, isDeleted: false },
        select: { storagePath: true },
      })
    : process.env.NODE_ENV !== "production"
      ? await prisma.video.findFirst({
          where: { id, isDeleted: false },
          select: { storagePath: true },
        })
      : null;

  if (!video) {
    return NextResponse.json(
      { error: user ? "Video not found" : "Unauthorized" },
      { status: user ? 404 : 401 }
    );
  }

  // Prefer a browser-safe remux (strips broken midstream AAC sample-rate changes).
  // Fall back to the original object if remux fails so playback isn't hard-down.
  let storageKey = video.storagePath;
  try {
    storageKey = await ensureWebSafePlayback(video.storagePath);
  } catch (error) {
    console.error(
      JSON.stringify({
        tag: "video.stream.websafeFailed",
        videoId: id,
        storagePath: video.storagePath,
        error: error instanceof Error ? error.message : String(error),
      })
    );
    storageKey = video.storagePath;
  }

  const range = request.headers.get("range") ?? undefined;
  const object = await storageClient.send(
    new GetObjectCommand({
      Bucket: videosBucket,
      Key: storageKey,
      Range: range,
    })
  );

  if (!object.Body) {
    return NextResponse.json({ error: "Video stream unavailable" }, { status: 404 });
  }

  const bodyStream =
    typeof object.Body.transformToWebStream === "function"
      ? object.Body.transformToWebStream()
      : (Readable.toWeb(object.Body as Readable) as ReadableStream);

  const headers = new Headers({
    "Content-Type": object.ContentType ?? "video/mp4",
    "Accept-Ranges": "bytes",
    // Short cache; playback= query also busts browsers that cached broken originals.
    "Cache-Control": "private, max-age=60",
    "X-Koda-Playback": storageKey === video.storagePath ? "original" : "websafe",
  });

  if (object.ContentLength != null) {
    headers.set("Content-Length", String(object.ContentLength));
  }
  if (object.ContentRange) {
    headers.set("Content-Range", object.ContentRange);
  }

  return new NextResponse(bodyStream, {
    status: object.ContentRange ? 206 : 200,
    headers,
  });
}
