import "server-only";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const R2_ENDPOINT = process.env.R2_ENDPOINT ?? "";
const R2_BUCKET = process.env.R2_BUCKET_NAME ?? "";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? "";

function getS3Client() {
  return new S3Client({
    endpoint: R2_ENDPOINT,
    region: "auto",
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
  });
}

export type UploadType = "logo" | "avatar";

const ALLOWED_TYPES: Record<string, string[]> = {
  logo: ["image/jpeg", "image/png", "image/webp"],
  avatar: ["image/jpeg", "image/png", "image/webp"],
};

export async function generatePresignedUploadUrl(
  uploadType: UploadType,
  contentType: string,
  ext: string
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const allowed = ALLOWED_TYPES[uploadType];
  if (!allowed.includes(contentType)) {
    throw new Error(`Content-Type ${contentType} não permitido`);
  }

  const key = `${uploadType}/${randomUUID()}.${ext}`;
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 }); // 5 min
  const publicUrl = `${R2_PUBLIC_URL}/${key}`;

  return { uploadUrl, publicUrl, key };
}

export async function deleteR2Object(key: string): Promise<void> {
  const client = getS3Client();
  await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}
