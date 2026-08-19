import { notFound } from "next/navigation";
import { canAccessCompany } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { getOccupancyGrid } from "@/server/queries/occupancy";
import { suggestOffPeakWindows } from "@/lib/off-peak";
import { HorariosOciososClient } from "./horarios-ociosos-client";

export const metadata = {
  title: "Horários ociosos",
};

export default async function HorariosOciososPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;

  const access = await canAccessCompany(companySlug);
  if (!access.ok) notFound();

  const [windows, grid] = await Promise.all([
    db.offPeakWindow.findMany({
      where: { companyId: access.companyId },
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
    }),
    getOccupancyGrid(access.companyId),
  ]);

  return (
    <HorariosOciososClient
      companySlug={companySlug}
      windows={windows.map((w) => ({
        id: w.id,
        label: w.label,
        weekday: w.weekday,
        startTime: w.startTime,
        endTime: w.endTime,
        discountPercentage: w.discountPercentage,
        isActive: w.isActive,
      }))}
      grid={grid}
      suggestions={suggestOffPeakWindows(grid)}
    />
  );
}
