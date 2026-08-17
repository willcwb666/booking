import { getAdminStats, getCompaniesForSelector } from "@/server/queries/admin";
import { AdminOverviewClient } from "./admin-overview-client";

export default async function AdminOverviewPage() {
  const [stats, companies] = await Promise.all([
    getAdminStats(),
    getCompaniesForSelector(),
  ]);

  return <AdminOverviewClient stats={stats} companies={companies} />;
}

