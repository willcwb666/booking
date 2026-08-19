"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useCompany } from "@/lib/company-context";
import { formatMoney } from "@/lib/format";
import type { CustomerSummary } from "@/server/queries/customers";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { toast } from "@/lib/toast-service";
import { Download } from "lucide-react";
import {
  Users,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Award,
  Sparkles,
  MessageSquare,
  Copy,
  Check,
  Lock,
} from "@/components/ui/icons";
import { generateAIRetentionCampaignAction } from "@/server/actions/ai-copilot";
import { Pagination } from "@/components/ui/pagination";

type Props = {
  companySlug: string;
  customers: CustomerSummary[];
  /** Empresa com o módulo do cofre contratado. */
  hasVault?: boolean;
};

type RiskFilter = "ALL" | "AT_RISK";

/**
 * Escapa um campo para CSV conforme RFC 4180: aspas duplicadas e o campo
 * inteiro entre aspas. A versão anterior interpolava o valor direto entre
 * aspas, então um cliente chamado `Maria "Duda" Silva` ou um endereço com
 * vírgula quebrava a coluna e desalinhava a planilha inteira.
 */
function csvField(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export function ClientesClient({
  companySlug,
  customers: initialCustomers,
  hasVault = false,
}: Props) {
  const company = useCompany();
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);
  const [aiCampaign, setAiCampaign] = useState<{
    whatsappCopy: string;
    emailSubject: string;
    emailBody: string;
  } | null>(null);
  const [isGeneratingCampaign, startGenerating] = useTransition();
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const totalSpentAll = initialCustomers.reduce((acc, c) => acc + c.totalSpent, 0);
  const avgSpent = initialCustomers.length > 0 ? totalSpentAll / initialCustomers.length : 0;

  /**
   * "Cliente destaque" era `totalSpent > 500` — um número fixo, sem moeda.
   * Numa empresa em dólar quase ninguém cruzava a linha; numa em real, quase
   * todo mundo cruzava. Agora o corte é relativo à própria base (o dobro do
   * ticket médio acumulado), que funciona em qualquer moeda e em qualquer
   * porte de operação.
   */
  const highlightThreshold = avgSpent > 0 ? avgSpent * 2 : Infinity;

  /** Faltas registradas: o cliente marcou e não apareceu. */
  function noShows(c: CustomerSummary) {
    return c.noShowCount ?? 0;
  }

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return initialCustomers.filter((c) => {
      if (riskFilter === "AT_RISK" && noShows(c) === 0) return false;
      if (!term) return true;
      return (
        c.firstName.toLowerCase().includes(term) ||
        c.lastName.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        c.phone.toLowerCase().includes(term) ||
        (c.city ? c.city.toLowerCase().includes(term) : false)
      );
    });
  }, [initialCustomers, searchTerm, riskFilter]);

  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const atRiskCount = initialCustomers.filter((c) => noShows(c) > 0).length;
  const hasActiveFilter = riskFilter !== "ALL" || searchTerm.trim().length > 0;

  const exportToCSV = () => {
    if (filteredCustomers.length === 0) {
      toast.error("Sem dados", "Nenhum cliente para exportar.");
      return;
    }
    const headers = [
      "Nome",
      "Sobrenome",
      "E-mail",
      "Telefone",
      "Cidade",
      "Total de agendamentos",
      "Concluídos",
      "Cancelados",
      "Faltas",
      "Total gasto",
      "Último agendamento",
    ];
    const rows = filteredCustomers.map((c) => [
      c.firstName,
      c.lastName,
      c.email,
      c.phone,
      c.city || "",
      c.totalBookings,
      c.completedBookings,
      c.cancelledBookings,
      noShows(c),
      c.totalSpent.toFixed(2),
      c.lastBookingDate || "",
    ]);

    // BOM + Blob. Antes ia por `data:` URI com `encodeURI`, que estourava em
    // bases grandes e chegava no Excel sem BOM — acento virava caractere solto.
    const csv =
      "﻿" +
      [headers, ...rows].map((r) => r.map(csvField).join(",")).join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clientes_${companySlug}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Exportado", `${filteredCustomers.length} cliente(s) no arquivo CSV.`);
  };

  const handleGenerateCampaign = (customer: CustomerSummary) => {
    setAiCampaign(null);
    startGenerating(async () => {
      // Dias reais desde o último atendimento. Antes ia um `45` fixo: a IA
      // escrevia "faz 45 dias que você não aparece" para todo mundo, e essa
      // mensagem sai para o cliente. Sem histórico, manda 0 e deixa o texto
      // sem a referência temporal.
      const inactiveDays = customer.lastBookingDate
        ? Math.max(
            0,
            Math.floor(
              (Date.now() - new Date(customer.lastBookingDate).getTime()) / 86_400_000
            )
          )
        : 0;

      const res = await generateAIRetentionCampaignAction(
        `${customer.firstName} ${customer.lastName}`,
        inactiveDays
      );
      if (res.success && res.data) {
        setAiCampaign(res.data);
      } else {
        toast.error("Não foi possível gerar", "Tente novamente em alguns instantes.");
      }
    });
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="page-container pb-20">
      <div className="page-content space-y-6">
        <PageHeader
          category="Clientes"
          categoryIcon={<Users className="w-3.5 h-3.5" />}
          title="Base de clientes"
          description="Quem já foi atendido, quanto gastou e há quanto tempo não aparece."
          action={
            <button
              type="button"
              onClick={exportToCSV}
              className="btn btn-outline btn-sm inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card">
            <span className="stat-card-label">Clientes na base</span>
            <span className="stat-card-value">{initialCustomers.length}</span>
            <span className="stat-card-delta">
              <Users className="w-3 h-3 inline-block mr-1 align-[-1px]" />
              com ao menos um atendimento
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-card-label">Receita acumulada</span>
            <span className="stat-card-value">
              {formatMoney(totalSpentAll, company.currency, company.locale)}
            </span>
            <span className="stat-card-delta">
              <DollarSign className="w-3 h-3 inline-block mr-1 align-[-1px]" />
              somente agendamentos pagos
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-card-label">Média por cliente</span>
            <span className="stat-card-value">
              {formatMoney(avgSpent, company.currency, company.locale)}
            </span>
            <span className="stat-card-delta">
              <Award className="w-3 h-3 inline-block mr-1 align-[-1px]" />
              base para o corte de destaque
            </span>
          </div>
        </div>

        <div className="scroller -mx-1 px-1">
          <div className="segmented w-max" role="tablist" aria-label="Filtrar clientes">
            {(
              [
                { id: "ALL" as const, label: "Todos" },
                { id: "AT_RISK" as const, label: "Com faltas" },
              ]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={riskFilter === tab.id}
                data-active={riskFilter === tab.id}
                onClick={() => {
                  setRiskFilter(tab.id);
                  setCurrentPage(1);
                }}
                className="segmented-item whitespace-nowrap inline-flex items-center gap-1.5"
              >
                <span>{tab.label}</span>
                {tab.id === "AT_RISK" && atRiskCount > 0 && (
                  <span className="badge badge-count badge-neutral">{atRiskCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="toolbar">
          <SearchInput
            value={searchTerm}
            onChange={(val) => {
              setSearchTerm(val);
              setCurrentPage(1);
            }}
            placeholder="Buscar por nome, e-mail, telefone ou cidade"
          />
          <span className="toolbar-spacer" />
          <span
            className="text-[var(--color-text-muted)] tabular-nums"
            style={{ fontSize: "var(--text-xs)" }}
          >
            {filteredCustomers.length}{" "}
            {filteredCustomers.length === 1 ? "cliente" : "clientes"}
          </span>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<Users className="w-5 h-5" />}
              title={
                hasActiveFilter
                  ? "Nenhum cliente com esses filtros"
                  : "Ainda não há clientes na base"
              }
              description={
                hasActiveFilter
                  ? "Nenhum cliente corresponde à busca ou ao filtro selecionado."
                  : "A base é montada a partir dos agendamentos. Assim que o primeiro atendimento for registrado, o cliente aparece aqui com histórico e total gasto."
              }
              action={
                hasActiveFilter ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setRiskFilter("ALL");
                      setCurrentPage(1);
                    }}
                    className="btn btn-outline btn-sm"
                  >
                    Limpar filtros
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div
              className="table-container"
              style={{ border: 0, borderRadius: 0, boxShadow: "none" }}
            >
              <table className="table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Contato</th>
                    <th className="text-right">Agendamentos</th>
                    <th className="text-right">Faltas</th>
                    <th className="text-right">Total gasto</th>
                    <th className="text-right">Ficha</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCustomers.map((c) => {
                    const missed = noShows(c);
                    return (
                      <tr key={c.id ?? c.email}>
                        <td>
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className="w-9 h-9 rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] border border-[var(--color-border)] grid place-items-center font-medium shrink-0"
                              aria-hidden="true"
                            >
                              {c.firstName[0]?.toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium text-[var(--color-text-heading)] truncate">
                                {c.firstName} {c.lastName}
                              </p>
                              {c.totalSpent >= highlightThreshold && (
                                <span
                                  className="text-[var(--color-text-muted)]"
                                  style={{ fontSize: "var(--text-xs)" }}
                                >
                                  Acima do dobro da média da base
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="min-w-0">
                            <span className="flex items-center gap-1.5 text-[var(--color-text)] truncate">
                              <Mail className="w-3 h-3 text-[var(--color-text-subtle)] shrink-0" />
                              <span className="truncate">{c.email}</span>
                            </span>
                            <span
                              className="flex items-center gap-3 text-[var(--color-text-muted)]"
                              style={{ fontSize: "var(--text-xs)" }}
                            >
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-[var(--color-text-subtle)]" />
                                {c.phone}
                              </span>
                              {c.city && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-[var(--color-text-subtle)]" />
                                  {c.city}
                                </span>
                              )}
                            </span>
                          </div>
                        </td>

                        <td data-type="number">
                          {c.totalBookings}
                          <span
                            className="block text-[var(--color-text-subtle)]"
                            style={{ fontSize: "var(--text-xs)" }}
                          >
                            {c.completedBookings} concluídos
                          </span>
                        </td>

                        {/* Antes esta coluna se chamava "Risco No-Show IA" e o
                            valor vinha de `cancelledBookings > 1`. Não havia IA
                            nenhuma, e cancelar com antecedência não é faltar —
                            o campo de faltas existia e estava sendo ignorado.
                            Agora mostra o número real. */}
                        <td data-type="number">
                          {missed === 0 ? (
                            <span className="text-[var(--color-text-subtle)]">—</span>
                          ) : (
                            <StatusBadge variant="danger">
                              {missed} {missed === 1 ? "falta" : "faltas"}
                            </StatusBadge>
                          )}
                        </td>

                        <td data-type="number">
                          {formatMoney(c.totalSpent, company.currency, company.locale)}
                        </td>

                        <td>
                          <div className="flex justify-end">
                            <ActionTooltip label="Abrir ficha do cliente">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCustomer(c);
                                  setAiCampaign(null);
                                }}
                                className="btn btn-ghost btn-sm"
                                aria-label={`Abrir ficha de ${c.firstName} ${c.lastName}`}
                              >
                                Ver ficha
                              </button>
                            </ActionTooltip>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={filteredCustomers.length}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 30, 50, 100]}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="clientes"
            />
          </div>
        )}
      </div>

      {selectedCustomer && (
        <Modal
          isOpen={Boolean(selectedCustomer)}
          onClose={() => setSelectedCustomer(null)}
          title={`${selectedCustomer.firstName} ${selectedCustomer.lastName}`}
          size="lg"
        >
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="card card-body space-y-2">
                <span className="eyebrow">Contato</span>
                <p className="flex items-center gap-2 text-[var(--color-text)]" style={{ fontSize: "var(--text-sm)" }}>
                  <Mail className="w-3.5 h-3.5 text-[var(--color-text-subtle)] shrink-0" />
                  <span className="truncate">{selectedCustomer.email}</span>
                </p>
                <p className="flex items-center gap-2 text-[var(--color-text)]" style={{ fontSize: "var(--text-sm)" }}>
                  <Phone className="w-3.5 h-3.5 text-[var(--color-text-subtle)] shrink-0" />
                  <span>{selectedCustomer.phone}</span>
                </p>
                <p className="flex items-center gap-2 text-[var(--color-text)]" style={{ fontSize: "var(--text-sm)" }}>
                  <MapPin className="w-3.5 h-3.5 text-[var(--color-text-subtle)] shrink-0" />
                  <span>{selectedCustomer.city || "Cidade não informada"}</span>
                </p>
              </div>

              <div className="card card-body space-y-2">
                <span className="eyebrow">Histórico</span>
                {(
                  [
                    [
                      "Total gasto",
                      formatMoney(
                        selectedCustomer.totalSpent,
                        company.currency,
                        company.locale
                      ),
                    ],
                    ["Agendamentos", String(selectedCustomer.totalBookings)],
                    ["Concluídos", String(selectedCustomer.completedBookings)],
                    ["Cancelados", String(selectedCustomer.cancelledBookings)],
                    ["Faltas", String(noShows(selectedCustomer))],
                  ] as const
                ).map(([label, value]) => (
                  <p
                    key={label}
                    className="flex items-center justify-between gap-3 text-[var(--color-text)]"
                    style={{ fontSize: "var(--text-sm)" }}
                  >
                    <span>{label}</span>
                    <span className="font-medium text-[var(--color-text-heading)] tabular-nums">
                      {value}
                    </span>
                  </p>
                ))}
              </div>
            </div>

            {hasVault && (
              /* O cofre é uma página inteira, não mais um bloco no modal: são
                 fotos e fichas de várias sessões, e espremê-las aqui faria o
                 profissional desistir de abrir no meio do atendimento. */
              <Link
                href={`/${companySlug}/clientes/${selectedCustomer.id}/cofre`}
                className="btn btn-secondary btn-sm w-full"
              >
                <Lock className="w-3.5 h-3.5" />
                Abrir cofre — fotos e ficha técnica
              </Link>
            )}

            {/* Gerador de mensagem de reativação */}
            <div className="card">
              <div className="card-header">
                <span className="flex items-center gap-2 font-medium text-[var(--color-text-heading)]" style={{ fontSize: "var(--text-sm)" }}>
                  <Sparkles className="w-4 h-4 text-[var(--color-text-subtle)]" />
                  <span>Mensagem de reativação</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleGenerateCampaign(selectedCustomer)}
                  disabled={isGeneratingCampaign}
                  className="btn btn-primary btn-sm"
                >
                  {isGeneratingCampaign ? "Gerando…" : "Gerar texto"}
                </button>
              </div>

              <div className="card-body">
                {!aiCampaign && !isGeneratingCampaign && (
                  <p className="text-[var(--color-text-muted)]" style={{ fontSize: "var(--text-sm)" }}>
                    Gera um texto de WhatsApp e um e-mail para chamar este cliente
                    de volta, usando o tempo real desde o último atendimento. Você
                    revisa e envia — nada sai daqui sozinho.
                  </p>
                )}

                {isGeneratingCampaign && (
                  <div className="space-y-2">
                    <div className="skeleton skeleton-text" style={{ width: "70%" }} />
                    <div className="skeleton skeleton-text" style={{ width: "90%" }} />
                    <div className="skeleton skeleton-text" style={{ width: "55%" }} />
                  </div>
                )}

                {aiCampaign && (
                  <div className="space-y-3">
                    <div className="card card-body space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="eyebrow flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(aiCampaign.whatsappCopy, "wa")}
                          className="btn btn-ghost btn-sm inline-flex items-center gap-1.5"
                        >
                          {copiedText === "wa" ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedText === "wa" ? "Copiado" : "Copiar"}</span>
                        </button>
                      </div>
                      <p
                        className="whitespace-pre-wrap leading-relaxed text-[var(--color-text)]"
                        style={{ fontSize: "var(--text-sm)" }}
                      >
                        {aiCampaign.whatsappCopy}
                      </p>
                    </div>

                    {/* O e-mail já vinha na resposta e era descartado pela tela. */}
                    <div className="card card-body space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="eyebrow flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" /> E-mail
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              `${aiCampaign.emailSubject}\n\n${aiCampaign.emailBody}`,
                              "mail"
                            )
                          }
                          className="btn btn-ghost btn-sm inline-flex items-center gap-1.5"
                        >
                          {copiedText === "mail" ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedText === "mail" ? "Copiado" : "Copiar"}</span>
                        </button>
                      </div>
                      <p className="font-medium text-[var(--color-text-heading)]" style={{ fontSize: "var(--text-sm)" }}>
                        {aiCampaign.emailSubject}
                      </p>
                      <p
                        className="whitespace-pre-wrap leading-relaxed text-[var(--color-text)]"
                        style={{ fontSize: "var(--text-sm)" }}
                      >
                        {aiCampaign.emailBody}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="btn btn-outline btn-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
