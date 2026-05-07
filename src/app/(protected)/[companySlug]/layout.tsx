import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { CompanyProvider } from "@/lib/company-context";
import { AppSidebar } from "@/components/ui/app-sidebar";

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const company = await getCompanyBySlugForUser(companySlug, session.user.id);
  if (!company) notFound();

  const member = company.members[0];

  return (
    <CompanyProvider
      company={{
        id: company.id,
        name: company.name,
        slug: company.slug,
        businessType: company.businessType,
        planTier: company.plan.tier,
        planDisplayName: company.plan.displayName,
        role: member.role,
      }}
    >
      <div className="flex min-h-screen bg-gray-50">
        <AppSidebar userName={session.user.name} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </CompanyProvider>
  );
}
