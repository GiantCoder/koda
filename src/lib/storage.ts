import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";

const client = new S3Client({
  region: process.env.STORAGE_REGION ?? "eu-west-1",
  endpoint: process.env.STORAGE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY ?? "",
    secretAccessKey: process.env.STORAGE_SECRET_KEY ?? "",
  },
  forcePathStyle: true,
});

const videosBucket = process.env.STORAGE_BUCKET_VIDEOS ?? "koda-videos";

/** Upload a buffer into storage bucket. */
export async function uploadToStorage(key: string, buffer: Buffer, contentType: string): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: videosBucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
}

/** Generate a presigned URL for object access. */
export async function getSignedUrl(key: string, expirySeconds: number): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: videosBucket,
    Key: key,
  });
  return awsGetSignedUrl(client, command, { expiresIn: expirySeconds });
}

/** Delete object from storage bucket. */
export async function deleteFromStorage(key: string): Promise<void> {
  await client.send(
    new DeleteObjectCommand({
      Bucket: videosBucket,
      Key: key,
    })
  );
}
