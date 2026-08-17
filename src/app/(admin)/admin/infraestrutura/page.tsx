import { getInfrastructureStatusAction } from "@/server/actions/admin-infra";
import { InfraClient } from "./infra-client";

export default async function InfraestruturaPage() {
  const result = await getInfrastructureStatusAction();

  return (
    <InfraClient
      initialServices={result.services}
      initialTenantSummary={result.tenantSummary}
      initialCheckTimeMs={result.totalCheckTimeMs}
    />
  );
}
