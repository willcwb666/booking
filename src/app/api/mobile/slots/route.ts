import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/agenda";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const agendaId = searchParams.get("agendaId");
  const date = searchParams.get("date");

  if (!agendaId || !date) {
    return NextResponse.json({ error: "Parâmetros agendaId e date são obrigatórios" }, { status: 400 });
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Formato de data inválido. Use YYYY-MM-DD" }, { status: 400 });
  }

  const available = await getAvailableSlots(agendaId, date);
  return NextResponse.json(available);
}
