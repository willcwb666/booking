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
  if (url.startsWith("/uploads/")) return url;
  const publicBase = process.env.R2_PUBLIC_URL;
  if (publicBase && url.startsWith(`${publicBase}/logo/`)) return url;
  if (url.startsWith("logo/") || url.startsWith("http://localhost") || url.startsWith("https://localhost")) return url;
  return url;
}

export async function createCompanyAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, errors: { _: ["Não autenticado"] } };

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

  const slug = await ensureUniqueSlug(base);

  const market = getMarket((formData.get("country") as string) ?? "");
  if (!market) {
    return { success: false, errors: { _: ["Selecione o país da empresa"] } };
  }
  const rawTz = (formData.get("timezone") as string) ?? "";
  const timezone = isValidTimezoneForMarket(market.code, rawTz)
    ? rawTz
    : market.timezones[0].id;

  const logoUrl = sanitizeLogoUrl(formData.get("logoUrl") as string | null);

  const company = await db.company.create({
    data: {
      name: parsed.data.name,
      slug,
      businessType: parsed.data.businessType,
      planId: parsed.data.planId,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      logoUrl: logoUrl || null,
      currency: market.currency,
      locale: market.locale,
      timezone,
      isActive: true,
    },
  });

  await db.companyUser.create({
    data: {
      companyId: company.id,
      userId: session.user.id,
      role: "OWNER",
      isActive: true,
    },
  });

  await db.companyPaymentMethod.createMany({
    data: [
      { companyId: company.id, kind: "STRIPE_CARD", label: "Cartão de crédito/débito", displayOrder: 0 },
      { companyId: company.id, kind: "MANUAL", label: "Dinheiro/Cheque", displayOrder: 10 },
    ],
  });

  try {
    const { getCompanyRolesAction } = await import("@/server/actions/company-roles");
    await getCompanyRolesAction(slug);
  } catch (err) {
    console.error("Erro ao popular cargos da nova empresa:", err);
  }

  try {
    const { seedCompanyDefaults } = await import("@/server/actions/company-setup");
    await seedCompanyDefaults({
      companyId: company.id,
      slug: company.slug,
      businessType: company.businessType,
      userId: session.user.id,
      userName: session.user.name,
    });
  } catch (err) {
    console.error("Erro ao popular catálogo e agenda padrão:", err);
  }

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
    return {
      success: false,
      errors: { name: ["Nome da empresa deve ter pelo menos 2 caracteres"] },
    };
  }

  const countryCode = (formData.get("country") as string | null)?.trim() || "";
  const rawTz = (formData.get("timezone") as string | null)?.trim() || "";
  let marketData: { currency: string; locale: string; timezone: string } | Record<string, never> = {};

  if (countryCode) {
    const m = getMarket(countryCode);
    if (!m) {
      return { success: false, errors: { _: ["País selecionado inválido"] } };
    }
    const tz = isValidTimezoneForMarket(m.code, rawTz) ? rawTz : m.timezones[0].id;
    marketData = {
      currency: m.currency,
      locale: m.locale,
      timezone: tz,
    };
  }

  const minNoticeHours = parseInt((formData.get("minCancellationNoticeHours") as string) || "24", 10);
  const cancelFeeVal = parseFloat((formData.get("cancellationFee") as string) || "0") || 0;

  const updateData: Record<string, unknown> = {
    name,
    phone,
    address,
    minCancellationNoticeHours: minNoticeHours,
    cancellationFee: cancelFeeVal,
    ...marketData,
  };

  if (formData.has("logoUrl")) {
    updateData.logoUrl = sanitizeLogoUrl(formData.get("logoUrl") as string);
  }

  await db.company.update({
    where: { id: member.company.id },
    data: updateData,
  });

  revalidatePath(`/${companySlug}/configuracoes`);
  revalidatePath(`/${companySlug}/dashboard`);

  return { success: true };
}

export async function setMultiCompanyAction(enable: boolean): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, errors: { _: ["Não autenticado"] } };

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
  country: string;
  timezone: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  enableMultiCompany?: boolean;
  workingDays?: number[];
  startTime?: string;
  endTime?: string;
  intervalMinutes?: number;
  selectedServices: Array<{
    title: string;
    description?: string;
    price: number;
    durationMin: number;
    isExtra?: boolean;
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
    const result = await db.$transaction(async (tx) => {
      // 1. Criar a Empresa de forma tipada
      const company = await tx.company.create({
        data: {
          name: payload.name,
          slug,
          businessType: payload.businessType,
          planId: payload.planId,
          phone: payload.phone || null,
          address: payload.address || null,
          logoUrl: logoUrl || null,
          currency: market.currency,
          locale: market.locale,
          timezone,
          isActive: true,
        },
      });

      // Criar vínculo do proprietário
      await tx.companyUser.create({
        data: {
          companyId: company.id,
          userId: session.user.id,
          role: "OWNER",
          isActive: true,
        },
      });

      // Criar formas de pagamento padrão
      await tx.companyPaymentMethod.createMany({
        data: [
          { companyId: company.id, kind: "STRIPE_CARD", label: "Cartão de crédito/débito", displayOrder: 0 },
          { companyId: company.id, kind: "MANUAL", label: "Dinheiro/Cheque/PIX no local", displayOrder: 10 },
        ],
      });

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
          icon: "scissors",
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
                  icon: "sparkles",
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
              icon: "sparkles",
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
