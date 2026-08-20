import { NextRequest, NextResponse } from "next/server";
import { getAdminSegments } from "@/server/queries/admin-segments";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const onlyActive = searchParams.get("active") === "true";

  try {
    const segments = await getAdminSegments(onlyActive);
    return NextResponse.json({ segments });
  } catch (err) {
    // Rota pública — ver a nota em `api/presets`.
    console.error("[api/segments]", err);
    return NextResponse.json({ error: "Erro ao buscar segmentos" }, { status: 500 });
  }
}
