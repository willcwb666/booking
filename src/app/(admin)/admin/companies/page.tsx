import { getAdminCompanies } from "@/server/queries/admin";
import { AdminCompaniesClient } from "./companies-client";

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string }>;
}) {
  const { q, page, pageSize } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const currentPageSize = [10, 20, 30, 50, 100].includes(Number(pageSize)) ? Number(pageSize) : 10;

  const result = await getAdminCompanies({ search: q, page: currentPage, pageSize: currentPageSize });

  return (
    <AdminCompaniesClient
      items={result.items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      }))}
      total={result.total}
      page={result.page}
      pageSize={currentPageSize}
      pageCount={result.pageCount}
      search={q ?? ""}
    />
  );
}
