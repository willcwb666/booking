"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, type StatusBadgeVariant } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/format";
import { RangeFilter } from "@/components/ui/range-filter";
import { DeltaStat } from "@/components/ui/delta-stat";
import { TrendChart } from "@/components/charts/trend-chart";
import { BreakdownBars } from "@/components/charts/breakdown-bars";
import type { CustomerPortalBooking } from "@/server/queries/bookings";
import type { CustomerOverview } from "@/server/queries/analytics";
import type { AnalyticsRange } from "@/lib/analytics-range";
import {
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  Info,
  Phone,
  User,
} from "@/components/ui/icons";

type Props = {
  companySlug: string;
  companyName: string;
  companyPhone: string | null;
  currency: string;
  locale: string;
  bookings: CustomerPortalBooking[];
  emailVerified: boolean;
  range: AnalyticsRange;
  /** `null` quando o e-mail ainda não foi verificado. */
  overview: CustomerOverview | null;
};

const STATUS_LABEL: Record<string, { text: string; variant: StatusBadgeVariant }> = {
  PENDING: { text: "Aguardando", variant: "warning" },
  CONFIRMED: { text: "Confirmado", variant: "success" },
  IN_PROGRESS: { text: "Em andamento", variant: "primary" },
  COMPLETED: { text: "Concluído", variant: "neutral" },
  CANCELLED: { text: "Cancelado", variant: "danger" },
  RESCHEDULED: { text: "Reagendado", variant: "primary" },
  NO_SHOW: { text: "Não compareceu", variant: "danger" },
};

const WEEKDAYS = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "2026-08-18" → "18/08/2026", sem passar pelo fuso do navegador. */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** "2026-08-18" → "terça-feira, 18 de agosto" */
function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday}, ${d} de ${MONTHS[m - 1]}`;
}

/**
 * "hoje" / "amanhã" / "em 5 dias".
 *
 * Roda só depois da montagem: o "hoje" do servidor e o do navegador podem cair
 * em dias diferentes conforme o fuso, e renderizar os dois provoca divergência
 * de hidratação. Antes de montar, a tela mostra a data absoluta — que já é a
 * informação essencial.
 */
function useRelativeDay(iso: string | undefined): string | null {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!iso) return;
    const today = new Date();
    const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const diff = Math.round(
      (Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${todayISO}T00:00:00Z`)) /
        86_400_000
    );
    // Leitura do ambiente APÓS a hidratação: localStorage, matchMedia, navigator e rede não existem no servidor,
    // então o estado inicial é o do servidor e o efeito o corrige na montagem. Trocar por useSyncExternalStore
    // aqui seria refatoração grande com risco real, para um padrão que é o aceito neste caso.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (diff < 0) setLabel(null);
    else if (diff === 0) setLabel("hoje");
    else if (diff === 1) setLabel("amanhã");
    else setLabel(`em ${diff} dias`);
  }, [iso]);

  return label;
}

/**
 * Portal do cliente.
 *
 * Esta tela era inteiramente fictícia: dois agendamentos escritos no código
 * ("Renato Silva", "Maria Oliveira", R$ 85) e botões de reagendar/cancelar que
 * só chamavam `alert("Cancelamento realizado!")` — a interface avisava o
 * cliente de que algo tinha acontecido quando nada acontecia.
 *
 * Agora os dados são reais. Reagendar e cancelar continuam FORA daqui porque
 * não existe ação de cancelamento para o cliente final no servidor (a que
 * existe exige ser membro da empresa). Em vez de um botão que mente, a tela
 * oferece o contato do estabelecimento.
 */
export function MeusAgendamentosClient({
  companySlug,
  companyName,
  companyPhone,
  currency,
  locale,
  bookings,
  emailVerified,
  range,
  overview,
}: Props) {
  const money = (v: number) => formatMoney(v, currency, locale);
  const count = (v: number) => new Intl.NumberFormat(locale).format(v);
  const compareLabel =
    range.key === "custom"
      ? `${range.days} dias anteriores`
      : `${range.label} anteriores`;

  const upcoming = bookings.filter(
    (b) =>
      b.status === "PENDING" || b.status === "CONFIRMED" || b.status === "IN_PROGRESS"
  );
  const past = bookings.filter((b) => !upcoming.includes(b));
  const whatsapp = companyPhone?.replace(/\D/g, "") || null;

  // O próximo compromisso é o motivo pelo qual alguém abre esta tela. Ele sai
  // da lista e vira o bloco principal, com data por extenso e contagem.
  const sorted = [...upcoming].sort((a, b) =>
    `${a.scheduledDate}${a.scheduledStartTime}`.localeCompare(
      `${b.scheduledDate}${b.scheduledStartTime}`
    )
  );
  const next = sorted[0];
  const restUpcoming = sorted.slice(1);
  const relative = useRelativeDay(next?.scheduledDate);

  return (
    <div className="page-container pb-20">
      <div id="conteudo" className="page-content space-y-8">
        <PageHeader
          title="Meus agendamentos"
          description={`Suas reservas em ${companyName}.`}
          action={
            <Link
              href={`/book/${companySlug}`}
              className="btn btn-primary btn-tactile"
            >
              <span>Agendar</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          }
        />

        {!emailVerified && (
          <div className="alert alert-info">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Confirme seu e-mail para ver também os agendamentos feitos sem
              login, usando este mesmo endereço.
            </span>
          </div>
        )}

        {bookings.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<Calendar className="w-5 h-5" />}
              title="Você ainda não tem agendamentos aqui"
              description={`Quando marcar um horário em ${companyName}, ele aparece nesta lista com o comprovante.`}
              action={
                <Link href={`/book/${companySlug}`} className="btn btn-primary">
                  Ver horários disponíveis
                </Link>
              }
            />
          </div>
        ) : (
          <>
            {next ? (
              <section aria-labelledby="proximo" className="space-y-3">
                <h2 id="proximo" className="eyebrow">
                  Seu próximo horário
                </h2>

                <article className="rounded-[var(--radius-panel)] border border-[var(--color-primary-muted)] bg-[var(--color-primary-light)] p-5 sm:p-6 flex flex-col gap-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3
                          className="font-semibold text-[var(--color-text-heading)] tracking-tight"
                          style={{ fontSize: "var(--text-2xl)" }}
                        >
                          {next.serviceName}
                        </h3>
                        {relative && (
                          <span className="badge badge-primary">{relative}</span>
                        )}
                      </div>
                      <p
                        className="text-[var(--color-text)] mt-1 capitalize"
                        style={{ fontSize: "var(--text-md)" }}
                      >
                        {formatLongDate(next.scheduledDate)}
                        <span className="mono text-[var(--color-text-heading)] font-medium not-italic normal-case">
                          {" "}
                          · {next.scheduledStartTime}
                        </span>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="eyebrow block">Valor</span>
                      <span className="stat-card-value mono">
                        {money(next.total)}
                      </span>
                    </div>
                  </div>

                  <dl
                    className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[var(--color-text-muted)]"
                    style={{ fontSize: "var(--text-sm)" }}
                  >
                    {next.professionalName && (
                      <div className="inline-flex items-center gap-1.5 min-w-0">
                        <dt className="sr-only">Profissional</dt>
                        <User className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <dd className="truncate">{next.professionalName}</dd>
                      </div>
                    )}
                    <div className="inline-flex items-center gap-1.5">
                      <dt className="sr-only">Situação</dt>
                      <dd>
                        <StatusBadge
                          variant={
                            (STATUS_LABEL[next.status]?.variant ??
                              "neutral") as StatusBadgeVariant
                          }
                        >
                          {STATUS_LABEL[next.status]?.text ?? next.status}
                        </StatusBadge>
                      </dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap items-center gap-2">
                    {whatsapp && (
                      <a
                        href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                          `Olá ${companyName}! Preciso alterar meu agendamento de ${formatDate(next.scheduledDate)} às ${next.scheduledStartTime}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Falar com {companyName}</span>
                      </a>
                    )}
                    <Link
                      href={`/receipt/${next.id}`}
                      className="btn btn-outline btn-sm"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Comprovante</span>
                    </Link>
                  </div>
                </article>
              </section>
            ) : null}

            {restUpcoming.length > 0 && (
              <BookingGroup
                title="Também agendado"
                bookings={restUpcoming}
                currency={currency}
                locale={locale}
                whatsapp={whatsapp}
                companyName={companyName}
              />
            )}

            {past.length > 0 && (
              <BookingGroup
                title="Histórico"
                bookings={past}
                currency={currency}
                locale={locale}
                whatsapp={null}
                companyName={companyName}
              />
            )}
          </>
        )}

        {/*
          Resumo fica no fim, por prioridade: quem abre esta tela quer saber
          quando é o próximo horário, não ver gráfico. E só aparece quando há
          histórico — um painel zerado na primeira visita não informa nada.
        */}
        {overview && bookings.length > 0 && (
          <section
            aria-labelledby="resumo"
            className="space-y-4 pt-6 border-t border-[var(--color-border)]"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="resumo" className="card-title" style={{ fontSize: "var(--text-md)" }}>
                Seu histórico
              </h2>
              <span
                className="text-[var(--color-text-muted)]"
                style={{ fontSize: "var(--text-xs)" }}
              >
                {overview.completed} concluído{overview.completed === 1 ? "" : "s"} ·{" "}
                {overview.cancelled} cancelado{overview.cancelled === 1 ? "" : "s"}
              </span>
            </div>

            <RangeFilter range={range} showGranularity={false} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                <DeltaStat
                  label="Agendamentos no período"
                  delta={overview.bookings}
                  format={count}
                  compareLabel={compareLabel}
                  icon={<Calendar className="w-3 h-3" />}
                />
                <DeltaStat
                  label="Total pago"
                  delta={overview.spent}
                  format={money}
                  compareLabel={compareLabel}
                />
              </div>

              <article className="lg:col-span-8 card">
                <div className="card-body">
                  <TrendChart
                    data={overview.series}
                    granularity={range.granularity}
                    currency={currency}
                    locale={locale}
                    height={220}
                    metrics={[
                      { key: "bookings", label: "Agendamentos", kind: "number", tone: "accent" },
                      { key: "revenue", label: "Pago", kind: "currency", tone: "success" },
                    ]}
                  />
                </div>
              </article>
            </div>

            {overview.byService.length > 0 && (
              <article className="card">
                <div className="card-header">
                  <h3 className="card-title" style={{ fontSize: "var(--text-md)" }}>
                    Serviços que você mais marca
                  </h3>
                </div>
                <div className="card-body">
                  <BreakdownBars items={overview.byService} format={count} />
                </div>
              </article>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function BookingGroup({
  title,
  bookings,
  currency,
  locale,
  whatsapp,
  companyName,
}: {
  title: string;
  bookings: CustomerPortalBooking[];
  currency: string;
  locale: string;
  whatsapp: string | null;
  companyName: string;
}) {
  return (
    <section aria-label={title} className="space-y-3">
      <h2 className="card-title" style={{ fontSize: "var(--text-md)" }}>
        {title}
      </h2>

      {/*
        Lista com divisórias em vez de um cartão elevado por linha: cartão
        existe quando a elevação comunica hierarquia, e aqui todas as linhas
        têm o mesmo peso — empilhar caixas só adiciona ruído.
      */}
      <ul className="card divide-y divide-[var(--color-border)]" role="list">
        {bookings.map((b) => {
          const status = STATUS_LABEL[b.status] ?? {
            text: b.status,
            variant: "neutral" as StatusBadgeVariant,
          };
          return (
            <li
              key={b.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3
                    className="font-medium text-[var(--color-text-heading)] truncate"
                    style={{ fontSize: "var(--text-md)" }}
                  >
                    {b.serviceName}
                  </h3>
                  <StatusBadge variant={status.variant}>{status.text}</StatusBadge>
                </div>

                <div
                  className="flex items-center gap-x-4 gap-y-1 flex-wrap mt-1.5 text-[var(--color-text-muted)]"
                  style={{ fontSize: "var(--text-sm)" }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span className="mono tabular-nums">{formatDate(b.scheduledDate)}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span className="mono tabular-nums">{b.scheduledStartTime}</span>
                  </span>
                  {b.professionalName && (
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      <User className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{b.professionalName}</span>
                    </span>
                  )}
                  <span className="mono tabular-nums text-[var(--color-text-heading)]">
                    {formatMoney(b.total, currency, locale)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                      `Olá ${companyName}! Preciso alterar meu agendamento de ${formatDate(b.scheduledDate)} às ${b.scheduledStartTime}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Alterar</span>
                  </a>
                )}
                <Link href={`/receipt/${b.id}`} className="btn btn-ghost btn-sm">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Comprovante</span>
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
