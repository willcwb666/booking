import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { BookingClient } from "./booking-client";

function todayInTz(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
}

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ companySlug: string; configId: string }>;
}) {
  const { companySlug, configId } = await params;

  const config = await db.bookingConfig.findFirst({
    where: {
      id: configId,
      status: "PUBLISHED",
      company: { slug: companySlug, isActive: true },
    },
    include: {
      company: { select: { name: true, logoUrl: true, currency: true, locale: true, timezone: true } },
      serviceTypes: {
        include: {
          serviceType: {
            select: {
              id: true,
              name: true,
              estimatedMinutes: true,
              price: true,
              allowQuantity: true,
              service: { select: { name: true } },
            },
          },
        },
      },
      extraServices: {
        include: {
          extraService: {
            select: { id: true, name: true, estimatedMinutes: true, price: true, allowQuantity: true },
          },
        },
      },
    },
  });

  if (!config) notFound();

  // Promoções vigentes hoje (fuso da empresa) para os serviços deste config
  const today = todayInTz(config.company.timezone);
  const promotions = await db.promotion.findMany({
    where: {
      companyId: config.companyId,
      isActive: true,
      serviceTypeId: { in: config.serviceTypes.map((s) => s.serviceType.id) },
      startDate: { lte: today },
      endDate: { gte: today },
    },
    select: { serviceTypeId: true, promoPrice: true, description: true },
  });
  const promoMap = new Map<string, { price: number; description: string }>();
  for (const p of promotions) {
    const price = Number(p.promoPrice);
    const prev = promoMap.get(p.serviceTypeId);
    if (!prev || price < prev.price) promoMap.set(p.serviceTypeId, { price, description: p.description });
  }

  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <BookingClient
      companySlug={companySlug}
      configId={configId}
      companyName={config.company.name}
      companyLogo={config.company.logoUrl}
      configName={config.name}
      allowPartialService={config.allowPartialService}
      currency={config.company.currency}
      locale={config.company.locale}
      isLoggedIn={Boolean(session)}
      serviceTypes={config.serviceTypes.map((s) => ({
        id: s.serviceType.id,
        name: s.serviceType.name,
        serviceName: s.serviceType.service.name,
        price: Number(s.serviceType.price),
        promoPrice: promoMap.get(s.serviceType.id)?.price ?? null,
        promoDescription: promoMap.get(s.serviceType.id)?.description ?? null,
        estimatedMinutes: s.serviceType.estimatedMinutes,
        allowQuantity: s.serviceType.allowQuantity,
      }))}
      extraServices={config.extraServices.map((e) => ({
        id: e.extraService.id,
        name: e.extraService.name,
        price: Number(e.extraService.price),
        estimatedMinutes: e.extraService.estimatedMinutes,
        allowQuantity: e.extraService.allowQuantity,
      }))}
    />
  );
}
