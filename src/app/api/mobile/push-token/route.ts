import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMobileSession } from "../_auth";

export async function POST(req: NextRequest) {
  const session = await getMobileSession(req);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { token, platform } = await req.json();
  if (!token || !platform) {
    return NextResponse.json({ error: "token e platform são obrigatórios" }, { status: 400 });
  }

  // Upsert: if token already exists for this user, just update; otherwise create
  await db.pushToken.upsert({
    where: { userId_token: { userId: session.user.id, token } },
    update: { platform, updatedAt: new Date() },
    create: { userId: session.user.id, token, platform },
  });

  return NextResponse.json({ ok: true });
}
