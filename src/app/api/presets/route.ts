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
    const msg = err instanceof Error ? err.message : "Erro ao buscar presets";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
