import { getAdminUsers } from "@/server/queries/admin";
import { AdminUsersClient } from "./users-client";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);

  const result = await getAdminUsers({ search: q, page: currentPage });

  return (
    <AdminUsersClient
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
