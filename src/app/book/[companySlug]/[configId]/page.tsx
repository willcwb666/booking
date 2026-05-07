import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { BookingClient } from "./booking-client";

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
      company: { select: { name: true, logoUrl: true } },
      serviceTypes: {
        include: {
          serviceType: {
            select: {
              id: true,
              name: true,
              estimatedMinutes: true,
              price: true,
              service: { select: { name: true } },
            },
          },
        },
      },
      extraServices: {
        include: {
          extraService: {
            select: { id: true, name: true, estimatedMinutes: true, price: true },
          },
        },
      },
    },
  });

  if (!config) notFound();

  return (
    <BookingClient
      companySlug={companySlug}
      configId={configId}
      companyName={config.company.name}
      companyLogo={config.company.logoUrl}
      configName={config.name}
      allowPartialService={config.allowPartialService}
      serviceTypes={config.serviceTypes.map((s) => ({
        id: s.serviceType.id,
        name: s.serviceType.name,
        serviceName: s.serviceType.service.name,
        price: Number(s.serviceType.price),
        estimatedMinutes: s.serviceType.estimatedMinutes,
      }))}
      extraServices={config.extraServices.map((e) => ({
        id: e.extraService.id,
        name: e.extraService.name,
        price: Number(e.extraService.price),
        estimatedMinutes: e.extraService.estimatedMinutes,
      }))}
    />
  );
}
