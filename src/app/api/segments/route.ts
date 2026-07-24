import { NextRequest, NextResponse } from "next/server";
import { getAdminSegments } from "@/server/queries/admin-segments";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const onlyActive = searchParams.get("active") === "true";

  try {
    const segments = await getAdminSegments(onlyActive);
    return NextResponse.json({ segments });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao buscar segmentos";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
