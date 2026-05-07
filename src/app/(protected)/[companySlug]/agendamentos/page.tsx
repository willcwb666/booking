import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { getBookings } from "@/server/queries/bookings";
import { notFound } from "next/navigation";
import { AgendamentosClient } from "./agendamentos-client";
import type { BookingStatus } from "@/generated/prisma/client";

const VALID_STATUSES = ["ALL", "PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "RESCHEDULED"];

export default async function AgendamentosPage({
  params,
  searchParams,
}: {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{
    status?: string;
    from?: string;
    to?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const { companySlug } = await params;
  const { status, from, to, q, page } = await searchParams;

  const session = await auth.api.getSession({ headers: await headers() });
  const company = await getCompanyBySlugForUser(companySlug, session!.user.id);
  if (!company) notFound();

  const safeStatus =
    status && VALID_STATUSES.includes(status) ? (status as BookingStatus | "ALL") : "ALL";
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);

  const result = await getBookings({
    companyId: company.id,
    status: safeStatus,
    dateFrom: from,
    dateTo: to,
    search: q,
    page: currentPage,
  });

  return (
    <AgendamentosClient
      companySlug={companySlug}
      items={result.items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      }))}
      total={result.total}
      page={result.page}
      pageCount={result.pageCount}
      filters={{ status: safeStatus, from: from ?? "", to: to ?? "", q: q ?? "" }}
    />
  );
}
