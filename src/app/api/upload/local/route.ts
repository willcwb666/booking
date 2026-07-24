import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "Key não informada" }, { status: 400 });
  }

  // Prevenir Directory Traversal attack
  const sanitizedKey = path.normalize(key).replace(/^(\.\.[\/\\])+/, "");
  if (sanitizedKey.includes("..")) {
    return NextResponse.json({ error: "Key inválida" }, { status: 400 });
  }

  try {
    const arrayBuffer = await request.arrayBuffer();
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
