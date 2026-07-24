import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Reivindica um orçamento criado antes do login e vincula à conta.
 * Fluxo: "Salvar orçamento" sem sessão → login/cadastro →
 * GET /orcamentos/claim?estimate=<id> → redirect /orcamentos
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const estimateId = request.nextUrl.searchParams.get("estimate");
  if (estimateId) {
    const estimate = await db.estimate.findFirst({
      where: {
        id: estimateId,
        status: { in: ["DRAFT", "PENDING"] },
        // Só reivindica orçamentos ainda sem dono (ou já do próprio usuário)
        OR: [{ customerId: null }, { customerId: session.user.id }],
      },
      include: { serviceTypes: { select: { id: true } } },
    });

    if (estimate && estimate.serviceTypes.length > 0) {
      await db.estimate.update({
        where: { id: estimate.id },
        data: {
          status: "PENDING",
          customerId: session.user.id,
          customerName: estimate.customerName ?? session.user.name,
          customerEmail: estimate.customerEmail ?? session.user.email,
        },
      });
      return NextResponse.redirect(new URL("/orcamentos?salvo=1", request.url));
    }
  }

  return NextResponse.redirect(new URL("/orcamentos", request.url));
}
