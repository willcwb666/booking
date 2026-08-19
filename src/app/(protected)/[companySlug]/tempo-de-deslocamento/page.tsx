import { notFound } from "next/navigation";
import { canAccessCompany } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { TempoDeDeslocamentoClient } from "./tempo-de-deslocamento-client";

export const metadata = {
  title: "Tempo de deslocamento",
};

export default async function TempoDeDeslocamentoPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;

  const access = await canAccessCompany(companySlug);
  if (!access.ok) notFound();

  const today = new Date().toISOString().split("T")[0];

  const [company, upcoming, located, blocks] = await Promise.all([
    db.company.findUnique({
      where: { id: access.companyId },
      select: {
        driveTimeEnabled: true,
        driveTimeMinutesPerKm: true,
        driveTimeMaxMinutes: true,
      },
    }),
    db.booking.count({
      where: {
        companyId: access.companyId,
        scheduledDate: { gte: today },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
    }),
    // Quantos desses o sistema conseguiu localizar no mapa. A diferença entre
    // os dois números é a única medida honesta do alcance do recurso: ele só
    // protege o trecho que conseguiu medir.
    db.booking.count({
      where: {
        companyId: access.companyId,
        scheduledDate: { gte: today },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        customerDetail: { latitude: { not: null } },
      },
    }),
    db.scheduleEvent.count({
      where: {
        companyId: access.companyId,
        date: { gte: today },
        source: "DRIVE_TIME",
      },
    }),
  ]);

  if (!company) notFound();

  return (
    <TempoDeDeslocamentoClient
      companySlug={companySlug}
      settings={{
        enabled: company.driveTimeEnabled,
        minutesPerKm: company.driveTimeMinutesPerKm,
        maxMinutes: company.driveTimeMaxMinutes,
      }}
      coverage={{ upcoming, located, blocks }}
    />
  );
}
