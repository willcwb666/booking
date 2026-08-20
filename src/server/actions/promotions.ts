"use server";

import { auth } from "@/lib/auth";
import { todayInTimezone } from "@/lib/company-date";
import { headers } from "next/headers";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { db } from "@/lib/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { sendPromotionEmail } from "@/lib/email";
import { formatMoney } from "@/lib/format";
import type { ActionResult } from "@/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const promotionSchema = z
  .object({
    serviceTypeId: z.string().min(1, "Serviço obrigatório"),
    description: z.string().min(1, "Descrição obrigatória").max(300, "Máximo 300 caracteres"),
    promoPrice: z.coerce
      .number({ error: "Valor inválido" })
      .min(0, "Valor deve ser positivo"),
    startDate: z.string().regex(DATE_RE, "Data inicial inválida"),
    endDate: z.string().regex(DATE_RE, "Data final inválida"),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "Data final deve ser igual ou posterior à inicial",
    path: ["endDate"],
  });

async function resolveCompany(slug: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const company = await getCompanyBySlugForUser(slug, session.user.id);
  return company ?? null;
}

export async function createPromotionAction(formData: FormData): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const company = await resolveCompany(slug);
  if (!company) return { success: false, errors: { _: ["Não autorizado"] } };

  const parsed = promotionSchema.safeParse({
    serviceTypeId: formData.get("serviceTypeId"),
    description: formData.get("description"),
    promoPrice: formData.get("promoPrice"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });
  if (!parsed.success)
    return { success: false, errors: parsed.error.flatten().fieldErrors };

  const serviceType = await db.serviceType.findFirst({
    where: { id: parsed.data.serviceTypeId, companyId: company.id, isActive: true },
  });
  if (!serviceType)
    return { success: false, errors: { _: ["Serviço não encontrado"] } };

  if (parsed.data.promoPrice >= Number(serviceType.price))
    return {
      success: false,
      errors: { promoPrice: ["O valor promocional deve ser menor que o preço normal do serviço"] },
    };

  await db.promotion.create({
    data: {
      companyId: company.id,
      serviceTypeId: parsed.data.serviceTypeId,
      description: parsed.data.description,
      promoPrice: parsed.data.promoPrice.toFixed(2),
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
    },
  });

  revalidatePath(`/${slug}/promocoes`);
  return { success: true };
}

export async function updatePromotionAction(formData: FormData): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const id = formData.get("id") as string;
  const company = await resolveCompany(slug);
  if (!company) return { success: false, errors: { _: ["Não autorizado"] } };

  const parsed = promotionSchema.safeParse({
    serviceTypeId: formData.get("serviceTypeId"),
    description: formData.get("description"),
    promoPrice: formData.get("promoPrice"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });
  if (!parsed.success)
    return { success: false, errors: parsed.error.flatten().fieldErrors };

  const existing = await db.promotion.findFirst({
    where: { id, companyId: company.id },
  });
  if (!existing)
    return { success: false, errors: { _: ["Promoção não encontrada"] } };

  const serviceType = await db.serviceType.findFirst({
    where: { id: parsed.data.serviceTypeId, companyId: company.id, isActive: true },
  });
  if (!serviceType)
    return { success: false, errors: { _: ["Serviço não encontrado"] } };

  if (parsed.data.promoPrice >= Number(serviceType.price))
    return {
      success: false,
      errors: { promoPrice: ["O valor promocional deve ser menor que o preço normal do serviço"] },
    };

  await db.promotion.update({
    where: { id },
    data: {
      serviceTypeId: parsed.data.serviceTypeId,
      description: parsed.data.description,
      promoPrice: parsed.data.promoPrice.toFixed(2),
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
    },
  });

  revalidatePath(`/${slug}/promocoes`);
  return { success: true };
}

export async function deletePromotionAction(formData: FormData): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const id = formData.get("id") as string;
  const company = await resolveCompany(slug);
  if (!company) return { success: false, errors: { _: ["Não autorizado"] } };

  const existing = await db.promotion.findFirst({
    where: { id, companyId: company.id },
  });
  if (!existing)
    return { success: false, errors: { _: ["Promoção não encontrada"] } };

  await db.promotion.delete({ where: { id } });

  revalidatePath(`/${slug}/promocoes`);
  return { success: true };
}

type SendResult =
  | { success: true; sent: number }
  | { success: false; errors: Record<string, string[]> };

const emailComposeSchema = z.object({
  title: z.string().min(1, "Título obrigatório").max(120, "Máximo 120 caracteres"),
  description: z.string().min(1, "Descrição obrigatória").max(1000, "Máximo 1000 caracteres"),
});

/**
 * "Criar e-mail": monta o e-mail com título/descrição do gestor + todas as
 * promoções vigentes da empresa e envia para os usuários com opt-in de marketing.
 */
export async function sendPromotionEmailAction(formData: FormData): Promise<SendResult> {
  const slug = formData.get("companySlug") as string;
  const company = await resolveCompany(slug);
  if (!company) return { success: false, errors: { _: ["Não autorizado"] } };

  const parsed = emailComposeSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!parsed.success)
    return { success: false, errors: parsed.error.flatten().fieldErrors };

  // Proteção contra spam: no máximo 2 disparos por hora por empresa
  const rl = await enforceRateLimit(RATE_LIMITS.PROMO_SEND, company.id);
  if (!rl.allowed)
    return { success: false, errors: { _: ["Limite de envios atingido. Tente novamente em 1 hora."] } };

  const companyInfo = await db.company.findUniqueOrThrow({
    where: { id: company.id },
    select: { name: true, slug: true, logoUrl: true, currency: true, locale: true, timezone: true },
  });

  // Só promoções vigentes hoje (fuso da empresa)
  const today = todayInTimezone(companyInfo.timezone);
  const promotions = await db.promotion.findMany({
    where: {
      companyId: company.id,
      isActive: true,
      startDate: { lte: today },
      endDate: { gte: today },
    },
    orderBy: { endDate: "asc" },
    include: {
      serviceType: { select: { name: true, price: true, service: { select: { name: true } } } },
    },
  });
  if (promotions.length === 0)
    return { success: false, errors: { _: ["Nenhuma promoção vigente para incluir no e-mail"] } };

  // 1. Busca clientes que já agendaram estritamente nesta empresa (Isolamento Multi-Tenant)
  const companyBookings = await db.bookingCustomerDetail.findMany({
    where: {
      booking: { companyId: company.id },
      sendReminders: true,
    },
    select: { email: true, firstName: true, lastName: true },
  });

  const clientMap = new Map<string, string>();
  for (const b of companyBookings) {
    const email = b.email.toLowerCase().trim();
    if (!clientMap.has(email)) {
      clientMap.set(email, `${b.firstName} ${b.lastName}`.trim());
    }
  }

  if (clientMap.size === 0) {
    return { success: false, errors: { _: ["Nenhum cliente encontrado na base desta empresa"] } };
  }

  // 2. Exclui usuários banidos ou que desativaram e-mails de marketing
  const optOutUsers = await db.user.findMany({
    where: {
      email: { in: Array.from(clientMap.keys()) },
      OR: [
        { banned: true },
        { notificationPrefs: { enableMarketing: false } },
      ],
    },
    select: { email: true },
  });

  const excludedEmails = new Set(optOutUsers.map((u) => u.email.toLowerCase()));

  const recipients = Array.from(clientMap.entries())
    .filter(([email]) => !excludedEmails.has(email))
    .map(([email, name]) => ({ email, name }));

  if (recipients.length === 0) {
    return { success: false, errors: { _: ["Nenhum cliente com aceite de ofertas encontrado"] } };
  }

  const items = promotions.map((p) => ({
    serviceName: `${p.serviceType.service.name} — ${p.serviceType.name}`,
    originalPrice: formatMoney(Number(p.serviceType.price), companyInfo.currency, companyInfo.locale),
    promoPrice: formatMoney(Number(p.promoPrice), companyInfo.currency, companyInfo.locale),
    endDate: p.endDate,
  }));
  const validUntil = promotions.reduce((max, p) => (p.endDate > max ? p.endDate : max), promotions[0].endDate);

  let sent = 0;
  for (const user of recipients) {
    try {
      await sendPromotionEmail({
        to: user.email,
        customerName: user.name,
        companyName: companyInfo.name,
        companySlug: companyInfo.slug,
        companyLogoUrl: companyInfo.logoUrl,
        title: parsed.data.title,
        description: parsed.data.description,
        items,
        validUntil,
      });
      sent++;
    } catch (err) {
      console.error(`[promo-email] falha ao enviar para ${user.email}:`, err);
    }
  }

  await db.promotion.updateMany({
    where: { id: { in: promotions.map((p) => p.id) } },
    data: { lastSentAt: new Date() },
  });

  revalidatePath(`/${slug}/promocoes`);
  return { success: true, sent };
}
