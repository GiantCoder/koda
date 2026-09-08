import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { downloadFromStorage, uploadToStorage } from "@/src/lib/storage";

const execFileAsync = promisify(execFile);

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

/** In-flight remuxes so concurrent stream requests don't duplicate work. */
const inflight = new Map<string, Promise<string>>();

/**
 * Storage key for a browser-safe derivative.
 * Some iPhone/Core Media clips change AAC sample rate mid-stream (48k→44.1k),
 * which Chromium rejects with MEDIA_ERR_DECODE and a black/unplayable player.
 */
export function webSafePlaybackKey(storagePath: string): string {
  if (storagePath.endsWith(".websafe.mp4")) return storagePath;
  return `${storagePath}.websafe.mp4`;
}

async function objectExists(key: string): Promise<boolean> {
  try {
    await storageClient.send(
      new HeadObjectCommand({
        Bucket: videosBucket,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure a web-safe playback object exists in storage and return its key.
 * Remuxes with video copy + audio stripped (analysis playback doesn't need audio).
 */
export async function ensureWebSafePlayback(storagePath: string): Promise<string> {
  const safeKey = webSafePlaybackKey(storagePath);
  if (safeKey === storagePath) return storagePath;

  if (await objectExists(safeKey)) {
    return safeKey;
  }

  const existing = inflight.get(storagePath);
  if (existing) return existing;

  const job = (async () => {
    const dir = await mkdtemp(join(tmpdir(), "koda-websafe-"));
    const inputPath = join(dir, "input.mp4");
    const outputPath = join(dir, "output.mp4");
    try {
      const original = await downloadFromStorage(storagePath);
      await writeFile(inputPath, original);

      // Copy video bitstream; drop audio to avoid midstream sample-rate changes
      // that break Chromium (PIPELINE_ERROR_DECODE). +faststart helps progressive play.
      await execFileAsync(
        "ffmpeg",
        [
          "-y",
          "-i",
          inputPath,
          "-map",
          "0:v:0",
          "-c:v",
          "copy",
          "-an",
          "-movflags",
          "+faststart",
          outputPath,
        ],
        { timeout: 120_000, maxBuffer: 8 * 1024 * 1024 }
      );

      const safeBuffer = await readFile(outputPath);
      await uploadToStorage(safeKey, safeBuffer, "video/mp4");
      return safeKey;
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      inflight.delete(storagePath);
    }
  })();

  inflight.set(storagePath, job);
  return job;
}
