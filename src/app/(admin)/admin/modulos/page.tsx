import {
  getSystemModulesAction,
  getAllActiveCompanyLicensesAction,
} from "@/server/actions/admin-modules";
import { getAdminSegments } from "@/server/queries/admin-segments";
import { db } from "@/lib/db";
import { AdminModulosClient } from "./modulos-client";

export default async function AdminModulosPage() {
  const [resModules, resLicenses, companies, rawSegments] = await Promise.all([
    getSystemModulesAction(),
    getAllActiveCompanyLicensesAction(),
    db.company.findMany({
      select: { id: true, name: true, slug: true, businessType: true },
      orderBy: { name: "asc" },
    }),
    getAdminSegments(true),
  ]);

  const segments = rawSegments.map((s) => ({
    code: s.code,
    label: s.label,
  }));

  return (
    <AdminModulosClient
      modules={resModules.modules || []}
      companies={companies}
      segments={segments}
      activeLicenses={resLicenses.licenses || []}
    />
  );
}
