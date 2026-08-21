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

    /**
     * Antes daqui saia um `CREATE TABLE IF NOT EXISTS` a cada chamada. A tabela
     * agora nasce em `prisma/migrations`, como todas as outras.
     */
    const row = await db.companyLandingConfig.findUnique({
      where: { companyId: company.id },
    });

    if (!row) {
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

    let featuredIds: string[] = [];
    try {
      const parsed: unknown = JSON.parse(row.featuredServiceIds);
      if (Array.isArray(parsed)) featuredIds = parsed as string[];
    } catch {
      console.error("[landing-config] featuredServiceIds invalido", company.id);
    }

    return {
      success: true,
      config: {
        heroTitle: row.heroTitle,
        heroSubtitle: row.heroSubtitle,
        bannerUrl: row.bannerUrl || "",
        accentColor: row.accentColor || "#635bff",
        featuredServiceIds: featuredIds,
        showTestimonials: row.showTestimonials,
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
    const dados = {
      heroTitle: config.heroTitle,
      heroSubtitle: config.heroSubtitle,
      bannerUrl: config.bannerUrl,
      accentColor: config.accentColor,
      featuredServiceIds: JSON.stringify(config.featuredServiceIds ?? []),
      showTestimonials: config.showTestimonials,
      customWelcomeMessage: config.customWelcomeMessage,
    };

    await db.companyLandingConfig.upsert({
      where: { companyId: company.id },
      create: { companyId: company.id, ...dados },
      update: dados,
    });

    revalidatePath(`/${companySlug}/configuracoes`);
    revalidatePath(`/booking/${companySlug}`);
    return { success: true, message: "Landing Page customizada salva com sucesso!" };
  } catch (err) {
    console.error("Erro ao salvar landing config:", err);
    return { success: false, error: "Falha ao salvar configurações da Landing Page." };
  }
}
