import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { formatMoney } from "@/lib/format";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-blue-100 text-blue-700",
  CONVERTED: "bg-emerald-100 text-emerald-700",
};

function formatDate(d: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

export default async function MeusOrcamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ salvo?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { salvo } = await searchParams;
  const t = await getTranslations("quotes");

  const estimates = await db.estimate.findMany({
    where: {
      customerId: session!.user.id,
      status: { in: ["PENDING", "CONVERTED"] },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      company: { select: { name: true, slug: true, currency: true, locale: true } },
      bookingConfig: { select: { id: true, name: true } },
      serviceTypes: {
        include: { serviceType: { select: { name: true, service: { select: { name: true } } } } },
      },
      extraServices: {
        include: { extraService: { select: { name: true } } },
      },
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 shrink-0">
              {t("back")}
            </Link>
            <h1 className="text-lg font-bold text-gray-900 truncate">{t("title")}</h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <LanguageSwitcher />
            <Link href="/empresas" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              {t("new")}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {salvo && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm" role="status">
            {t("savedBanner")}
          </div>
        )}

        {estimates.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <p className="text-gray-500 text-sm mb-4">{t("empty")}</p>
            <Link
              href="/empresas"
              className="inline-block px-5 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            >
              {t("findCompanies")}
            </Link>
          </div>
        ) : (
          estimates.map((est) => {
            const statusClass = STATUS_STYLE[est.status] ?? STATUS_STYLE.PENDING;
            const statusLabel = est.status === "CONVERTED" ? t("statusBooked") : t("statusSaved");
            const items = [
              ...est.serviceTypes.map((i) => ({
                label: `${i.serviceType.service.name} — ${i.serviceType.name}`,
                qty: i.quantity,
                subtotal: Number(i.subtotal),
              })),
              ...est.extraServices.map((i) => ({
                label: i.extraService.name,
                qty: i.quantity,
                subtotal: Number(i.subtotal),
              })),
            ];
            return (
              <div key={est.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{est.company.name}</p>
                    <p className="text-xs text-gray-500">
                      {est.bookingConfig.name} · {t("savedOn", { date: formatDate(est.updatedAt, est.company.locale) })}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${statusClass}`}>
                    {statusLabel}
                  </span>
                </div>

                <ul className="space-y-1.5 mb-4 border-t border-gray-100 pt-3">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start justify-between gap-2 text-sm">
                      <span className="text-gray-700 flex-1 min-w-0">
                        {item.label}
                        {item.qty > 1 && <span className="text-gray-400 ml-1">×{item.qty}</span>}
                      </span>
                      <span className="text-gray-900 shrink-0">
                        {formatMoney(item.subtotal, est.company.currency, est.company.locale)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
                  <p className="text-sm">
                    <span className="text-gray-500">{t("total")} </span>
                    <span className="font-bold text-gray-900">
                      {formatMoney(Number(est.total), est.company.currency, est.company.locale)}
                    </span>
                  </p>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/book/${est.company.slug}/${est.bookingConfig.id}`}
                      className="px-3 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      {t("redo")}
                    </Link>
                    {est.status === "PENDING" && (
                      <Link
                        href={`/book/${est.company.slug}/${est.bookingConfig.id}/checkout?estimate=${est.id}`}
                        className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        {t("generateBooking")}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
