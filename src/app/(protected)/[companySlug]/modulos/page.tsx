import { getSystemModulesAction, getCompanyLicensedModuleCodesAction } from "@/server/actions/admin-modules";
import { CompanyModulosClient } from "./modulos-client";

export default async function CompanyModulosStorePage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const [resModules, activeModuleCodes] = await Promise.all([
    getSystemModulesAction(),
    getCompanyLicensedModuleCodesAction(companySlug),
  ]);

  return (
    <CompanyModulosClient
      companySlug={companySlug}
      modules={resModules.modules || []}
      activeModuleCodes={activeModuleCodes || []}
    />
  );
}
