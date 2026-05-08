import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMobileSession } from "../_auth";

export async function POST(req: NextRequest) {
  const session = await getMobileSession(req);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let body: {
    bookingConfigId: string;
    frequency: string;
    serviceItems: { serviceTypeId: string; quantity: number }[];
    extraServiceIds: string[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const { bookingConfigId, frequency, serviceItems, extraServiceIds } = body;

  if (!bookingConfigId || !Array.isArray(serviceItems)) {
    return NextResponse.json({ error: "Dados obrigatórios ausentes" }, { status: 400 });
  }

  if (serviceItems.length === 0) {
    return NextResponse.json({ error: "Selecione pelo menos um serviço" }, { status: 400 });
  }

  // Load config (must be PUBLISHED and company must be active)
  const config = await db.bookingConfig.findFirst({
    where: {
      id: bookingConfigId,
      status: "PUBLISHED",
      company: { isActive: true },
    },
    include: {
      serviceTypes: {
        include: { serviceType: { select: { id: true, price: true } } },
      },
      extraServices: {
        include: { extraService: { select: { id: true, price: true } } },
      },
    },
  });

  if (!config) {
    return NextResponse.json({ error: "Configuração não encontrada" }, { status: 404 });
  }

  // Build price map
  const priceMap = new Map<string, number>();
  for (const s of config.serviceTypes) {
    priceMap.set(s.serviceType.id, Number(s.serviceType.price));
  }
  for (const e of config.extraServices) {
    priceMap.set(e.extraService.id, Number(e.extraService.price));
  }

  const validServiceIds = new Set(config.serviceTypes.map((s) => s.serviceType.id));
  const validExtraIds = new Set(config.extraServices.map((e) => e.extraService.id));

  // Calculate items
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

  const safeExtraIds = (extraServiceIds ?? []).filter((id) => validExtraIds.has(id));
  const extRows = safeExtraIds.map((id) => {
    const unitPrice = priceMap.get(id) ?? 0;
    return {
      extraServiceId: id,
      quantity: 1,
      unitPrice: unitPrice.toFixed(2),
      subtotal: unitPrice.toFixed(2),
    };
  });

  if (svcRows.length === 0) {
    return NextResponse.json({ error: "Nenhum serviço válido selecionado" }, { status: 400 });
  }

  const subtotalCents =
    svcRows.reduce((s, r) => s + Math.round(Number(r.subtotal) * 100), 0) +
    extRows.reduce((s, r) => s + Math.round(Number(r.subtotal) * 100), 0);
  const total = (subtotalCents / 100).toFixed(2);

  const validFreqs = ["ONCE", "WEEKLY", "BIWEEKLY", "MONTHLY"];
  const safeFreq = validFreqs.includes(frequency) ? frequency : "ONCE";

  // Create estimate with status PENDING and customerId
  const estimate = await db.estimate.create({
    data: {
      companyId: config.companyId,
      bookingConfigId: config.id,
      customerId: session.user.id,
      customerName: session.user.name,
      customerEmail: session.user.email,
      status: "PENDING",
      frequency: safeFreq as "ONCE" | "WEEKLY" | "BIWEEKLY" | "MONTHLY",
      subtotal: total,
      total,
      serviceTypes: { create: svcRows },
      extraServices: { create: extRows },
    },
  });

  return NextResponse.json({
    estimateId: estimate.id,
    total,
    agendaId: config.agendaId,
  });
}
