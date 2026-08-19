"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type SystemModule = {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  monthlyPrice: number;
  lifetimePrice: number;
  billingType: "SUBSCRIPTION" | "ONE_TIME" | "BOTH";
  category: "GROWTH" | "OPERATIONS" | "FINANCE" | "AI";
  isActive: boolean;
};

export type ActiveCompanyLicenseRow = {
  id: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  businessType: string;
  moduleCode: string;
  moduleName: string;
  status: "ACTIVE" | "TRIAL" | "EXPIRED";
  expiresAt: string | null;
  grantedAt: string;
};

async function requireAdmin(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.role === "admin";
}

async function ensureTablesExist() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "system_module" (
      "id" TEXT PRIMARY KEY,
      "code" TEXT UNIQUE NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "icon" TEXT NOT NULL DEFAULT 'Tag',
      "monthlyPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
      "lifetimePrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
      "billingType" TEXT NOT NULL DEFAULT 'SUBSCRIPTION',
      "category" TEXT NOT NULL DEFAULT 'GROWTH',
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "company_module_license" (
      "id" TEXT PRIMARY KEY,
      "companyId" TEXT NOT NULL,
      "moduleCode" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "expiresAt" TIMESTAMP,
      "grantedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "grantedBy" TEXT NOT NULL DEFAULT 'SYSTEM',
      CONSTRAINT "uniq_company_module" UNIQUE ("companyId", "moduleCode")
    );
  `);
}

export async function getSystemModulesAction() {
  try {
    await ensureTablesExist();

    const defaultModules = [
      { code: "promocoes", name: "Promoções & Cupons Estratégicos", description: "Crie campanhas e cupons de desconto estratégicos para datas sazonais e retenção.", icon: "Tag", monthlyPrice: 29.9, lifetimePrice: 199.0, billingType: "BOTH", category: "GROWTH" },
      { code: "fidelidade", name: "Fidelidade & Pontos de Recompensa", description: "Programa de recompensas, cashback e acúmulo de pontos para recorrência.", icon: "Award", monthlyPrice: 39.9, lifetimePrice: 299.0, billingType: "BOTH", category: "GROWTH" },
      { code: "waitlist", name: "Lista de Espera Inteligente (Auto-Fill)", description: "Fila de espera automatizada para cancelamentos e horários disputados.", icon: "UserCheck", monthlyPrice: 39.9, lifetimePrice: 249.0, billingType: "BOTH", category: "OPERATIONS" },
      { code: "clube_assinaturas", name: "Clube de Assinaturas & Mensalidades", description: "Crie planos mensais de serviços ilimitados ou pacotes com receita recorrente.", icon: "CreditCard", monthlyPrice: 79.9, lifetimePrice: 0.0, billingType: "SUBSCRIPTION", category: "FINANCE" },
      { code: "gift_cards", name: "Vales-Presente & Gift Cards Digitais", description: "Venda e gerencie vales-presente digitais com saldo fracionável e código único.", icon: "Gift", monthlyPrice: 39.9, lifetimePrice: 249.0, billingType: "BOTH", category: "GROWTH" },
      { code: "comanda_pos", name: "Comanda Rápida POS & Venda de Estoque", description: "Fechamento de comanda com adição de produtos físicos do estoque e balcão.", icon: "ClipboardList", monthlyPrice: 49.9, lifetimePrice: 349.0, billingType: "BOTH", category: "OPERATIONS" },
      { code: "smart_rebooking", name: "Smart Rebooking & Lembretes IA WhatsApp", description: "Disparo inteligente de mensagens para remarcação de clientes no ciclo habitual.", icon: "Bell", monthlyPrice: 59.9, lifetimePrice: 0.0, billingType: "SUBSCRIPTION", category: "AI" },
      { code: "ai_booking_copilot", name: "Secretária & Concierge IA 24/7 (Texto & Voz)", description: "Agendamento autônomo por texto e voz com IA Google Gemini Flash e NLP.", icon: "Sparkles", monthlyPrice: 69.9, lifetimePrice: 0.0, billingType: "SUBSCRIPTION", category: "AI" },
      { code: "split_pagamentos", name: "Split Automático de Comissões (Grana/Financeiro)", description: "Divisão instantânea de comissões por atendimento e profissional da equipe.", icon: "DollarSign", monthlyPrice: 49.9, lifetimePrice: 0.0, billingType: "SUBSCRIPTION", category: "FINANCE" },
      { code: "ghost_slot_buster", name: "Ghost Slot Buster (Desistências Relâmpago)", description: "Preenchimento instantâneo de cancelamentos de última hora com desconto dinâmico.", icon: "Zap", monthlyPrice: 39.9, lifetimePrice: 0.0, billingType: "SUBSCRIPTION", category: "OPERATIONS" },
      { code: "checkin_geofencing", name: "Check-in Inteligente com Geofencing & GPS", description: "Validação de chegada do cliente por proximidade GPS e janela de horário estilo DMV.", icon: "MapPin", monthlyPrice: 49.9, lifetimePrice: 0.0, billingType: "SUBSCRIPTION", category: "OPERATIONS" },
      { code: "vip_experience", name: "Ficha VIP & Experiência Personalizada", description: "Preferências de atendimento com modo silencioso, bebidas na recepção e sensibilidade.", icon: "Star", monthlyPrice: 29.9, lifetimePrice: 0.0, billingType: "SUBSCRIPTION", category: "GROWTH" },
      { code: "dynamic_return", name: "Dynamic Return Anchor (Reagendamento Imediato)", description: "Ancoragem de retorno calculando a cadência ideal do cliente com desconto pós-atendimento.", icon: "RotateCcw", monthlyPrice: 39.9, lifetimePrice: 0.0, billingType: "SUBSCRIPTION", category: "GROWTH" },
      { code: "relatorios_avancados", name: "DRE & Relatórios Executivos Avançados", description: "Demonstrativo financeiro completo, métricas de faturamento, CAC, LTV e ticket médio.", icon: "FileText", monthlyPrice: 49.9, lifetimePrice: 0.0, billingType: "SUBSCRIPTION", category: "FINANCE" },
    ];

    for (const m of defaultModules) {
      await db.$executeRawUnsafe(
        `INSERT INTO "system_module" ("id", "code", "name", "description", "icon", "monthlyPrice", "lifetimePrice", "billingType", "category", "isActive")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
         ON CONFLICT ("code") DO UPDATE SET
           "name" = EXCLUDED."name",
           "description" = EXCLUDED."description",
           "icon" = EXCLUDED."icon",
           "monthlyPrice" = EXCLUDED."monthlyPrice",
           "lifetimePrice" = EXCLUDED."lifetimePrice",
           "billingType" = EXCLUDED."billingType",
           "category" = EXCLUDED."category"`,
        `mod_${m.code}`, m.code, m.name, m.description, m.icon, m.monthlyPrice, m.lifetimePrice, m.billingType, m.category
      );
    }

    const rows = await db.$queryRawUnsafe<Array<any>>(`SELECT * FROM "system_module" ORDER BY "name" ASC`);
    const modules: SystemModule[] = rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      icon: r.icon || "Tag",
      monthlyPrice: Number(r.monthlyPrice || 0),
      lifetimePrice: Number(r.lifetimePrice || 0),
      billingType: r.billingType || "SUBSCRIPTION",
      category: r.category || "GROWTH",
      isActive: r.isActive ?? true,
    }));

    return { success: true, modules };
  } catch (err) {
    console.error("Erro ao buscar módulos do sistema:", err);
    return { success: false, modules: [] };
  }
}

export async function getAllActiveCompanyLicensesAction(): Promise<{
  success: boolean;
  licenses: ActiveCompanyLicenseRow[];
}> {
  try {
    await ensureTablesExist();
    const rows = await db.$queryRawUnsafe<Array<any>>(`
      SELECT 
        l.id,
        l."companyId",
        c.name as "companyName",
        c.slug as "companySlug",
        c."businessType",
        l."moduleCode",
        COALESCE(m.name, l."moduleCode") as "moduleName",
        l.status,
        l."expiresAt",
        l."grantedAt"
      FROM "company_module_license" l
      LEFT JOIN "company" c ON c.id = l."companyId"
      LEFT JOIN "system_module" m ON m.code = l."moduleCode"
      WHERE c.id IS NOT NULL
      ORDER BY l."grantedAt" DESC
    `);

    const licenses: ActiveCompanyLicenseRow[] = rows.map((r) => ({
      id: r.id,
      companyId: r.companyId,
      companyName: r.companyName || "Empresa Desconhecida",
      companySlug: r.companySlug || "",
      businessType: r.businessType || "OTHER",
      moduleCode: r.moduleCode,
      moduleName: r.moduleName,
      status: r.status,
      expiresAt: r.expiresAt ? new Date(r.expiresAt).toISOString() : null,
      grantedAt: r.grantedAt ? new Date(r.grantedAt).toISOString() : new Date().toISOString(),
    }));

    return { success: true, licenses };
  } catch (err) {
    console.error("Erro ao carregar licenças de módulos:", err);
    return { success: false, licenses: [] };
  }
}

export async function getCompanyLicensedModuleCodesAction(
  companySlugOrId: string
): Promise<string[]> {
  try {
    await ensureTablesExist();

    const company = await db.company.findFirst({
      where: {
        OR: [{ slug: companySlugOrId }, { id: companySlugOrId }],
      },
      select: { id: true },
    });

    if (!company) {
      return [];
    }

    const rows = await db.$queryRawUnsafe<Array<{ moduleCode: string }>>(
      `SELECT "moduleCode" 
       FROM "company_module_license" 
       WHERE "companyId" = $1 
         AND ("expiresAt" IS NULL OR "expiresAt" > NOW())`,
      company.id
    );

    return rows.map((r) => r.moduleCode);
  } catch (err) {
    console.error("Erro ao obter módulos licenciados da empresa:", err);
    return [];
  }
}

export async function grantBatchModuleLicensesAction(
  companyIds: string[],
  moduleConfigs: Array<{ moduleCode: string; isTrial: boolean; trialDays: number }>
): Promise<{ success: boolean; message?: string; error?: string }> {
  const isAdmin = await requireAdmin();
  if (!isAdmin) return { success: false, error: "Acesso não autorizado." };

  try {
    await ensureTablesExist();

    for (const companyId of companyIds) {
      for (const config of moduleConfigs) {
        const expiresAt = config.isTrial
          ? new Date(Date.now() + config.trialDays * 24 * 60 * 60 * 1000)
          : null;

        const status = config.isTrial ? "TRIAL" : "ACTIVE";

        await db.$executeRawUnsafe(
          `INSERT INTO "company_module_license" ("id", "companyId", "moduleCode", "status", "expiresAt", "grantedAt", "grantedBy")
           VALUES ($1, $2, $3, $4, $5, NOW(), 'SUPER_ADMIN')
           ON CONFLICT ("companyId", "moduleCode") DO UPDATE SET
             "status" = EXCLUDED."status",
             "expiresAt" = EXCLUDED."expiresAt",
             "grantedAt" = NOW()`,
          `lic_${companyId}_${config.moduleCode}`,
          companyId,
          config.moduleCode,
          status,
          expiresAt
        );
      }
    }

    revalidatePath("/admin/modulos");
    return { success: true, message: `${moduleConfigs.length} módulo(s) liberado(s) com sucesso para ${companyIds.length} empresa(s).` };
  } catch (err) {
    console.error("Erro ao conceder licenças de módulos:", err);
    return { success: false, error: "Falha ao gravar licenças no banco de dados." };
  }
}

export async function renewModuleLicenseAction(
  companyId: string,
  moduleCode: string,
  additionalDays: number = 30
): Promise<{ success: boolean; message?: string; error?: string }> {
  const isAdmin = await requireAdmin();
  if (!isAdmin) return { success: false, error: "Acesso não autorizado." };

  try {
    const rows = await db.$queryRawUnsafe<Array<any>>(
      `SELECT * FROM "company_module_license" WHERE "companyId" = $1 AND "moduleCode" = $2`,
      companyId,
      moduleCode
    );

    if (!rows || rows.length === 0) {
      return { success: false, error: "Licença não encontrada." };
    }

    const currentExpires = rows[0].expiresAt ? new Date(rows[0].expiresAt) : new Date();
    const baseDate = currentExpires > new Date() ? currentExpires : new Date();
    const newExpires = new Date(baseDate.getTime() + additionalDays * 24 * 60 * 60 * 1000);

    await db.$executeRawUnsafe(
      `UPDATE "company_module_license"
       SET "expiresAt" = $1, "status" = 'TRIAL'
       WHERE "companyId" = $2 AND "moduleCode" = $3`,
      newExpires,
      companyId,
      moduleCode
    );

    revalidatePath("/admin/modulos");
    return { success: true, message: `Licença renovada por +${additionalDays} dias.` };
  } catch (err) {
    console.error("Erro ao renovar licença:", err);
    return { success: false, error: "Falha ao renovar licença." };
  }
}

export async function revokeModuleLicenseAction(
  companyId: string,
  moduleCode: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const isAdmin = await requireAdmin();
  if (!isAdmin) return { success: false, error: "Acesso não autorizado." };

  try {
    await db.$executeRawUnsafe(
      `DELETE FROM "company_module_license" WHERE "companyId" = $1 AND "moduleCode" = $2`,
      companyId,
      moduleCode
    );
    revalidatePath("/admin/modulos");
    return { success: true, message: "Licença revogada com sucesso." };
  } catch (err) {
    console.error("Erro ao revogar licença:", err);
    return { success: false, error: "Falha ao revogar licença." };
  }
}
