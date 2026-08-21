"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { canAccessCompany } from "@/lib/admin-guard";
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

    /**
     * Antes daqui saia um `CREATE TABLE IF NOT EXISTS` a cada chamada — e esta
     * chamada e PUBLICA, entao quem criava a tabela era o primeiro visitante
     * anonimo a abrir um checkout. A tabela agora nasce em
     * `prisma/migrations`, como todas as outras.
     */
    const row = await db.companyPaymentGateway.findUnique({
      where: { companyId: company.id },
      select: { autoDetectGeo: true, activeMethods: true },
    });

    const defaultMethods: PaymentGatewayMethod[] = [
      { id: "pix", name: "Pix (Brasil)", region: "BR", enabled: true, accountDetails: "" },
      { id: "stripe_cc", name: "Cartão de Crédito / Débito (Stripe)", region: "GLOBAL", enabled: true },
      { id: "venmo", name: "Venmo (EUA)", region: "US", enabled: false, accountDetails: "@suaempresa" },
      { id: "zelle", name: "Zelle (EUA)", region: "US", enabled: false, accountDetails: "pagamentos@suaempresa.com" },
      { id: "cashapp", name: "Cash App (EUA)", region: "US", enabled: false, accountDetails: "$suaempresa" },
      { id: "ideal", name: "iDEAL (Europa)", region: "EU", enabled: false },
      { id: "sepa", name: "SEPA Direct Debit (Europa)", region: "EU", enabled: false },
    ];

    if (!row) {
      return {
        success: true,
        config: { autoDetectGeo: true, activeMethods: defaultMethods },
      };
    }

    // JSON gravado por nos, mas ainda assim de fora do processo: se estiver
    // corrompido, o checkout cai nos metodos padrao em vez de quebrar.
    let parsedMethods: PaymentGatewayMethod[] = [];
    try {
      const parsed: unknown = JSON.parse(row.activeMethods);
      if (Array.isArray(parsed)) parsedMethods = parsed as PaymentGatewayMethod[];
    } catch {
      console.error("[payment-gateways] activeMethods invalido", company.id);
    }

    return {
      success: true,
      config: {
        autoDetectGeo: row.autoDetectGeo,
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
  /**
   * Conferia que HAVIA sessao, nunca DE QUEM: qualquer usuario logado —
   * dono de outro salao, cliente cadastrado — reescrevia por qual gateway
   * QUALQUER empresa recebe, passando o slug. O slug e publico.
   *
   * MANAGER e nao EMPLOYEE: isto decide como o dinheiro entra.
   */
  const access = await canAccessCompany(companySlug, "MANAGER");
  if (!access.ok) return { success: false, error: access.error };
  const company = { id: access.companyId };

  try {
    const jsonMethods = JSON.stringify(config.activeMethods ?? []);

    await db.companyPaymentGateway.upsert({
      where: { companyId: company.id },
      create: {
        companyId: company.id,
        autoDetectGeo: config.autoDetectGeo,
        activeMethods: jsonMethods,
      },
      update: {
        autoDetectGeo: config.autoDetectGeo,
        activeMethods: jsonMethods,
      },
    });

    revalidatePath(`/${companySlug}/configuracoes`);
    revalidatePath(`/booking/${companySlug}`);
    return { success: true, message: "Métodos de pagamento internacionais atualizados!" };
  } catch (err) {
    console.error("Erro ao salvar payment gateways:", err);
    return { success: false, error: "Falha ao salvar configurações de pagamento." };
  }
}
