import { getAdminCompanies } from "@/server/queries/admin";
import { AdminCompaniesClient } from "./companies-client";

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);

  const result = await getAdminCompanies({ search: q, page: currentPage });

  return (
    <AdminCompaniesClient
      items={result.items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      }))}
      total={result.total}
      page={result.page}
      pageCount={result.pageCount}
      search={q ?? ""}
    />
  );
}
