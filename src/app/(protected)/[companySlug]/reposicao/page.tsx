import { notFound } from "next/navigation";
import { canAccessCompany } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { getRestockList } from "@/server/queries/restock";
import { ReposicaoClient } from "./reposicao-client";

export const metadata = {
  title: "Reposição de estoque",
};

export default async function ReposicaoPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;

  const access = await canAccessCompany(companySlug);
  if (!access.ok) notFound();

  const [{ items, windowDays }, company] = await Promise.all([
    getRestockList(access.companyId),
    db.company.findUniqueOrThrow({
      where: { id: access.companyId },
      select: { name: true },
    }),
  ]);

  return (
    <ReposicaoClient
      companyName={company.name}
      items={items}
      windowDays={windowDays}
    />
  );
}
