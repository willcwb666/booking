import { NextRequest, NextResponse } from "next/server";
import { getActiveSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import fs from "fs";
import path from "path";

// Só imagens raster — evita XSS armazenado via .svg/.html servido do próprio domínio
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Este caminho grava em `public/uploads` no disco da instância. Serve só para
 * desenvolvimento sem R2 configurado.
 *
 * Em produção ele está DESLIGADO de propósito: em runtime serverless o
 * filesystem é efêmero e somente leitura fora de /tmp, então o upload ou falha
 * ou some no próximo deploy; com mais de uma instância, a logo enviada
 * aparece só para quem cai na máquina que gravou. O caminho correto é o
 * presigned URL do R2 (`/api/upload/presign`).
 *
 * Para habilitar conscientemente num servidor único com disco persistente,
 * defina ALLOW_LOCAL_UPLOADS=true.
 */
const LOCAL_UPLOADS_ENABLED =
  process.env.NODE_ENV !== "production" || process.env.ALLOW_LOCAL_UPLOADS === "true";

export async function PUT(request: NextRequest): Promise<NextResponse> {
  if (!LOCAL_UPLOADS_ENABLED) {
    return NextResponse.json(
      {
        error:
          "Upload local indisponível nesta instalação. Configure o armazenamento de arquivos (R2).",
      },
      { status: 503 }
    );
  }

  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const rl = await rateLimit(`upload:local:${session.user.id}`, 10, 60);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Tente novamente em instantes." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "Key não informada" }, { status: 400 });
  }

  // Prevenir Directory Traversal attack
  const sanitizedKey = path.normalize(key).replace(/^(\.\.[\/\\])+/, "");
  if (sanitizedKey.includes("..") || path.isAbsolute(sanitizedKey)) {
    return NextResponse.json({ error: "Key inválida" }, { status: 400 });
  }

  // Whitelist de extensão — nunca gravar tipos executáveis/HTML/SVG
  const ext = path.extname(sanitizedKey).slice(1).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json({ error: "Extensão não permitida" }, { status: 400 });
  }

  try {
    const arrayBuffer = await request.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Arquivo excede 5 MB" }, { status: 413 });
    }
    const buffer = Buffer.from(arrayBuffer);

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    const filePath = path.join(uploadsDir, sanitizedKey);
    const fileDir = path.dirname(filePath);

    // Garantir que a pasta de destino exista no disco local
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    // Salvar o arquivo localmente em public/uploads/
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ success: true, key: sanitizedKey });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao salvar arquivo local";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
