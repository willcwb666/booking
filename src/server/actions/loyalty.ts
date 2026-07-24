"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Busca as configurações do Programa de Fidelidade da empresa.
 */
export async function getCompanyLoyaltyProgramAction(companySlug: string) {
  const company = await db.company.findFirst({
    where: { slug: companySlug },
    select: { id: true, currency: true },
  });

  if (!company) return { success: false, error: "Empresa não encontrada" };

  try {
    // Garante que a tabela exista via DDL resiliente
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "loyalty_program" (
        "id" TEXT PRIMARY KEY,
        "companyId" TEXT UNIQUE NOT NULL,
        "isEnabled" BOOLEAN NOT NULL DEFAULT true,
        "pointsPerCurrency" DECIMAL(10,2) NOT NULL DEFAULT 1.0,
        "rewardThreshold" INT NOT NULL DEFAULT 100,
        "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 20.00,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "loyalty_account" (
        "id" TEXT PRIMARY KEY,
        "companyId" TEXT NOT NULL,
        "customerEmail" TEXT NOT NULL,
        "points" INT NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE("companyId", "customerEmail")
      );
    `);
  } catch {
    // ignora
  }

  const rawProgram = await db.$queryRawUnsafe<Array<{
    id: string;
    isEnabled: boolean;
    pointsPerCurrency: number | string;
    rewardThreshold: number;
    discountAmount: number | string;
  }>>(`SELECT * FROM "loyalty_program" WHERE "companyId" = $1 LIMIT 1`, company.id);

  const topCustomers = await db.$queryRawUnsafe<Array<{
    customerEmail: string;
    points: number;
  }>>(`SELECT "customerEmail", "points" FROM "loyalty_account" WHERE "companyId" = $1 ORDER BY "points" DESC LIMIT 20`, company.id);

  const program = rawProgram[0] ?? {
    id: "",
    isEnabled: true,
    pointsPerCurrency: 1,
    rewardThreshold: 100,
    discountAmount: 20,
  };

  return {
    success: true,
    program: {
      isEnabled: Boolean(program.isEnabled),
      pointsPerCurrency: Number(program.pointsPerCurrency),
      rewardThreshold: Number(program.rewardThreshold),
      discountAmount: Number(program.discountAmount),
      currency: company.currency,
    },
    customers: topCustomers,
  };
}

/**
 * Atualiza ou cria as regras do Programa de Fidelidade.
 */
export async function updateCompanyLoyaltyProgramAction(
  companySlug: string,
  payload: {
    isEnabled: boolean;
    pointsPerCurrency: number;
    rewardThreshold: number;
    discountAmount: number;
  }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Não autenticado" };

  const company = await db.company.findFirst({
    where: { slug: companySlug },
    select: { id: true },
  });

  if (!company) return { success: false, error: "Empresa não encontrada" };

  const id = `loy_${Date.now()}`;
  await db.$executeRawUnsafe(
    `
    INSERT INTO "loyalty_program" (
      id, "companyId", "isEnabled", "pointsPerCurrency", "rewardThreshold", "discountAmount", "createdAt", "updatedAt"
    ) VALUES (
      $1, $2, $3, $4, $5, $6, NOW(), NOW()
    )
    ON CONFLICT ("companyId") DO UPDATE SET
      "isEnabled" = EXCLUDED."isEnabled",
      "pointsPerCurrency" = EXCLUDED."pointsPerCurrency",
      "rewardThreshold" = EXCLUDED."rewardThreshold",
      "discountAmount" = EXCLUDED."discountAmount",
      "updatedAt" = NOW();
  `,
    id,
    company.id,
    payload.isEnabled,
    payload.pointsPerCurrency,
    payload.rewardThreshold,
    payload.discountAmount
  );

  revalidatePath(`/${companySlug}/fidelidade`);
  return { success: true, message: "Regras do programa de fidelidade salvas!" };
}

/**
 * Creditamento automático de pontos ao concluir um atendimento.
 */
export async function awardLoyaltyPointsForBookingAction(bookingId: string, amountPaid: number) {
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
