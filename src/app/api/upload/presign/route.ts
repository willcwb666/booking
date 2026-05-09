import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { generatePresignedUploadUrl, type UploadType } from "@/lib/r2";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json() as { type?: string; contentType?: string; ext?: string };
  const { type, contentType, ext } = body;

  if (!type || !contentType || !ext) {
    return NextResponse.json({ error: "type, contentType e ext são obrigatórios" }, { status: 400 });
  }

  if (!["logo", "avatar"].includes(type)) {
    return NextResponse.json({ error: "type inválido" }, { status: 400 });
  }

  try {
    const result = await generatePresignedUploadUrl(type as UploadType, contentType, ext);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao gerar URL";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
