import { db } from "@/lib/db";
import { notFound } from "next/navigation";
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
          company: { select: { name: true, logoUrl: true } },
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

  const orderItems = [
    ...estimate.serviceTypes.map((item) => ({
      label: `${item.serviceType.service.name} — ${item.serviceType.name}${item.quantity > 1 ? ` ×${item.quantity}` : ""}`,
      subtotal: Number(item.subtotal),
    })),
    ...estimate.extraServices.map((item) => ({
      label: item.extraService.name,
      subtotal: Number(item.subtotal),
    })),
  ];

  const FREQ_LABELS: Record<string, string> = {
    ONCE: "Única vez",
    WEEKLY: "Semanal",
    BIWEEKLY: "Quinzenal",
    MONTHLY: "Mensal",
  };

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
