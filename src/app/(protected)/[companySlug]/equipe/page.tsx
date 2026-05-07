import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { getTeamMembers } from "@/server/queries/team";
import { notFound } from "next/navigation";
import { EquipeClient } from "./equipe-client";

export default async function EquipePage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const company = await getCompanyBySlugForUser(companySlug, session!.user.id);
  if (!company) notFound();

  const members = await getTeamMembers(company.id);
  const currentUserRole = company.members[0].role;

  return (
    <EquipeClient
      companySlug={companySlug}
      members={members.map((m) => ({ ...m, joinedAt: m.joinedAt.toISOString() }))}
      currentUserId={session!.user.id}
      currentUserRole={currentUserRole}
    />
  );
}
