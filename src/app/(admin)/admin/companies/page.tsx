import {
  getAdminCompanies,
  getAdminCompanyFilterOptions,
  type AdminCompanySort,
} from "@/server/queries/admin";
import { AdminCompaniesClient } from "./companies-client";

const SORTS: AdminCompanySort[] = [
  "name",
  "businessType",
  "planName",
  "memberCount",
  "bookingCount",
  "isActive",
  "createdAt",
];

type SearchParams = {
  q?: string;
  page?: string;
  pageSize?: string;
  type?: string;
  plan?: string;
  status?: string;
  sort?: string;
  dir?: string;
};

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const currentPage = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const currentPageSize = [10, 20, 30, 50, 100].includes(Number(sp.pageSize))
    ? Number(sp.pageSize)
    : 10;

  const sort = SORTS.includes(sp.sort as AdminCompanySort)
    ? (sp.sort as AdminCompanySort)
    : "createdAt";
  const dir = sp.dir === "asc" ? "asc" : "desc";
  const status =
    sp.status === "ACTIVE" || sp.status === "INACTIVE" ? sp.status : undefined;

  const [result, filterOptions] = await Promise.all([
    getAdminCompanies({
      search: sp.q,
      page: currentPage,
      pageSize: currentPageSize,
      businessType: sp.type || undefined,
      planId: sp.plan || undefined,
      status,
      sort,
      dir,
    }),
    getAdminCompanyFilterOptions(),
  ]);

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
      filters={{
        q: sp.q ?? "",
        type: sp.type ?? "",
        plan: sp.plan ?? "",
        status: status ?? "",
        sort,
        dir,
      }}
      options={filterOptions}
    />
  );
}
