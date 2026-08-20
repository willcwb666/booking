import { canAccessModule } from "@/lib/module-guard";
import { MODULE_CODES } from "@/lib/module-codes";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { WaitlistAdminClient } from "./waitlist-admin-client";

export default async function WaitlistPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;

  /**
   * Modulo licenciado. Ate aqui a licenca so escondia o item do MENU — quem
   * soubesse a URL entrava e usava a funcionalidade paga inteira.
   */
  const moduleAccess = await canAccessModule(companySlug, MODULE_CODES.waitlist);
  if (!moduleAccess.ok) notFound();
  const session = await auth.api.getSession({ headers: await headers() });
  const company = await getCompanyBySlugForUser(companySlug, session!.user.id);
  if (!company) notFound();

  const role = company.members[0].role;
  const canEdit = role === "OWNER" || role === "MANAGER";

  const entries = await db.waitlistEntry.findMany({
    where: { companyId: company.id },
    include: {
      bookingConfig: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="page-container">
     <div className="page-content">
      <div className="page-header !mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Lista de espera</h1>
          <p className="page-description">
            Clientes aguardando disponibilidade de horário
          </p>
        </div>
        <Link
          href={`/book/${companySlug}/waitlist`}
          target="_blank"
          className="shrink-0 text-xs text-[var(--color-primary)] hover:underline"
        >
          Ver link público →
        </Link>
      </div>

      <WaitlistAdminClient
        entries={entries.map((e) => ({
          id: e.id,
          customerName: e.customerName,
          customerEmail: e.customerEmail,
          customerPhone: e.customerPhone,
          preferredDate: e.preferredDate,
          preferredStartTime: e.preferredStartTime,
          status: e.status,
          configName: e.bookingConfig.name,
          notifiedAt: e.notifiedAt?.toISOString() ?? null,
          createdAt: e.createdAt.toISOString(),
        }))}
        companySlug={companySlug}
        canEdit={canEdit}
      />
     </div>
    </div>
  );
}
