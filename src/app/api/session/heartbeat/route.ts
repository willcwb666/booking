import { NextResponse } from "next/server";
import { getActiveSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Batimento de sessão do painel.
 *
 * O servidor só enxerga atividade quando chega uma requisição — alguém
 * preenchendo um formulário longo ficaria "inativo" aos olhos da política e
 * seria deslogado no meio do trabalho. O guard do cliente chama este endpoint
 * enquanto houver interação real na página; `getActiveSession` renova o
 * `lastActivityAt` (ou revoga a sessão, se o limite já estourou).
 *
 * Não precisa de rate limit dedicado: o guard chama no máximo uma vez por
 * janela de batimento e o custo é um UPDATE por chave primária.
 */
export async function POST() {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ active: false }, { status: 401 });
  }
  return NextResponse.json({ active: true });
}
