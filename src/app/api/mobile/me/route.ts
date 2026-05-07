import { NextRequest, NextResponse } from "next/server";
import { getMobileSession } from "../_auth";

export async function GET(req: NextRequest) {
  const session = await getMobileSession(req);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id, name, email } = session.user;
  return NextResponse.json({ id, name, email });
}
