import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { WaitlistForm } from "./waitlist-form";

export default async function WaitlistPage({
  params,
  searchParams,
}: {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ config?: string }>;
}) {
  const { companySlug } = await params;
  const { config: configId } = await searchParams;

  const company = await db.company.findFirst({
    where: { slug: companySlug, isActive: true },
    select: { id: true, name: true },
  });
  if (!company) notFound();

  const configs = await db.bookingConfig.findMany({
    where: { companyId: company.id, status: "PUBLISHED" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  if (configs.length === 0) notFound();

  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)]">
      <header className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-sm font-semibold text-[var(--color-text-heading)]">{company.name}</h1>
          <p className="text-xs text-[var(--color-text-muted)]">Lista de espera</p>
        </div>
      </header>
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-6">
          <h2 className="text-base font-semibold text-[var(--color-text-heading)] mb-1">Entrar na lista de espera</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-5">
            Quando uma vaga abrir na data escolhida, você será notificado por e-mail.
          </p>
          <WaitlistForm configs={configs} defaultConfigId={configId} />
        </div>
      </div>
    </div>
  );
}
