import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProductStats, getCompanyProducts, getProductCategories } from "@/server/queries/products";
import { ProdutosClient } from "./produtos-client";

type Props = {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string; category?: string; lowStock?: string }>;
};

export default async function ProdutosPage({ params, searchParams }: Props) {
  const { companySlug } = await params;
  const { page, pageSize, q, category, lowStock } = await searchParams;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const company = await db.company.findUnique({
    where: { slug: companySlug },
    select: { id: true, name: true, currency: true },
  });
  if (!company) redirect("/dashboard");

  const currentPage = page ? parseInt(page, 10) : 1;
  const currentPageSize = pageSize ? parseInt(pageSize, 10) : 10;
  const lowStockOnly = lowStock === "true";

  const [stats, productsResult, categories] = await Promise.all([
    getProductStats(companySlug),
    getCompanyProducts(companySlug, {
      page: currentPage,
      pageSize: currentPageSize,
      search: q,
      category: category || "ALL",
      lowStockOnly,
    }),
    getProductCategories(companySlug),
  ]);

  return (
    <ProdutosClient
      companySlug={companySlug}
      companyName={company.name}
      currency={company.currency}
      stats={stats}
      productsResult={productsResult}
      categories={categories}
      currentSearch={q || ""}
      currentCategory={category || "ALL"}
      currentLowStockOnly={lowStockOnly}
    />
  );
}
