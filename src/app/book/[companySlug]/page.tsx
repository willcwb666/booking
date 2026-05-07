import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function CompanyPublicPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;

  const company = await db.company.findFirst({
    where: { slug: companySlug, isActive: true },
    include: {
      bookingConfigs: {
        where: { status: "PUBLISHED" },
        include: {
          serviceTypes: {
            include: { serviceType: { select: { name: true, service: { select: { name: true } } } } },
          },
          _count: { select: { estimates: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!company) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-6 flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <span className="text-white text-lg font-bold">
              {company.name[0].toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{company.name}</h1>
            {company.address && (
              <p className="text-sm text-gray-500">{company.address}</p>
            )}
            {company.phone && (
              <p className="text-sm text-gray-500">{company.phone}</p>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Serviços disponíveis
        </h2>

        {company.bookingConfigs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <p className="text-gray-500 text-sm">
              Nenhum serviço disponível no momento.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {company.bookingConfigs.map((config) => {
              const serviceNames = [
                ...new Set(
                  config.serviceTypes.map((s) => s.serviceType.service.name)
                ),
              ];
              return (
                <Link
                  key={config.id}
                  href={`/book/${companySlug}/${config.id}`}
                  className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{config.name}</h3>
                      {serviceNames.length > 0 && (
                        <p className="text-sm text-gray-500 mt-1">
                          {serviceNames.join(" · ")}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm text-blue-600 font-medium">
                      Agendar →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
