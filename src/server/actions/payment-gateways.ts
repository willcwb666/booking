"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
export type PaymentGatewayMethod = {
  id: string;
  name: string;
  region: "BR" | "US" | "EU" | "GLOBAL";
  enabled: boolean;
  accountDetails?: string; // ex: Chave Pix, @venmo, email Zelle, $cashtag
};

export type CompanyPaymentConfig = {
  autoDetectGeo: boolean;
  activeMethods: PaymentGatewayMethod[];
};

export async function getCompanyPaymentGatewaysAction(companySlug: string): Promise<{
  success: boolean;
  config: CompanyPaymentConfig;
}> {
  // Endpoint público: sem sessão para responsabilizar, o limite de taxa é a
  // única barreira contra abuso e enumeração por slug.
  const rlIp =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await enforceRateLimit(RATE_LIMITS.PUBLIC_COMPANY_INFO, rlIp);
  if (!rl.allowed) {
    return { success: false, config: { autoDetectGeo: true, activeMethods: [] } };
  }

  try {
    const company = await db.company.findFirst({
      where: { slug: companySlug },
      select: { id: true, currency: true },
    });

    if (!company) {
      return {
        success: false,
        config: { autoDetectGeo: true, activeMethods: [] },
      };
    }

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "company_payment_gateway" (
        "companyId" TEXT PRIMARY KEY,
        "autoDetectGeo" BOOLEAN NOT NULL DEFAULT true,
        "activeMethods" TEXT NOT NULL DEFAULT '[]',
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    const rows = await db.$queryRawUnsafe<Array<{
      autoDetectGeo: boolean;
      activeMethods: string;
    }>>(`SELECT * FROM "company_payment_gateway" WHERE "companyId" = $1 LIMIT 1`, company.id);

    const defaultMethods: PaymentGatewayMethod[] = [
      { id: "pix", name: "Pix (Brasil)", region: "BR", enabled: true, accountDetails: "" },
      { id: "stripe_cc", name: "Cartão de Crédito / Débito (Stripe)", region: "GLOBAL", enabled: true },
      { id: "venmo", name: "Venmo (EUA)", region: "US", enabled: false, accountDetails: "@suaempresa" },
      { id: "zelle", name: "Zelle (EUA)", region: "US", enabled: false, accountDetails: "pagamentos@suaempresa.com" },
      { id: "cashapp", name: "Cash App (EUA)", region: "US", enabled: false, accountDetails: "$suaempresa" },
      { id: "ideal", name: "iDEAL (Europa)", region: "EU", enabled: false },
      { id: "sepa", name: "SEPA Direct Debit (Europa)", region: "EU", enabled: false },
    ];

    if (rows.length === 0) {
      return {
        success: true,
        config: { autoDetectGeo: true, activeMethods: defaultMethods },
      };
    }

    let parsedMethods: PaymentGatewayMethod[] = [];
    try {
      parsedMethods = JSON.parse(rows[0].activeMethods);
    } catch {}

    return {
      success: true,
      config: {
        autoDetectGeo: rows[0].autoDetectGeo ?? true,
        activeMethods: parsedMethods.length > 0 ? parsedMethods : defaultMethods,
      },
    };
  } catch (err) {
    console.error("Erro ao buscar payment gateways:", err);
    return {
      success: true,
      config: { autoDetectGeo: true, activeMethods: [] },
    };
  }
}

export async function updateCompanyPaymentGatewaysAction(
  companySlug: string,
  config: CompanyPaymentConfig
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Não autenticado" };

  const company = await db.company.findFirst({
    where: { slug: companySlug },
    select: { id: true },
  });

  if (!company) return { success: false, error: "Empresa não encontrada" };

  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "company_payment_gateway" (
        "companyId" TEXT PRIMARY KEY,
        "autoDetectGeo" BOOLEAN NOT NULL DEFAULT true,
        "activeMethods" TEXT NOT NULL DEFAULT '[]',
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    const jsonMethods = JSON.stringify(config.activeMethods || []);

    await db.$executeRawUnsafe(
      `
      INSERT INTO "company_payment_gateway" (
        "companyId", "autoDetectGeo", "activeMethods", "updatedAt"
      ) VALUES (
        $1, $2, $3, NOW()
      )
      ON CONFLICT ("companyId") DO UPDATE SET
        "autoDetectGeo" = EXCLUDED."autoDetectGeo",
        "activeMethods" = EXCLUDED."activeMethods",
        "updatedAt" = NOW()
    `,
      company.id,
      config.autoDetectGeo,
      jsonMethods
    );

    revalidatePath(`/${companySlug}/configuracoes`);
    revalidatePath(`/booking/${companySlug}`);
    return { success: true, message: "Métodos de pagamento internacionais atualizados!" };
  } catch (err) {
    console.error("Erro ao salvar payment gateways:", err);
    return { success: false, error: "Falha ao salvar configurações de pagamento." };
  }
}
