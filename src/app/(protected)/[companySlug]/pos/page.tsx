import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOpenBookingsForPos, getPosStats, getRecentPosSales } from "@/server/queries/pos";
import { getProductsForPos } from "@/server/queries/products";
import { PosClient } from "./pos-client";

type Props = {
  params: Promise<{ companySlug: string }>;
};

export default async function PosPage({ params }: Props) {
  const { companySlug } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const company = await db.company.findUnique({
    where: { slug: companySlug },
    select: {
      id: true,
      name: true,
      currency: true,
      professionals: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          productCommissionRate: true,
          commissionRate: true,
          commissionPercentage: true,
        },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!company) redirect("/dashboard");

  const [openBookings, products, stats, recentSales] = await Promise.all([
    getOpenBookingsForPos(companySlug),
    getProductsForPos(companySlug),
    getPosStats(companySlug),
    getRecentPosSales(companySlug, { page: 1, pageSize: 10 }),
  ]);

  const professionals = company.professionals.map((p) => ({
    id: p.id,
    name: p.name,
    productCommissionRate: Number(p.productCommissionRate ?? 0),
    serviceCommissionRate: Number(p.commissionRate ?? p.commissionPercentage ?? 0),
  }));

  return (
    <PosClient
      companySlug={companySlug}
      companyName={company.name}
      currency={company.currency}
      openBookings={openBookings}
      products={products}
      stats={stats}
      recentSales={recentSales}
      professionals={professionals}
    />
  );
}
