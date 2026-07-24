"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

// IDs são cuid() — não usar .uuid() aqui
const serviceItemSchema = z.array(
  z.object({ serviceTypeId: z.string().min(1), quantity: z.number().int().positive().max(999) })
);
const extraItemSchema = z.array(
  z.object({ extraServiceId: z.string().min(1), quantity: z.number().int().positive().max(999) })
);
const extraIdsSchema = z.array(z.string().min(1));

type UpsertResult =
  | { success: true; estimateId: string }
  | { success: false; errors: Record<string, string[]> };

type SubmitResult =
  | { success: true; estimateId: string }
  | { success: false; errors: Record<string, string[]> };

// ─── helpers ─────────────────────────────────────────────────────────────────

async function loadConfig(bookingConfigId: string) {
  return db.bookingConfig.findFirst({
    where: { id: bookingConfigId, status: "PUBLISHED" },
    include: {
      company: { select: { timezone: true } },
      serviceTypes: {
        include: { serviceType: { select: { id: true, price: true, allowQuantity: true } } },
      },
      extraServices: {
        include: { extraService: { select: { id: true, price: true, allowQuantity: true } } },
      },
    },
  });
}

function todayInTz(timezone: string): string {
  // en-CA → "YYYY-MM-DD"
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
}

/** Preço promocional vigente por serviceTypeId (menor valor se houver sobreposição). */
async function loadPromoMap(companyId: string, serviceTypeIds: string[], timezone: string) {
  if (serviceTypeIds.length === 0) return new Map<string, number>();
  const today = todayInTz(timezone);
  const promos = await db.promotion.findMany({
    where: {
      companyId,
      isActive: true,
      serviceTypeId: { in: serviceTypeIds },
      startDate: { lte: today },
      endDate: { gte: today },
    },
    select: { serviceTypeId: true, promoPrice: true },
  });
  const map = new Map<string, number>();
  for (const p of promos) {
    const price = Number(p.promoPrice);
    const prev = map.get(p.serviceTypeId);
    if (prev === undefined || price < prev) map.set(p.serviceTypeId, price);
  }
  return map;
}

type LoadedConfig = NonNullable<Awaited<ReturnType<typeof loadConfig>>>;

async function buildPricing(config: LoadedConfig) {
  const priceMap = new Map<string, number>();
  const qtyAllowed = new Map<string, boolean>();
  for (const s of config.serviceTypes) {
    priceMap.set(s.serviceType.id, Number(s.serviceType.price));
    qtyAllowed.set(s.serviceType.id, s.serviceType.allowQuantity);
  }
  for (const e of config.extraServices) {
    priceMap.set(e.extraService.id, Number(e.extraService.price));
    qtyAllowed.set(e.extraService.id, e.extraService.allowQuantity);
  }

  // Promoções ativas sobrescrevem o preço do serviço no período
  const promoMap = await loadPromoMap(
    config.companyId,
    config.serviceTypes.map((s) => s.serviceType.id),
    config.company.timezone
  );
  for (const [id, promoPrice] of promoMap) priceMap.set(id, promoPrice);

  return { priceMap, qtyAllowed };
}

function calcItems(
  serviceItems: { serviceTypeId: string; quantity: number }[],
  extraItems: { extraServiceId: string; quantity: number }[],
  priceMap: Map<string, number>,
  qtyAllowed: Map<string, boolean>,
  validServiceIds: Set<string>,
  validExtraIds: Set<string>
) {
  const svcRows = serviceItems
    .filter((i) => validServiceIds.has(i.serviceTypeId) && i.quantity > 0)
    .map((i) => {
      // Quantidade só é respeitada quando o serviço permite
      const quantity = qtyAllowed.get(i.serviceTypeId) ? i.quantity : 1;
      const unitPrice = priceMap.get(i.serviceTypeId) ?? 0;
      const sub = Math.round(unitPrice * quantity * 100) / 100;
      return {
        serviceTypeId: i.serviceTypeId,
        quantity,
        unitPrice: unitPrice.toFixed(2),
        subtotal: sub.toFixed(2),
      };
    });

  const extRows = extraItems
    .filter((i) => validExtraIds.has(i.extraServiceId) && i.quantity > 0)
    .map((i) => {
      const quantity = qtyAllowed.get(i.extraServiceId) ? i.quantity : 1;
      const unitPrice = priceMap.get(i.extraServiceId) ?? 0;
      const sub = Math.round(unitPrice * quantity * 100) / 100;
      return {
        extraServiceId: i.extraServiceId,
        quantity,
        unitPrice: unitPrice.toFixed(2),
        subtotal: sub.toFixed(2),
      };
    });

  const subtotalCents =
    svcRows.reduce((s, r) => s + Math.round(Number(r.subtotal) * 100), 0) +
    extRows.reduce((s, r) => s + Math.round(Number(r.subtotal) * 100), 0);

  const subtotal = (subtotalCents / 100).toFixed(2);

  return { svcRows, extRows, subtotal, total: subtotal };
}

function parseItems(formData: FormData) {
  const rawItems = JSON.parse((formData.get("serviceItems") as string) || "[]");
  const serviceItems = serviceItemSchema.parse(rawItems);

  // Novo formato: extraItems [{extraServiceId, quantity}]. Legado: extraServiceIds [id]
  const rawExtraItems = formData.get("extraItems");
  let extraItems: { extraServiceId: string; quantity: number }[];
  if (rawExtraItems) {
    extraItems = extraItemSchema.parse(JSON.parse(rawExtraItems as string));
  } else {
    const ids = extraIdsSchema.parse(JSON.parse((formData.get("extraServiceIds") as string) || "[]"));
    extraItems = ids.map((extraServiceId) => ({ extraServiceId, quantity: 1 }));
  }
  return { serviceItems, extraItems };
}

// ─── upsertEstimateAction — autosave (draft) ─────────────────────────────────

export async function upsertEstimateAction(formData: FormData): Promise<UpsertResult> {
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimit(`estimate:upsert:${ip}`, 30, 60);
  if (!rl.allowed) {
    return { success: false, errors: { _: ["Muitas tentativas. Aguarde um momento."] } };
  }

  const bookingConfigId = formData.get("bookingConfigId") as string;
  const estimateId = (formData.get("estimateId") as string) || undefined;
  const frequency = (formData.get("frequency") as string) || "ONCE";

  let serviceItems: { serviceTypeId: string; quantity: number }[] = [];
  let extraItems: { extraServiceId: string; quantity: number }[] = [];
  try {
    ({ serviceItems, extraItems } = parseItems(formData));
  } catch {
    return { success: false, errors: { _: ["Dados inválidos"] } };
  }

  const config = await loadConfig(bookingConfigId);
  if (!config) return { success: false, errors: { _: ["Configuração não encontrada"] } };

  const { priceMap, qtyAllowed } = await buildPricing(config);
  const validServiceIds = new Set(config.serviceTypes.map((s) => s.serviceType.id));
  const validExtraIds = new Set(config.extraServices.map((e) => e.extraService.id));

  const { svcRows, extRows, subtotal, total } = calcItems(
    serviceItems, extraItems, priceMap, qtyAllowed, validServiceIds, validExtraIds
  );

  const validFreqs = ["ONCE", "WEEKLY", "BIWEEKLY", "MONTHLY"];
  const safeFreq = validFreqs.includes(frequency) ? frequency : "ONCE";

  // Upsert
  if (estimateId) {
    const existing = await db.estimate.findFirst({
      where: { id: estimateId, bookingConfigId, status: "DRAFT" },
    });
    if (existing) {
      await db.$transaction(async (tx) => {
        await tx.estimateServiceType.deleteMany({ where: { estimateId } });
        await tx.estimateExtraService.deleteMany({ where: { estimateId } });
        await tx.estimate.update({
          where: { id: estimateId },
          data: {
            frequency: safeFreq as "ONCE" | "WEEKLY" | "BIWEEKLY" | "MONTHLY",
            subtotal,
            total,
            serviceTypes: { create: svcRows },
            extraServices: { create: extRows },
          },
        });
      });
      return { success: true, estimateId };
    }
  }

  // Create
  const created = await db.estimate.create({
    data: {
      companyId: config.companyId,
      bookingConfigId,
      frequency: safeFreq as "ONCE" | "WEEKLY" | "BIWEEKLY" | "MONTHLY",
      subtotal,
      total,
      serviceTypes: { create: svcRows },
      extraServices: { create: extRows },
    },
  });
  return { success: true, estimateId: created.id };
}

// ─── submitEstimateAction — set PENDING ──────────────────────────────────────

export async function submitEstimateAction(formData: FormData): Promise<SubmitResult> {
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimit(`estimate:submit:${ip}`, 10, 60);
  if (!rl.allowed) {
    return { success: false, errors: { _: ["Muitas tentativas. Aguarde um momento."] } };
  }

  const bookingConfigId = formData.get("bookingConfigId") as string;
  const estimateId = (formData.get("estimateId") as string) || undefined;
  const frequency = (formData.get("frequency") as string) || "ONCE";
  const customerName = (formData.get("customerName") as string) || null;
  const customerEmail = (formData.get("customerEmail") as string) || null;

  let serviceItems: { serviceTypeId: string; quantity: number }[] = [];
  let extraItems: { extraServiceId: string; quantity: number }[] = [];
  try {
    ({ serviceItems, extraItems } = parseItems(formData));
  } catch {
    return { success: false, errors: { _: ["Dados inválidos"] } };
  }

  if (serviceItems.length === 0)
    return { success: false, errors: { _: ["Selecione pelo menos um serviço"] } };

  const config = await loadConfig(bookingConfigId);
  if (!config) return { success: false, errors: { _: ["Configuração não encontrada"] } };

  const { priceMap, qtyAllowed } = await buildPricing(config);
  const validServiceIds = new Set(config.serviceTypes.map((s) => s.serviceType.id));
  const validExtraIds = new Set(config.extraServices.map((e) => e.extraService.id));

  const { svcRows, extRows, subtotal, total } = calcItems(
    serviceItems, extraItems, priceMap, qtyAllowed, validServiceIds, validExtraIds
  );

  if (svcRows.length === 0)
    return { success: false, errors: { _: ["Selecione pelo menos um serviço válido"] } };

  const validFreqs = ["ONCE", "WEEKLY", "BIWEEKLY", "MONTHLY"];
  const safeFreq = validFreqs.includes(frequency) ? frequency : "ONCE";

  // Se o cliente estiver logado, o orçamento já nasce vinculado à conta
  const session = await auth.api.getSession({ headers: hdrs });
  const customerId = session?.user.id ?? null;

  // Check if draft estimate (created by autosave) can be promoted
  if (estimateId) {
    const existing = await db.estimate.findFirst({
      where: { id: estimateId, bookingConfigId },
    });
    if (existing && existing.status === "DRAFT") {
      // Check not expired (>24h)
      const ageMs = Date.now() - existing.createdAt.getTime();
      if (ageMs > 24 * 60 * 60 * 1000) {
        // Expired — create fresh
        const created = await createPendingEstimate({
          config, svcRows, extRows, subtotal, total, safeFreq, customerName, customerEmail, customerId,
        });
        return { success: true, estimateId: created.id };
      }

      await db.$transaction(async (tx) => {
        await tx.estimateServiceType.deleteMany({ where: { estimateId } });
        await tx.estimateExtraService.deleteMany({ where: { estimateId } });
        await tx.estimate.update({
          where: { id: estimateId },
          data: {
            status: "PENDING",
            frequency: safeFreq as "ONCE" | "WEEKLY" | "BIWEEKLY" | "MONTHLY",
            subtotal,
            total,
            customerName,
            customerEmail,
            ...(customerId ? { customerId } : {}),
            serviceTypes: { create: svcRows },
            extraServices: { create: extRows },
          },
        });
      });
      return { success: true, estimateId };
    }
  }

  const created = await createPendingEstimate({
    config, svcRows, extRows, subtotal, total, safeFreq, customerName, customerEmail, customerId,
  });
  return { success: true, estimateId: created.id };
}

async function createPendingEstimate(p: {
  config: LoadedConfig;
  svcRows: { serviceTypeId: string; quantity: number; unitPrice: string; subtotal: string }[];
  extRows: { extraServiceId: string; quantity: number; unitPrice: string; subtotal: string }[];
  subtotal: string;
  total: string;
  safeFreq: string;
  customerName: string | null;
  customerEmail: string | null;
  customerId?: string | null;
}) {
  return db.estimate.create({
    data: {
      companyId: p.config.companyId,
      bookingConfigId: p.config.id,
      status: "PENDING",
      frequency: p.safeFreq as "ONCE" | "WEEKLY" | "BIWEEKLY" | "MONTHLY",
      subtotal: p.subtotal,
      total: p.total,
      customerName: p.customerName,
      customerEmail: p.customerEmail,
      customerId: p.customerId ?? null,
      serviceTypes: { create: p.svcRows },
      extraServices: { create: p.extRows },
    },
  });
}

// ─── saveEstimateAction — vincula orçamento à conta do cliente ───────────────

type SaveResult =
  | { success: true; estimateId: string }
  | { success: false; requiresLogin?: boolean; errors: Record<string, string[]> };

/**
 * "Salvar orçamento": exige login. Promove o rascunho a PENDING e vincula ao
 * usuário logado. Se não houver sessão, o client redireciona para login e o
 * orçamento é reivindicado depois via /orcamentos/claim.
 */
export async function saveEstimateAction(formData: FormData): Promise<SaveResult> {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session) {
    return { success: false, requiresLogin: true, errors: { _: ["Faça login para salvar o orçamento"] } };
  }

  const estimateId = formData.get("estimateId") as string;
  if (!estimateId) return { success: false, errors: { _: ["Orçamento não encontrado"] } };

  const estimate = await db.estimate.findFirst({
    where: {
      id: estimateId,
      status: { in: ["DRAFT", "PENDING"] },
      OR: [{ customerId: null }, { customerId: session.user.id }],
    },
    include: { serviceTypes: { select: { id: true } } },
  });
  if (!estimate) return { success: false, errors: { _: ["Orçamento não encontrado"] } };
  if (estimate.serviceTypes.length === 0)
    return { success: false, errors: { _: ["Selecione pelo menos um serviço antes de salvar"] } };

  await db.estimate.update({
    where: { id: estimateId },
    data: {
      status: "PENDING",
      customerId: session.user.id,
      customerName: estimate.customerName ?? session.user.name,
      customerEmail: estimate.customerEmail ?? session.user.email,
    },
  });

  return { success: true, estimateId };
}
