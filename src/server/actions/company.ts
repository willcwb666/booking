"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createCompanySchema, generateSlug, isReservedSlug } from "@/schemas/company.schema";
import { ensureUniqueSlug } from "@/server/queries/companies";
import { getMarket, isValidTimezoneForMarket } from "@/lib/markets";
import { stripeEnabled } from "@/lib/stripe";
import { createPlanCheckoutAction } from "@/server/actions/subscription";
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

  // Garante slug único (o refactor de multiempresas precisava disto)
  const slug = await ensureUniqueSlug(base);

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

  try {
    await db.$executeRawUnsafe(`ALTER TABLE "company" ALTER COLUMN "businessType" TYPE text USING "businessType"::text;`);
  } catch {
    // ignora se já for tipo text
  }

  const companyId = `cm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  await db.$executeRawUnsafe(
    `
    INSERT INTO "company" (
      id, name, slug, "businessType", "planId", phone, address, "logoUrl",
      currency, locale, timezone, "isActive", "createdAt", "updatedAt"
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW(), NOW()
    )
  `,
    companyId,
    parsed.data.name,
    slug,
    parsed.data.businessType,
    parsed.data.planId,
    parsed.data.phone || null,
    parsed.data.address || null,
    logoUrl || null,
    market.currency,
    market.locale,
    timezone
  );

  await db.companyUser.create({
    data: {
      companyId,
      userId: session.user.id,
      role: "OWNER",
      isActive: true,
    },
  });

  await db.companyPaymentMethod.createMany({
    data: [
      { companyId, kind: "STRIPE_CARD", label: "Cartão de crédito/débito", displayOrder: 0 },
      { companyId, kind: "MANUAL", label: "Dinheiro/Cheque", displayOrder: 10 },
    ],
  });

  const company = { slug };

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

  try {
    await db.$executeRawUnsafe(`
      ALTER TABLE "company" 
      ADD COLUMN IF NOT EXISTS "minCancellationNoticeHours" INT DEFAULT 24,
      ADD COLUMN IF NOT EXISTS "cancellationFee" DECIMAL(10, 2) DEFAULT 0;
    `);
  } catch {
    // ignora
  }

  const minNoticeHours = parseInt((formData.get("minCancellationNoticeHours") as string) || "24", 10);
  const cancelFeeVal = parseFloat((formData.get("cancellationFee") as string) || "0") || 0;

  const idVal = member.company.id.replace(/'/g, "''");
  const nameVal = name.replace(/'/g, "''");
  const phoneVal = phone ? `'${phone.replace(/'/g, "''")}'` : "NULL";
  const addressVal = address ? `'${address.replace(/'/g, "''")}'` : "NULL";

  let extraSql = "";
  if (countryCode && "currency" in marketData) {
    extraSql += `, currency = '${marketData.currency}', locale = '${marketData.locale}', timezone = '${marketData.timezone}'`;
  }
  if (formData.has("logoUrl")) {
    const lUrl = sanitizeLogoUrl(formData.get("logoUrl") as string);
    const logoVal = lUrl ? `'${lUrl.replace(/'/g, "''")}'` : "NULL";
    extraSql += `, "logoUrl" = ${logoVal}`;
  }

  await db.$executeRawUnsafe(`
    UPDATE "company"
    SET name = '${nameVal}', phone = ${phoneVal}, address = ${addressVal},
        "minCancellationNoticeHours" = ${minNoticeHours}, "cancellationFee" = ${cancelFeeVal},
        "updatedAt" = NOW() ${extraSql}
    WHERE id = '${idVal}'
  `);

  revalidatePath(`/${companySlug}/configuracoes`);
  revalidatePath(`/${companySlug}/dashboard`);

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

export type WizardPayload = {
  name: string;
  businessType: string;
  planId: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  country: string;
  timezone: string;
  enableMultiCompany?: boolean;
  workingDays: number[];
  startTime: string;
  endTime: string;
  intervalMinutes: number;
  selectedServices: Array<{
    title: string;
    description?: string;
    price: number;
    durationMin: number;
    isExtra: boolean;
    extras?: Array<{
      title: string;
      description?: string;
      price: number;
      durationMin: number;
    }>;
  }>;
};

export async function createCompanyWizardAction(payload: WizardPayload): Promise<{ success: boolean; companySlug?: string; error?: string; checkoutUrl?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Não autenticado" };

  if (payload.enableMultiCompany) {
    await db.user.update({
      where: { id: session.user.id },
      data: { allowMultiCompany: true },
    });
  }

  const base = generateSlug(payload.name);
  if (isReservedSlug(base)) {
    return { success: false, error: "Esse nome de empresa não pode ser utilizado" };
  }

  const market = getMarket(payload.country || "BR");
  if (!market) {
    return { success: false, error: "País selecionado inválido" };
  }

  const timezone = isValidTimezoneForMarket(market.code, payload.timezone)
    ? payload.timezone
    : market.timezones[0].id;

  const logoUrl = sanitizeLogoUrl(payload.logoUrl || null);
  const slug = await ensureUniqueSlug(base);

  try {
    await db.$executeRawUnsafe(`ALTER TABLE "company" ALTER COLUMN "businessType" TYPE text USING "businessType"::text;`);
  } catch {
    // ignora se já for do tipo text
  }

  try {
    const result = await db.$transaction(async (tx) => {
      // 1. Criar a Empresa via SQL direto (bypassa validação de enum em memória do Prisma)
      const companyId = `cm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const phoneVal = payload.phone ? `'${payload.phone.replace(/'/g, "''")}'` : "NULL";
      const addressVal = payload.address ? `'${payload.address.replace(/'/g, "''")}'` : "NULL";
      const logoVal = logoUrl ? `'${logoUrl.replace(/'/g, "''")}'` : "NULL";
      const nameVal = payload.name.replace(/'/g, "''");

      await tx.$executeRawUnsafe(`
        INSERT INTO "company" (
          id, name, slug, "businessType", "planId", phone, address, "logoUrl",
          currency, locale, timezone, "isActive", "createdAt", "updatedAt"
        ) VALUES (
          '${companyId}', '${nameVal}', '${slug}', '${payload.businessType}', '${payload.planId}',
          ${phoneVal}, ${addressVal}, ${logoVal}, '${market.currency}', '${market.locale}',
          '${timezone}', true, NOW(), NOW()
        )
      `);

      // Criar vínculo do proprietário
      await tx.companyUser.create({
        data: {
          companyId,
          userId: session.user.id,
          role: "OWNER",
          isActive: true,
        },
      });

      // Criar formas de pagamento padrão
      await tx.companyPaymentMethod.createMany({
        data: [
          { companyId, kind: "STRIPE_CARD", label: "Cartão de crédito/débito", displayOrder: 0 },
          { companyId, kind: "MANUAL", label: "Dinheiro/Cheque/PIX no local", displayOrder: 10 },
        ],
      });

      const company = { id: companyId, slug };

      // 2. Criar Profissional Padrão (O próprio dono)
      const professional = await tx.professional.create({
        data: {
          companyId: company.id,
          name: session.user.name,
          email: session.user.email,
          phone: payload.phone || null,
          bio: "Responsável Técnico",
          userId: session.user.id,
          isActive: true,
        },
      });

      // 3. Criar Agenda Ativa
      const todayStr = new Date().toISOString().split("T")[0];
      const agenda = await tx.agenda.create({
        data: {
          companyId: company.id,
          name: "Agenda Principal de Atendimento",
          status: "ACTIVE",
          startDate: todayStr,
          workingDays: payload.workingDays && payload.workingDays.length > 0 ? payload.workingDays : [1, 2, 3, 4, 5],
          startTime: payload.startTime || "08:00",
          endTime: payload.endTime || "18:00",
          intervalMinutes: payload.intervalMinutes || 30,
          createdById: session.user.id,
          professionals: {
            create: { professionalId: professional.id },
          },
        },
      });

      // 4. Criar Categoria Principal de Serviços
      const serviceCategory = await tx.service.create({
        data: {
          companyId: company.id,
          name: "Serviços Principais",
          description: "Catálogo de serviços cadastrados no onboarding",
          order: 0,
        },
      });

      // 5. Criar Serviços e Extras
      const createdServiceTypeIds: string[] = [];
      const createdExtraServiceIds: string[] = [];

      for (const item of payload.selectedServices) {
        if (!item.isExtra) {
          // Serviço Principal
          const st = await tx.serviceType.create({
            data: {
              companyId: company.id,
              serviceId: serviceCategory.id,
              name: item.title,
              description: item.description || null,
              price: item.price,
              estimatedMinutes: item.durationMin,
              order: 0,
              isActive: true,
            },
          });
          createdServiceTypeIds.push(st.id);

          // Extras vinculados a este serviço principal
          if (item.extras && item.extras.length > 0) {
            for (const extra of item.extras) {
              const ex = await tx.extraService.create({
                data: {
                  companyId: company.id,
                  name: extra.title,
                  description: extra.description || null,
                  price: extra.price,
                  estimatedMinutes: extra.durationMin || 15,
                  order: 0,
                  isActive: true,
                },
              });
              createdExtraServiceIds.push(ex.id);
            }
          }
        } else {
          // Extra avulso
          const ex = await tx.extraService.create({
            data: {
              companyId: company.id,
              name: item.title,
              description: item.description || null,
              price: item.price,
              estimatedMinutes: item.durationMin || 15,
              order: 0,
              isActive: true,
            },
          });
          createdExtraServiceIds.push(ex.id);
        }
      }

      // 6. Criar e PUBLICAR a BookingConfig
      const bookingConfig = await tx.bookingConfig.create({
        data: {
          companyId: company.id,
          agendaId: agenda.id,
          name: "Agendamento Online 24/7",
          status: "PUBLISHED",
          allowPartialService: true,
          createdById: session.user.id,
          serviceTypes: {
            create: createdServiceTypeIds.map((id) => ({ serviceTypeId: id })),
          },
          extraServices: {
            create: createdExtraServiceIds.map((id) => ({ extraServiceId: id })),
          },
        },
      });

      return { companySlug: company.slug, bookingConfigId: bookingConfig.id };
    });

    let checkoutUrl: string | undefined = undefined;
    if (stripeEnabled) {
      try {
        const checkoutRes = await createPlanCheckoutAction(result.companySlug, payload.planId, "month");
        if (checkoutRes.success) {
          checkoutUrl = checkoutRes.url;
        }
      } catch {
        // ignora se o plano for gratuito ou não billable
      }
    }

    return { success: true, companySlug: result.companySlug, checkoutUrl };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao criar empresa no onboarding";
    return { success: false, error: msg };
  }
}
