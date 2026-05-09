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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-sm font-semibold text-gray-900">{company.name}</h1>
          <p className="text-xs text-gray-500">Lista de espera</p>
        </div>
      </header>
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Entrar na lista de espera</h2>
          <p className="text-sm text-gray-500 mb-5">
            Quando uma vaga abrir na data escolhida, você será notificado por e-mail.
          </p>
          <WaitlistForm configs={configs} defaultConfigId={configId} />
        </div>
      </div>
    </div>
  );
}
