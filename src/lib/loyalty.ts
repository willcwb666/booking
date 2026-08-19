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
