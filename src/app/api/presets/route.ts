import { NextRequest, NextResponse } from "next/server";
import { getActivePresetsByBusinessType } from "@/server/queries/admin-presets";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const businessType = searchParams.get("businessType");

  if (!businessType) {
    return NextResponse.json({ error: "businessType é obrigatório" }, { status: 400 });
  }

  try {
    const presets = await getActivePresetsByBusinessType(businessType);
    return NextResponse.json({ presets });
  } catch (err) {
    // A mensagem do erro fica no log do servidor, não na resposta. Esta rota
    // é pública e sem sessão: devolver `err.message` entrega nome de coluna,
    // trecho de SQL e caminho de arquivo a quem só precisou provocar um 500.
    console.error("[api/presets]", err);
    return NextResponse.json({ error: "Erro ao buscar presets" }, { status: 500 });
  }
}
