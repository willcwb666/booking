import { notFound } from "next/navigation";
import { canAccessCompany } from "@/lib/admin-guard";
import { getWinBackCustomers } from "@/server/queries/win-back";
import { ResgateClient } from "./resgate-client";

export const metadata = {
  title: "Resgate de clientes",
};

export default async function ResgatePage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;

  // A tela expõe a carteira inteira com telefone e histórico de gasto —
  // exatamente o tipo de listagem que precisa de verificação própria, não da
  // proteção do layout.
  const access = await canAccessCompany(companySlug);
  if (!access.ok) notFound();

  const customers = await getWinBackCustomers(access.companyId);

  return <ResgateClient companySlug={companySlug} customers={customers} />;
}
