import "server-only";
import { db } from "@/lib/db";

/**
 * Creditamento de pontos de fidelidade ao concluir um atendimento.
 *
 * Vive aqui, e nao em `server/actions`, de proposito: em um arquivo
 `"use server"` todo export vira endpoint publico, e esta funcao credita
 * pontos a partir de um valor informado pelo chamador. So o fluxo interno
 * pos-pagamento deve aciona-la.
 */
export async function awardLoyaltyPointsForBooking(bookingId: string, amountPaid: number) {
  try {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { customerDetail: { select: { email: true } } },
    });

    if (!booking || !booking.customerDetail?.email) return;

    /**
     * Credita UMA vez por atendimento.
     *
     * A marca é gravada antes de somar, com `updateMany` condicional: duas
     * chamadas simultâneas disputam a mesma linha e só uma vê `count === 1`.
     * Sem isso, concluir o atendimento duas vezes — dois cliques, ou reabrir e
     * concluir de novo — creditava os pontos duas vezes. Ponto vira desconto e
     * vira serviço: creditar em dobro é emitir dinheiro.
     */
    const claim = await db.booking.updateMany({
      where: { id: bookingId, loyaltyAwardedAt: null },
      data: { loyaltyAwardedAt: new Date() },
    });
    if (claim.count !== 1) return;

    const email = booking.customerDetail.email.toLowerCase().trim();
    const rawProgram = await db.$queryRawUnsafe<Array<{
      isEnabled: boolean;
      pointsPerCurrency: number | string;
    }>>(`SELECT "isEnabled", "pointsPerCurrency" FROM "loyalty_program" WHERE "companyId" = $1 LIMIT 1`, booking.companyId);

    if (!rawProgram[0] || !rawProgram[0].isEnabled) return;

    const rate = Number(rawProgram[0].pointsPerCurrency || 1);
    const pointsEarned = Math.floor(amountPaid * rate);

    if (pointsEarned <= 0) return;

    const accountId = `lac_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.$executeRawUnsafe(
      `
      INSERT INTO "loyalty_account" (id, "companyId", "customerEmail", "points", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT ("companyId", "customerEmail") DO UPDATE SET
        "points" = "loyalty_account"."points" + EXCLUDED."points",
        "updatedAt" = NOW();
    `,
      accountId,
      booking.companyId,
      email,
      pointsEarned
    );
  } catch (err) {
    console.error("[loyalty] Error awarding points:", err);
  }
}
