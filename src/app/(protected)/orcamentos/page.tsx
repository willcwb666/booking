import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { formatMoney } from "@/lib/format";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-[var(--color-info-light)] text-[var(--color-info)]",
  CONVERTED: "bg-[var(--color-success-light)] text-[var(--color-success)]",
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
    <div className="min-h-screen bg-[var(--color-bg-subtle)]">
      <header className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)] shrink-0">
              {t("back")}
            </Link>
            <h1 className="text-lg font-bold text-[var(--color-text-heading)] truncate">{t("title")}</h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <LanguageSwitcher />
            <Link href="/empresas" className="text-sm font-medium text-[var(--color-info)] hover:text-[var(--color-info)]">
              {t("new")}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {salvo && (
          <div className="p-3 rounded-[var(--radius-control)] bg-[var(--color-success-light)] border border-[var(--color-success-border)] text-[var(--color-success)] text-sm" role="status">
            {t("savedBanner")}
          </div>
        )}

        {estimates.length === 0 ? (
          <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-10 text-center">
            <p className="text-[var(--color-text-muted)] text-sm mb-4">{t("empty")}</p>
            <Link
              href="/empresas"
              className="inline-block px-5 py-2.5 text-sm font-semibold bg-[var(--color-info)] text-white rounded-[var(--radius-control)] hover:bg-[var(--color-info)]"
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
              <div key={est.id} className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text-heading)]">{est.company.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {est.bookingConfig.name} · {t("savedOn", { date: formatDate(est.updatedAt, est.company.locale) })}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${statusClass}`}>
                    {statusLabel}
                  </span>
                </div>

                <ul className="space-y-1.5 mb-4 border-t border-[var(--color-border)] pt-3">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start justify-between gap-2 text-sm">
                      <span className="text-[var(--color-text)] flex-1 min-w-0">
                        {item.label}
                        {item.qty > 1 && <span className="text-[var(--color-text-subtle)] ml-1">×{item.qty}</span>}
                      </span>
                      <span className="text-[var(--color-text-heading)] shrink-0">
                        {formatMoney(item.subtotal, est.company.currency, est.company.locale)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3">
                  <p className="text-sm">
                    <span className="text-[var(--color-text-muted)]">{t("total")} </span>
                    <span className="font-bold text-[var(--color-text-heading)]">
                      {formatMoney(Number(est.total), est.company.currency, est.company.locale)}
                    </span>
                  </p>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/book/${est.company.slug}/${est.bookingConfig.id}`}
                      className="px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)] border border-[var(--color-border)] rounded-[var(--radius-control)] hover:bg-[var(--color-bg-subtle)]"
                    >
                      {t("redo")}
                    </Link>
                    {est.status === "PENDING" && (
                      <Link
                        href={`/book/${est.company.slug}/${est.bookingConfig.id}/checkout?estimate=${est.id}`}
                        className="px-4 py-2 text-xs font-semibold bg-[var(--color-info)] text-white rounded-[var(--radius-control)] hover:bg-[var(--color-info)]"
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
