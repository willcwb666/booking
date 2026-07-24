import { getAdminStats } from "@/server/queries/admin";
import { AdminOverviewClient } from "./admin-overview-client";

export default async function AdminOverviewPage() {
  const stats = await getAdminStats();

  return <AdminOverviewClient stats={stats} />;
}
