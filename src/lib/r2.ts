import "server-only";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

function isR2Configured() {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;

  return Boolean(bucket && endpoint && accessKeyId && secretAccessKey);
}

function getS3Client() {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  return new S3Client({
    endpoint,
    region: "auto",
    credentials: {
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
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

  // Se as credenciais do R2/S3 estiverem configuradas, usa Cloudflare R2
  if (isR2Configured()) {
    const client = getS3Client();
    const bucket = process.env.R2_BUCKET_NAME!;
    const publicBaseUrl = process.env.R2_PUBLIC_URL ?? "";

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 }); // 5 min
    const publicUrl = publicBaseUrl ? `${publicBaseUrl}/${key}` : `/uploads/${key}`;

    return { uploadUrl, publicUrl, key };
  }

  // ── MODO FALLBACK LOCAL (LOCALHOST) ──
  // Se rodando em localhost sem credenciais R2, gera URLs de upload local
  const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
  const uploadUrl = `${baseUrl}/api/upload/local?key=${encodeURIComponent(key)}`;
  const publicUrl = `/uploads/${key}`;

  return { uploadUrl, publicUrl, key };
}

export async function deleteR2Object(key: string): Promise<void> {
  if (isR2Configured()) {
    const client = getS3Client();
    const bucket = process.env.R2_BUCKET_NAME!;
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } else {
    // Apagar do armazenamento local se existir
    try {
      const sanitizedKey = path.normalize(key).replace(/^(\.\.[\/\\])+/, "");
      const filePath = path.join(process.cwd(), "public", "uploads", sanitizedKey);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // ignora erro ao apagar arquivo local
    }
  }
}
