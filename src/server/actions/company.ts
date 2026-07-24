"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createCompanySchema, generateSlug, isReservedSlug } from "@/schemas/company.schema";
import { ensureUniqueSlug } from "@/server/queries/companies";
import { getMarket, isValidTimezoneForMarket } from "@/lib/markets";
import type { ActionResult } from "@/types";

// Só aceita URLs válidas de upload próprio (R2 ou upload local) — impede gravar URL arbitrária
function sanitizeLogoUrl(raw: string | null): string | null {
  const url = raw?.trim();
  if (!url) return null;
  // Suporte a upload local (/uploads/logo/...)
  if (url.startsWith("/uploads/")) return url;
  const publicBase = process.env.R2_PUBLIC_URL;
  if (publicBase && url.startsWith(`${publicBase}/logo/`)) return url;
  // Suporte a URLs locais em dev
  if (url.startsWith("logo/") || url.startsWith("http://localhost") || url.startsWith("https://localhost")) return url;
  return url;
}

export async function createCompanyAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, errors: { _: ["Não autenticado"] } };

  // Checkbox multiempresas no onboarding habilita cadastrar mais empresas
  // (só liga — desligar é feito nas configurações)
  if (formData.get("enableMultiCompany") === "on") {
    await db.user.update({
      where: { id: session.user.id },
      data: { allowMultiCompany: true },
    });
  }

  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { allowMultiCompany: true },
  });

  const alreadyHas = await db.companyUser.findFirst({
    where: { userId: session.user.id, isActive: true },
  });
  if (alreadyHas && !dbUser?.allowMultiCompany) redirect(`/onboarding`);

  const raw = {
    name: formData.get("name"),
    businessType: formData.get("businessType"),
    planId: formData.get("planId"),
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
  };

  const parsed = createCompanySchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const base = generateSlug(parsed.data.name);

  if (isReservedSlug(base)) {
    return { success: false, errors: { name: ["Esse nome não pode ser usado como endereço"] } };
  }

  // Mercado da empresa: país define moeda/idioma; fuso precisa pertencer ao país
  const market = getMarket((formData.get("country") as string) ?? "");
  if (!market) {
    return { success: false, errors: { _: ["Selecione o país da empresa"] } };
  }
  const rawTz = (formData.get("timezone") as string) ?? "";
  const timezone = isValidTimezoneForMarket(market.code, rawTz)
    ? rawTz
    : market.timezones[0].id;

  const logoUrl = sanitizeLogoUrl(formData.get("logoUrl") as string | null);

  const slug = await ensureUniqueSlug(base);

  const company = await db.company.create({
    data: {
      name: parsed.data.name,
      slug,
      businessType: parsed.data.businessType as never,
      planId: parsed.data.planId,
      phone: parsed.data.phone ?? null,
      address: parsed.data.address ?? null,
      logoUrl,
      currency: market.currency,
      locale: market.locale,
      timezone,
      members: {
        create: { userId: session.user.id, role: "OWNER", isActive: true },
      },
      // Formas de pagamento padrão — o dono ajusta em Configurações
      paymentMethods: {
        create: [
          { kind: "STRIPE_CARD", label: "Cartão de crédito/débito", displayOrder: 0 },
          { kind: "MANUAL", label: "Dinheiro/Cheque", displayOrder: 10 },
        ],
      },
    },
  });

  redirect(`/${company.slug}/dashboard`);
}

export async function updateCompanyAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, errors: { _: ["Não autenticado"] } };

  const companySlug = formData.get("companySlug") as string;

  let member = await db.companyUser.findFirst({
    where: {
      userId: session.user.id,
      company: { slug: companySlug },
      isActive: true,
      role: { in: ["OWNER", "MANAGER"] },
    },
    include: { company: { select: { id: true } } },
  });

  // Admin da plataforma pode editar qualquer empresa
  if (!member && session.user.role === "admin") {
    const company = await db.company.findUnique({
      where: { slug: companySlug },
      select: { id: true },
    });
    if (company) member = { company } as NonNullable<typeof member>;
  }
  if (!member) return { success: false, errors: { _: ["Acesso negado"] } };

  const name = (formData.get("name") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;

  if (!name || name.length < 2) {
    return { success: false, errors: { name: ["Nome muito curto"] } };
  }

  // País/fuso opcionais — enviados pela aba Empresa das configurações
  const countryCode = (formData.get("country") as string) || null;
  let marketData: { currency: string; locale: string; timezone: string } | Record<string, never> = {};
  if (countryCode) {
    const market = getMarket(countryCode);
    if (!market) return { success: false, errors: { _: ["País inválido"] } };
    const rawTz = (formData.get("timezone") as string) ?? "";
    marketData = {
      currency: market.currency,
      locale: market.locale,
      timezone: isValidTimezoneForMarket(market.code, rawTz) ? rawTz : market.timezones[0].id,
    };
  }

  // Logo: campo presente no form → atualiza (string vazia remove)
  let logoData: { logoUrl: string | null } | Record<string, never> = {};
  if (formData.has("logoUrl")) {
    logoData = { logoUrl: sanitizeLogoUrl(formData.get("logoUrl") as string) };
  }

  await db.company.update({
    where: { id: member.company.id },
    data: { name, phone, address, ...marketData, ...logoData },
  });

  return { success: true };
}

/**
 * Liga/desliga o modo multiempresas da conta. Cada empresa tem plano e
 * assinatura próprios — a cobrança é individual por empresa.
 */
export async function setMultiCompanyAction(enable: boolean): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, errors: { _: ["Não autenticado"] } };

  if (!enable) {
    const count = await db.companyUser.count({
      where: { userId: session.user.id, isActive: true },
    });
    if (count > 1) {
      return {
        success: false,
        errors: { _: ["Você tem mais de uma empresa ativa — desative as extras antes de desligar o modo multiempresas"] },
      };
    }
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { allowMultiCompany: enable },
  });

  return { success: true };
}
