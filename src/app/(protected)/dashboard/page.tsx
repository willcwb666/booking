import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getUserCompanies } from "@/server/queries/companies";

/**
 * Roteador pós-login:
 * - admin da plataforma sem empresa → painel /admin
 * - sem empresa → criação de empresa (onboarding)
 * - 1 empresa → dashboard dela
 * - 2+ empresas → seletor de ambiente
 */
export default async function DashboardRouterPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const memberships = await getUserCompanies(session.user.id);
  const companies = memberships.filter((m) => m.company.isActive);

  if (companies.length === 0) {
    if (session.user.role === "admin") redirect("/admin");
    redirect("/onboarding");
  }
  if (companies.length === 1) {
    redirect(`/${companies[0].company.slug}/dashboard`);
  }
  redirect("/selecionar-empresa");
}
