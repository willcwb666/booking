import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getGiftCardStats, getCompanyGiftCards } from "@/server/queries/gift-cards";
import { GiftCardsClient } from "./gift-cards-client";

type Props = {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string; status?: string }>;
};

export default async function GiftCardsPage({ params, searchParams }: Props) {
  const { companySlug } = await params;
  const { page, pageSize, q, status } = await searchParams;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const company = await db.company.findUnique({
    where: { slug: companySlug },
    select: { id: true, name: true, currency: true },
  });
  if (!company) redirect("/dashboard");

  const currentPage = page ? parseInt(page, 10) : 1;
  const currentPageSize = pageSize ? parseInt(pageSize, 10) : 10;

  const [stats, giftCardsResult] = await Promise.all([
    getGiftCardStats(companySlug),
    getCompanyGiftCards(companySlug, {
      page: currentPage,
      pageSize: currentPageSize,
      search: q,
      status: status || "ALL",
    }),
  ]);

  return (
    <GiftCardsClient
      companySlug={companySlug}
      companyName={company.name}
      currency={company.currency}
      stats={stats}
      giftCardsResult={giftCardsResult}
      currentSearch={q || ""}
      currentStatus={status || "ALL"}
    />
  );
}
