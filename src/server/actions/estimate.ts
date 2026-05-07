"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";

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
      serviceTypes: {
        include: { serviceType: { select: { id: true, price: true } } },
      },
      extraServices: {
        include: { extraService: { select: { id: true, price: true } } },
      },
    },
  });
}

function buildPriceMap(config: NonNullable<Awaited<ReturnType<typeof loadConfig>>>) {
  const map = new Map<string, number>();
  for (const s of config.serviceTypes)
    map.set(s.serviceType.id, Number(s.serviceType.price));
  for (const e of config.extraServices)
    map.set(e.extraService.id, Number(e.extraService.price));
  return map;
}

function calcItems(
  serviceItems: { serviceTypeId: string; quantity: number }[],
  extraServiceIds: string[],
  priceMap: Map<string, number>,
  validServiceIds: Set<string>,
  validExtraIds: Set<string>
) {
  const svcRows = serviceItems
    .filter((i) => validServiceIds.has(i.serviceTypeId) && i.quantity > 0)
    .map((i) => {
      const unitPrice = priceMap.get(i.serviceTypeId) ?? 0;
      const sub = Math.round(unitPrice * i.quantity * 100) / 100;
      return {
        serviceTypeId: i.serviceTypeId,
        quantity: i.quantity,
        unitPrice: unitPrice.toFixed(2),
        subtotal: sub.toFixed(2),
      };
    });

  const extRows = extraServiceIds
    .filter((id) => validExtraIds.has(id))
    .map((id) => {
      const unitPrice = priceMap.get(id) ?? 0;
      return {
        extraServiceId: id,
        quantity: 1,
        unitPrice: unitPrice.toFixed(2),
        subtotal: unitPrice.toFixed(2),
      };
    });

  const subtotalCents =
    svcRows.reduce((s, r) => s + Math.round(Number(r.subtotal) * 100), 0) +
    extRows.reduce((s, r) => s + Math.round(Number(r.subtotal) * 100), 0);

  const subtotal = (subtotalCents / 100).toFixed(2);

  return { svcRows, extRows, subtotal, total: subtotal };
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
  let extraServiceIds: string[] = [];
  try {
    serviceItems = JSON.parse((formData.get("serviceItems") as string) || "[]");
    extraServiceIds = JSON.parse((formData.get("extraServiceIds") as string) || "[]");
  } catch {
    return { success: false, errors: { _: ["Dados inválidos"] } };
  }

  const config = await loadConfig(bookingConfigId);
  if (!config) return { success: false, errors: { _: ["Configuração não encontrada"] } };

  const priceMap = buildPriceMap(config);
  const validServiceIds = new Set(config.serviceTypes.map((s) => s.serviceType.id));
  const validExtraIds = new Set(config.extraServices.map((e) => e.extraService.id));

  const { svcRows, extRows, subtotal, total } = calcItems(
    serviceItems, extraServiceIds, priceMap, validServiceIds, validExtraIds
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
  let extraServiceIds: string[] = [];
  try {
    serviceItems = JSON.parse((formData.get("serviceItems") as string) || "[]");
    extraServiceIds = JSON.parse((formData.get("extraServiceIds") as string) || "[]");
  } catch {
    return { success: false, errors: { _: ["Dados inválidos"] } };
  }

  if (serviceItems.length === 0)
    return { success: false, errors: { _: ["Selecione pelo menos um serviço"] } };

  const config = await loadConfig(bookingConfigId);
  if (!config) return { success: false, errors: { _: ["Configuração não encontrada"] } };

  const priceMap = buildPriceMap(config);
  const validServiceIds = new Set(config.serviceTypes.map((s) => s.serviceType.id));
  const validExtraIds = new Set(config.extraServices.map((e) => e.extraService.id));

  const { svcRows, extRows, subtotal, total } = calcItems(
    serviceItems, extraServiceIds, priceMap, validServiceIds, validExtraIds
  );

  if (svcRows.length === 0)
    return { success: false, errors: { _: ["Selecione pelo menos um serviço válido"] } };

  const validFreqs = ["ONCE", "WEEKLY", "BIWEEKLY", "MONTHLY"];
  const safeFreq = validFreqs.includes(frequency) ? frequency : "ONCE";

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
          config, svcRows, extRows, subtotal, total, safeFreq, customerName, customerEmail,
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
            serviceTypes: { create: svcRows },
            extraServices: { create: extRows },
          },
        });
      });
      return { success: true, estimateId };
    }
  }

  const created = await createPendingEstimate({
    config, svcRows, extRows, subtotal, total, safeFreq, customerName, customerEmail,
  });
  return { success: true, estimateId: created.id };
}

async function createPendingEstimate(p: {
  config: NonNullable<Awaited<ReturnType<typeof loadConfig>>>;
  svcRows: { serviceTypeId: string; quantity: number; unitPrice: string; subtotal: string }[];
  extRows: { extraServiceId: string; quantity: number; unitPrice: string; subtotal: string }[];
  subtotal: string;
  total: string;
  safeFreq: string;
  customerName: string | null;
  customerEmail: string | null;
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
      serviceTypes: { create: p.svcRows },
      extraServices: { create: p.extRows },
    },
  });
}
