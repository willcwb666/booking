import { db } from "@/lib/db";
import { slotsNeeded, totalServiceMinutes } from "@/lib/booking-duration";
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
          company: {
            select: {
              name: true,
              logoUrl: true,
              currency: true,
              locale: true,
              businessType: true,
              driveTimeEnabled: true,
            },
          },
          agenda: true,
        },
      },
      serviceTypes: {
        include: {
          serviceType: {
            select: { name: true, estimatedMinutes: true, service: { select: { name: true } } },
          },
        },
      },
      extraServices: {
        include: { extraService: { select: { name: true, estimatedMinutes: true } } },
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

  /**
   * Preenchimento em um toque — o "Kreator Pass".
   *
   * Os dados vêm do perfil do PRÓPRIO usuário logado, nunca da ficha que ele
   * tem em outra empresa. A diferença não é cosmética: copiar de outra empresa
   * seria transferir dado pessoal entre controladores distintos, e quem
   * precisaria autorizar é a empresa de origem, não só o cliente. Assim, a
   * pessoa preenche o formulário com os próprios dados — como o autofill do
   * navegador faz.
   */
  const profile = session
    ? await db.userProfile.findUnique({ where: { userId: session.user.id } })
    : null;

  /**
   * Quanto tempo de agenda este orçamento consome.
   *
   * A grade só pode oferecer horários onde a corrida inteira cabe. Sem isto, o
   * cliente escolhia as 17:30 para um atendimento de 90 minutos numa casa que
   * fecha às 18:00 — e o servidor recusava depois de ele já ter preenchido o
   * formulário todo.
   */
  const serviceMinutes = totalServiceMinutes([
    ...estimate.serviceTypes.map((st) => ({
      estimatedMinutes: st.serviceType.estimatedMinutes,
      quantity: st.quantity,
    })),
    ...estimate.extraServices.map((es) => ({
      estimatedMinutes: es.extraService.estimatedMinutes,
      quantity: es.quantity,
    })),
  ]);
  const neededSlots = slotsNeeded(serviceMinutes, config.agenda.intervalMinutes);

  const prefill = session
    ? {
        firstName: profile?.firstName ?? session.user.name?.split(" ")[0] ?? "",
        lastName: profile?.lastName ?? session.user.name?.split(" ").slice(1).join(" ") ?? "",
        email: session.user.email,
        phone: profile?.phone ?? "",
        address: profile?.address ?? "",
        aptNo: profile?.aptNo ?? "",
        city: profile?.city ?? "",
        zip: profile?.zip ?? "",
      }
    : null;
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

  // Janelas de desconto em horário ocioso. O cálculo real acontece no
  // servidor ao criar o agendamento; isto é só para o cliente ver o preço
  // certo ANTES de confirmar, e não ser surpreendido no total.
  const offPeakWindows = await db.offPeakWindow.findMany({
    where: { companyId: estimate.companyId, isActive: true },
    select: {
      id: true,
      label: true,
      weekday: true,
      startTime: true,
      endTime: true,
      discountPercentage: true,
      isActive: true,
    },
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
      driveTimeEnabled={config.company.driveTimeEnabled}
      offPeakWindows={offPeakWindows}
      prefill={prefill}
      requireDeposit={depositPolicy.percentage > 0}
      depositPercentage={depositPolicy.percentage}
      slotsNeeded={neededSlots}
      serviceMinutes={serviceMinutes}
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
