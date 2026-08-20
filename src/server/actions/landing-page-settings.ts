"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { canAccessCompany } from "@/lib/admin-guard";
export type CompanyLandingPageConfig = {
  heroTitle: string;
  heroSubtitle: string;
  bannerUrl: string;
  accentColor: string;
  featuredServiceIds: string[];
  showTestimonials: boolean;
  customWelcomeMessage: string;
};

export async function getCompanyLandingPageConfigAction(companySlug: string): Promise<{
  success: boolean;
  config: CompanyLandingPageConfig;
}> {
  // Endpoint público: sem sessão para responsabilizar, o limite de taxa é a
  // única barreira contra abuso e enumeração por slug.
  const rlIp =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await enforceRateLimit(RATE_LIMITS.PUBLIC_COMPANY_INFO, rlIp);
  if (!rl.allowed) {
    return {
      success: false,
      config: {
        heroTitle: "Bem-vindo!",
        heroSubtitle: "Agende seus serviços com facilidade e praticidade.",
        bannerUrl: "",
        accentColor: "#635bff",
        featuredServiceIds: [],
        showTestimonials: true,
        customWelcomeMessage: "",
      },
    };
  }

  try {
    const company = await db.company.findFirst({
      where: { slug: companySlug },
      select: { id: true, name: true },
    });

    if (!company) {
      return {
        success: false,
        config: {
          heroTitle: "Bem-vindo!",
          heroSubtitle: "Agende seus serviços com facilidade e praticidade.",
          bannerUrl: "",
          accentColor: "#635bff",
          featuredServiceIds: [],
          showTestimonials: true,
          customWelcomeMessage: "",
        },
      };
    }

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "company_landing_config" (
        "companyId" TEXT PRIMARY KEY,
        "heroTitle" TEXT NOT NULL,
        "heroSubtitle" TEXT NOT NULL,
        "bannerUrl" TEXT NOT NULL DEFAULT '',
        "accentColor" TEXT NOT NULL DEFAULT '#635bff',
        "featuredServiceIds" TEXT NOT NULL DEFAULT '[]',
        "showTestimonials" BOOLEAN NOT NULL DEFAULT true,
        "customWelcomeMessage" TEXT NOT NULL DEFAULT '',
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    const rows = await db.$queryRawUnsafe<Array<{
      heroTitle: string;
      heroSubtitle: string;
      bannerUrl: string;
      accentColor: string;
      featuredServiceIds: string;
      showTestimonials: boolean;
      customWelcomeMessage: string;
    }>>(`SELECT * FROM "company_landing_config" WHERE "companyId" = $1 LIMIT 1`, company.id);

    if (rows.length === 0) {
      const defaultConfig: CompanyLandingPageConfig = {
        heroTitle: `Seja Bem-vindo à ${company.name}`,
        heroSubtitle: "Escolha o melhor dia e horário para o seu atendimento em poucos cliques.",
        bannerUrl: "",
        accentColor: "#635bff",
        featuredServiceIds: [],
        showTestimonials: true,
        customWelcomeMessage: "Estamos prontos para lhe atender com a máxima qualidade!",
      };
      return { success: true, config: defaultConfig };
    }

    const row = rows[0];
    let featuredIds: string[] = [];
    try {
      featuredIds = JSON.parse(row.featuredServiceIds);
    } catch {}

    return {
      success: true,
      config: {
        heroTitle: row.heroTitle,
        heroSubtitle: row.heroSubtitle,
        bannerUrl: row.bannerUrl || "",
        accentColor: row.accentColor || "#635bff",
        featuredServiceIds: Array.isArray(featuredIds) ? featuredIds : [],
        showTestimonials: row.showTestimonials ?? true,
        customWelcomeMessage: row.customWelcomeMessage || "",
      },
    };
  } catch (err) {
    console.error("Erro ao buscar landing config:", err);
    return {
      success: true,
      config: {
        heroTitle: "Bem-vindo ao Agendamento Online",
        heroSubtitle: "Escolha seu serviço e agende agora mesmo.",
        bannerUrl: "",
        accentColor: "#635bff",
        featuredServiceIds: [],
        showTestimonials: true,
        customWelcomeMessage: "",
      },
    };
  }
}

export async function updateCompanyLandingPageConfigAction(
  companySlug: string,
  config: CompanyLandingPageConfig
) {
  // Mesmo defeito de `company-landing.ts`: sessao sem vinculo. Ver la.
  const access = await canAccessCompany(companySlug, "MANAGER");
  if (!access.ok) return { success: false, error: access.error };
  const company = { id: access.companyId };

  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "company_landing_config" (
        "companyId" TEXT PRIMARY KEY,
        "heroTitle" TEXT NOT NULL,
        "heroSubtitle" TEXT NOT NULL,
        "bannerUrl" TEXT NOT NULL DEFAULT '',
        "accentColor" TEXT NOT NULL DEFAULT '#635bff',
        "featuredServiceIds" TEXT NOT NULL DEFAULT '[]',
        "showTestimonials" BOOLEAN NOT NULL DEFAULT true,
        "customWelcomeMessage" TEXT NOT NULL DEFAULT '',
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    const jsonServiceIds = JSON.stringify(config.featuredServiceIds || []);

    await db.$executeRawUnsafe(
      `
      INSERT INTO "company_landing_config" (
        "companyId", "heroTitle", "heroSubtitle", "bannerUrl", "accentColor", "featuredServiceIds", "showTestimonials", "customWelcomeMessage", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, NOW()
      )
      ON CONFLICT ("companyId") DO UPDATE SET
        "heroTitle" = EXCLUDED."heroTitle",
        "heroSubtitle" = EXCLUDED."heroSubtitle",
        "bannerUrl" = EXCLUDED."bannerUrl",
        "accentColor" = EXCLUDED."accentColor",
        "featuredServiceIds" = EXCLUDED."featuredServiceIds",
        "showTestimonials" = EXCLUDED."showTestimonials",
        "customWelcomeMessage" = EXCLUDED."customWelcomeMessage",
        "updatedAt" = NOW()
    `,
      company.id,
      config.heroTitle,
      config.heroSubtitle,
      config.bannerUrl,
      config.accentColor,
      jsonServiceIds,
      config.showTestimonials,
      config.customWelcomeMessage
    );

    revalidatePath(`/${companySlug}/configuracoes`);
    revalidatePath(`/booking/${companySlug}`);
    return { success: true, message: "Landing Page customizada salva com sucesso!" };
  } catch (err) {
    console.error("Erro ao salvar landing config:", err);
    return { success: false, error: "Falha ao salvar configurações da Landing Page." };
  }
}
