import { NextRequest, NextResponse } from "next/server";
import { getActiveSession } from "@/lib/session";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { generatePresignedUploadUrl, type UploadType } from "@/lib/r2";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getActiveSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const rl = await enforceRateLimit(RATE_LIMITS.UPLOAD, session.user.id);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas requisições. Tente novamente em instantes." },
      { status: 429 }
    );
  }

  const body = await request.json() as { type?: string; contentType?: string; ext?: string };
  const { type, contentType, ext } = body;

  if (!type || !contentType) {
    return NextResponse.json({ error: "type e contentType são obrigatórios" }, { status: 400 });
  }

  if (!["logo", "avatar"].includes(type)) {
    return NextResponse.json({ error: "type inválido" }, { status: 400 });
  }

  // Derive extension from contentType — never trust client-supplied ext
  const EXT_MAP: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const safeExt = EXT_MAP[contentType];
  if (!safeExt) {
    return NextResponse.json({ error: "contentType não suportado" }, { status: 400 });
  }

  try {
    const result = await generatePresignedUploadUrl(type as UploadType, contentType, safeExt);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao gerar URL";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
