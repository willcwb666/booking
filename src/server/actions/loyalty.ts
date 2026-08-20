"use server";

import { db } from "@/lib/db";
import { canAccessModule } from "@/lib/module-guard";
import { MODULE_CODES } from "@/lib/module-codes";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
/**
 * Busca as configurações do Programa de Fidelidade da empresa.
 */
export async function getCompanyLoyaltyProgramAction(companySlug: string) {
  /**
   * ─── Isto NAO era um endpoint publico ──────────────────────────────────────
   *
   * O comentario que estava aqui dizia "endpoint publico: sem sessao para
   * responsabilizar, o limite de taxa e a unica barreira". Nao era verdade —
   * o unico chamador e a tela protegida `/[companySlug]/fidelidade`.
   *
   * E o que a funcao devolve, alem das regras do programa, e
   * `topCustomers`: os 20 clientes com mais pontos, COM E-MAIL. Sem sessao e
   * sem checar quem pergunta, bastava o slug — que e publico, esta na URL de
   * agendamento de toda empresa — para levar a lista de clientes de qualquer
   * salao da plataforma. O limite de taxa atrasa isso; nao impede.
   *
   * Server action e endpoint HTTP: nao herda a protecao do layout da pagina
   * que a chama. Quem sabe o nome dela, chama.
   */
  const access = await canAccessModule(companySlug, MODULE_CODES.loyalty);
  if (!access.ok) return { success: false, error: access.error, program: null };

  // O limite de taxa fica: agora atras da sessao, mas continua sendo o freio
  // contra automacao de dentro.
  const rlIp =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await enforceRateLimit(RATE_LIMITS.PUBLIC_COMPANY_INFO, rlIp);
  if (!rl.allowed) return { success: false, program: null };

  const company = await db.company.findFirst({
    where: { id: access.companyId },
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
  /**
   * Checava sessao e mais nada: qualquer usuario logado — dono de outro salao,
   * cliente cadastrado — reescrevia as regras de fidelidade de QUALQUER
   * empresa passando o slug. `canAccessModule` cobre as duas coisas que
   * faltavam: ser membro desta empresa, e a empresa ter o modulo contratado.
   */
  const access = await canAccessModule(companySlug, MODULE_CODES.loyalty);
  if (!access.ok) return { success: false, error: access.error };

  const company = { id: access.companyId };

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

// `awardLoyaltyPointsForBookingAction` saiu daqui para `src/lib/loyalty.ts`.
//
// Todo export de um arquivo `"use server"` e um endpoint HTTP. Esta funcao
// creditava pontos a partir de um `amountPaid` vindo do chamador, sem
// verificar nada: bastava chama-la em laco para encher a conta de fidelidade
// de qualquer cliente. Ela so e usada pelo fluxo interno de conclusao de
// atendimento, entao nao precisa ser action nenhuma.
