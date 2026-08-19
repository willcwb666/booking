import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getActiveSession } from "@/lib/session";
import { canAccessModule } from "@/lib/module-guard";
import { getClientVault } from "@/server/queries/client-vault";
import { VAULT_MODULE } from "@/lib/client-vault";
import { CofreClient } from "./cofre-client";

export const metadata = {
  title: "Cofre do cliente",
  // Página com foto de cliente não entra em índice nenhum.
  robots: { index: false, follow: false },
};

export default async function CofrePage({
  params,
}: {
  params: Promise<{ companySlug: string; customerId: string }>;
}) {
  const { companySlug, customerId } = await params;

  /**
   * O guard cobre as duas portas: acesso à empresa e contrato do módulo.
   *
   * `notFound()` em vez de uma tela de "contrate o módulo" quando a licença
   * falta — quem não tem o módulo não precisa saber que o cofre daquele
   * cliente existe.
   */
  const access = await canAccessModule(companySlug, VAULT_MODULE);
  if (!access.ok) notFound();

  const customer = await db.customer.findFirst({
    where: { id: customerId, companyId: access.companyId },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!customer) notFound();

  const session = await getActiveSession();

  /**
   * Quem está olhando é um profissional desta empresa?
   *
   * Se for, o autocomplete passa a responder "o que EU costumo usar" em vez de
   * "o que a casa já usou" — que é a pergunta certa para quem vai aplicar. Para
   * a recepção ou o dono, o histórico da empresa inteira é o melhor disponível.
   */
  const self = session
    ? await db.professional.findFirst({
        where: { companyId: access.companyId, userId: session.user.id, isActive: true },
        select: { id: true },
      })
    : null;

  const [vault, professionals] = await Promise.all([
    getClientVault({
      companyId: access.companyId,
      customerId: customer.id,
      professionalId: self?.id ?? null,
    }),
    db.professional.findMany({
      where: { companyId: access.companyId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <CofreClient
      companySlug={companySlug}
      customer={{
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`.trim(),
      }}
      vault={vault}
      professionals={professionals}
      defaultProfessionalId={self?.id ?? null}
    />
  );
}
