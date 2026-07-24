import { getSuperAdminReportsAction } from "@/server/actions/reports";
import { AdminRelatoriosClient } from "./relatorios-client";

export default async function AdminRelatoriosPage() {
  const res = await getSuperAdminReportsAction();
  return <AdminRelatoriosClient reports={res.reports} />;
}
