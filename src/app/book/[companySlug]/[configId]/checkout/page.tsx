import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { resolveDeposit } from "@/lib/trust-tier";
import { getCustomerTrust } from "@/server/queries/customer-trust";
import { CheckoutClient } from "./checkout-client";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ companySlug: string; configId: string }>;
  searchParams: Promise<{ estimate?: string }>;
}) {
  const { companySlug, configId } = await params;
  const { estimate: estimateId } = await searchParams;

  if (!estimateId) notFound();

  const estimate = await db.estimate.findFirst({
    where: {
      id: estimateId,
      bookingConfigId: configId,
      status: "PENDING",
    },
    include: {
      bookingConfig: {
        include: {
          company: { select: { name: true, logoUrl: true, currency: true, locale: true, businessType: true } },
          agenda: true,
        },
      },
      serviceTypes: {
        include: { serviceType: { select: { name: true, service: { select: { name: true } } } } },
      },
      extraServices: {
        include: { extraService: { select: { name: true } } },
      },
    },
  });

  if (!estimate) notFound();

  const { bookingConfig: config } = estimate;
  const agenda = config.agenda;

  // Formas de pagamento configuradas pela empresa (tabela nova).
  // Fallback: empresas sem registros usam o comportamento legado dos flags.
  const configuredMethods = await db.companyPaymentMethod.findMany({
    where: { companyId: estimate.companyId, isActive: true },
    orderBy: { displayOrder: "asc" },
    select: { id: true, kind: true, label: true, handle: true, instructions: true },
  });

  let paymentMethods = configuredMethods;
  if (paymentMethods.length === 0) {
    const settings = await db.companyPaymentSettings.findUnique({
      where: { companyId: estimate.companyId },
      select: { enableCard: true, enableCashCheck: true, enablePix: true, mercadoPagoAccessToken: true },
    });
    const legacy: typeof configuredMethods = [];
    if (settings?.enableCard ?? true) {
      legacy.push({ id: "", kind: "STRIPE_CARD", label: "Cartão de crédito / débito", handle: null, instructions: null });
    }
    if (settings?.enablePix && settings.mercadoPagoAccessToken) {
      legacy.push({ id: "", kind: "MERCADOPAGO_PIX", label: "PIX", handle: null, instructions: null });
    }
    if (settings?.enableCashCheck ?? true) {
      legacy.push({ id: "", kind: "MANUAL", label: "Dinheiro / Cheque (no dia do serviço)", handle: null, instructions: null });
    }
    paymentMethods = legacy;
  }

  const orderItems = [
    ...estimate.serviceTypes.map((item) => ({
      label: `${item.serviceType.service.name} — ${item.serviceType.name}${item.quantity > 1 ? ` ×${item.quantity}` : ""}`,
      subtotal: Number(item.subtotal),
    })),
    ...estimate.extraServices.map((item) => ({
      label: `${item.extraService.name}${item.quantity > 1 ? ` ×${item.quantity}` : ""}`,
      subtotal: Number(item.subtotal),
    })),
  ];

  const FREQ_LABELS: Record<string, string> = {
    ONCE: "Única vez",
    WEEKLY: "Semanal",
    BIWEEKLY: "Quinzenal",
    MONTHLY: "Mensal",
  };

  const paymentSettings = await db.companyPaymentSettings.findUnique({
    where: { companyId: estimate.companyId },
    select: { requireDeposit: true, depositPercentage: true, dynamicDeposit: true },
  });

  /**
   * Sinal exibido no checkout.
   *
   * A faixa é resolvida a partir do e-mail da SESSÃO, nunca de um e-mail
   * digitado. Consultar a faixa por e-mail arbitrário seria um oráculo público:
   * qualquer pessoa descobriria quem tem falta registrada em qualquer empresa,
   * e poderia varrer uma lista para mapear a carteira de clientes. Por isso não
   * existe action pública que receba e-mail e devolva a faixa.
   *
   * Consequência aceita: quem agenda sem login vê o sinal da faixa neutra. O
   * servidor continua sendo a autoridade — `createBookingAction` reavalia a
   * faixa pelo e-mail informado e cobra o que for devido.
   */
  const session = await auth.api.getSession({ headers: await headers() });
  const trust = await getCustomerTrust({
    companyId: estimate.companyId,
    customerEmail: session?.user.email ?? null,
  });
  const depositPolicy = resolveDeposit({
    dynamicDeposit: paymentSettings?.dynamicDeposit ?? false,
    requireDeposit: paymentSettings?.requireDeposit ?? false,
    depositPercentage: paymentSettings?.depositPercentage ?? 30,
    trust,
  });

  const professionals = await db.professional.findMany({
    where: {
      companyId: estimate.companyId,
      isActive: true,
      agendas: { some: { agendaId: agenda.id } },
    },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      bio: true,
      roleTitle: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <CheckoutClient
      companySlug={companySlug}
      configId={configId}
      companyName={config.company.name}
      configName={config.name}
      estimateId={estimateId}
      estimateTotal={Number(estimate.total)}
      frequency={FREQ_LABELS[estimate.frequency] ?? estimate.frequency}
      orderItems={orderItems}
      agendaId={agenda.id}
      professionals={professionals}
      paymentMethods={paymentMethods}
      currency={config.company.currency}
      locale={config.company.locale}
      businessType={config.company.businessType}
      requireDeposit={depositPolicy.percentage > 0}
      depositPercentage={depositPolicy.percentage}
      agendaConfig={{
        startDate: agenda.startDate,
        endDate: agenda.endDate,
        workingDays: agenda.workingDays,
        startTime: agenda.startTime,
        endTime: agenda.endTime,
        intervalMinutes: agenda.intervalMinutes,
      }}
    />
  );
}
