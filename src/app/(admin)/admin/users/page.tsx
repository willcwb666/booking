import { getAdminUsers, type AdminUserFilter } from "@/server/queries/admin";
import { AdminUsersClient } from "./users-client";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    pageSize?: string;
    filter?: string;
  }>;
}) {
  const { q, page, pageSize, filter } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const currentPageSize = [10, 20, 30, 50, 100].includes(Number(pageSize))
    ? Number(pageSize)
    : 10;
  const currentFilter: AdminUserFilter =
    filter === "ADMIN" || filter === "BANNED" ? filter : "ALL";

  const result = await getAdminUsers({
    search: q,
    page: currentPage,
    pageSize: currentPageSize,
    filter: currentFilter,
  });

  return (
    <AdminUsersClient
      items={result.items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      }))}
      total={result.total}
      page={result.page}
      pageSize={currentPageSize}
      pageCount={result.pageCount}
      search={q ?? ""}
      filter={currentFilter}
    />
  );
}
