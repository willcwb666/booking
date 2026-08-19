import "server-only";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
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

export type UploadType = "logo" | "avatar" | "client-photo";

const ALLOWED_TYPES: Record<string, string[]> = {
  logo: ["image/jpeg", "image/png", "image/webp"],
  avatar: ["image/jpeg", "image/png", "image/webp"],
  "client-photo": ["image/jpeg", "image/png", "image/webp"],
};

/**
 * Tipos cuja URL pública NÃO deve ser usada.
 *
 * Logo e avatar são para aparecer — a URL pública é o produto. Foto de cliente
 * é o oposto: só pode ser vista por quem tem acesso à empresa, e só enquanto o
 * link assinado durar.
 */
const PRIVATE_TYPES: ReadonlySet<string> = new Set<UploadType>(["client-photo"]);

export function isPrivateUploadType(uploadType: string): boolean {
  return PRIVATE_TYPES.has(uploadType);
}

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

/**
 * URL de leitura assinada, de vida curta.
 *
 * É o que separa "foto guardada" de "foto publicada". Com URL pública, o
 * endereço da foto de um cliente vale para sempre e para qualquer um que o
 * tenha — um print, uma linha de log, o histórico do navegador de um
 * computador compartilhado no salão. Assinada, o link morre em minutos.
 *
 * Sem R2 configurado (desenvolvimento local), devolve o caminho do arquivo
 * servido de `public/uploads`. Esse modo NÃO protege nada: é fallback de
 * desenvolvimento, e é mais uma razão para não usá-lo com foto de cliente real.
 */
export async function generatePresignedDownloadUrl(
  key: string,
  expiresInSeconds = 300
): Promise<string> {
  if (!isR2Configured()) return `/uploads/${key}`;

  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
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
