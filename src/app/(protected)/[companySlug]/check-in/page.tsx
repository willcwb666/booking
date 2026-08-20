import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { canAccessModule } from "@/lib/module-guard";
import { CHECKIN_MODULE } from "@/lib/checkin-geofence";
import { CheckinSettingsClient } from "./check-in-client";

export const metadata = {
  title: "Check-in por proximidade",
};

export default async function CheckinSettingsPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;

  const access = await canAccessModule(companySlug, CHECKIN_MODULE);
  if (!access.ok) notFound();

  const company = await db.company.findUnique({
    where: { id: access.companyId },
    select: {
      latitude: true,
      longitude: true,
      checkinRadiusMeters: true,
      address: true,
    },
  });
  if (!company) notFound();

  return (
    <CheckinSettingsClient
      companySlug={companySlug}
      settings={{
        latitude: company.latitude,
        longitude: company.longitude,
        radiusMeters: company.checkinRadiusMeters,
      }}
      hasAddress={Boolean(company.address && company.address.trim().length >= 5)}
    />
  );
}
