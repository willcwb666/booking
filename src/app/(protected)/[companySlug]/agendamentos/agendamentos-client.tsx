"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCompany } from "@/lib/company-context";
import { formatMoney } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Modal } from "@/components/ui/modal";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { Phone, UserX, AlertTriangle, CheckCircle2, Plus, Play, Check } from "@/components/ui/icons";
import { markBookingNoShowAction, updateBookingStatusAction, createWalkInBookingAction } from "@/server/actions/booking";
import { toast } from "@/lib/toast-service";
import { Pagination } from "@/components/ui/pagination";

type SerializedItem = {
  id: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  estimateTotal: string;
  serviceLabels: string[];
};

type Filters = {
  status: string;
  q: string;
  from: string;
  to: string;
  pageSize?: number;
};

type Props = {
  companySlug: string;
  items: SerializedItem[];
  total: number;
  page: number;
  pageSize?: number;
  pageCount: number;
  filters: Filters;
  services?: Array<{ id: string; name: string; price: number; category: string; duration?: number | null }>;
  professionals?: Array<{ id: string; name: string }>;
};

const STATUS_LABELS: Record<string, string> = {
  ALL: "Todos",
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  RESCHEDULED: "Reagendado",
  NO_SHOW: "Faltou (No-Show)",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "badge badge-warning",
  CONFIRMED: "badge badge-primary",
  IN_PROGRESS: "badge bg-purple-100 text-purple-800 border-purple-200",
  COMPLETED: "badge badge-success",
  CANCELLED: "badge badge-danger",
  RESCHEDULED: "badge badge-warning",
  NO_SHOW: "badge badge-danger",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "text-[var(--color-warning)]",
  PAID: "text-[var(--color-success)]",
  FAILED: "text-[var(--color-danger)]",
  REFUNDED: "text-[var(--color-text-subtle)]",
  PARTIALLY_REFUNDED: "text-[var(--color-warning)]",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  FAILED: "Falhou",
  REFUNDED: "Reembolsado",
  PARTIALLY_REFUNDED: "Reemb. Parcial",
};

export function AgendamentosClient({
  companySlug,
  items,
  total,
  page,
  pageSize = 10,
  pageCount,
  filters,
  services = [],
  professionals = [],
}: Props) {
  const company = useCompany();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedNoShowBooking, setSelectedNoShowBooking] = useState<SerializedItem | null>(null);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInServiceId, setWalkInServiceId] = useState(services[0]?.id || "");
  const [walkInProfId, setWalkInProfId] = useState(professionals[0]?.id || "");
  const [walkInStatus, setWalkInStatus] = useState<"IN_PROGRESS" | "CONFIRMED">("IN_PROGRESS");

  const [isPending, startTransition] = useTransition();

  const buildUrl = (newFilters: Partial<Filters> & { page?: number; pageSize?: number }) => {
    const params = new URLSearchParams(searchParams.toString());
    const merged = { ...filters, pageSize, ...newFilters };

    if (merged.status && merged.status !== "ALL") params.set("status", merged.status);
    else params.delete("status");

    if (merged.q) params.set("q", merged.q);
    else params.delete("q");

    if (merged.from) params.set("from", merged.from);
    else params.delete("from");

    if (merged.to) params.set("to", merged.to);
    else params.delete("to");

    if (merged.pageSize && merged.pageSize !== 10) params.set("pageSize", String(merged.pageSize));
    else params.delete("pageSize");

    if (merged.page && merged.page > 1) params.set("page", String(merged.page));
    else params.delete("page");

    return `/${companySlug}/agendamentos?${params.toString()}`;
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const q = (form.elements.namedItem("q") as HTMLInputElement).value;
    router.push(buildUrl({ q, page: 1 }));
  };

  const handleDateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const from = (form.elements.namedItem("from") as HTMLInputElement).value;
    const to = (form.elements.namedItem("to") as HTMLInputElement).value;
    router.push(buildUrl({ from, to, page: 1 }));
  };

  const handleConfirmNoShow = (didNotify: boolean) => {
    if (!selectedNoShowBooking) return;

    startTransition(async () => {
      const res = await markBookingNoShowAction({
        bookingId: selectedNoShowBooking.id,
        companySlug,
        didNotify,
      });

      if (res.success) {
        toast.success(
          didNotify ? "Cancelamento Registrado" : "Falta sem aviso gravada",
          didNotify
            ? "Agendamento marcado como cancelado com aviso prévio."
            : "Falta sem aviso gravada no histórico do cliente."
        );
        setSelectedNoShowBooking(null);
        router.refresh();
      } else {
        toast.error("Erro", res.error || "Não foi possível registrar o evento.");
      }
    });
  };

  const handleUpdateStatus = (bookingId: string, newStatus: string) => {
    startTransition(async () => {
      const res = await updateBookingStatusAction(bookingId, companySlug, newStatus);
      if (res.success) {
        toast.success(
          newStatus === "IN_PROGRESS" ? "Check-in Realizado!" : "Atendimento Concluído!",
          newStatus === "IN_PROGRESS"
            ? "Status alterado para Em Atendimento."
            : "Atendimento finalizado com sucesso."
        );
        router.refresh();
      } else {
        toast.error("Erro", res.error || "Falha ao alterar status.");
      }
    });
  };

  const handleCreateWalkIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName.trim()) {
      toast.error("Erro", "Informe o nome do cliente.");
      return;
    }
    if (!walkInServiceId) {
      toast.error("Erro", "Selecione um serviço.");
      return;
    }

    startTransition(async () => {
      const res = await createWalkInBookingAction({
        companySlug,
        customerName: walkInName,
        customerPhone: walkInPhone,
        serviceTypeId: walkInServiceId,
        professionalId: walkInProfId || undefined,
        status: walkInStatus,
        paymentMethod: "CASH_CHECK",
      });

      if (res.success) {
        toast.success("Encaixe Realizado!", `Cliente ${walkInName} lançado no sistema.`);
        setShowWalkInModal(false);
        setWalkInName("");
        setWalkInPhone("");
        router.refresh();
      } else {
        const errMsg = res.errors?._?.[0] || "Falha ao registrar encaixe.";
        toast.error("Erro", errMsg);
      }
    });
  };

  const statuses = ["ALL", "PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "RESCHEDULED", "NO_SHOW"];

  return (
    <div className="page-container pb-20">
     <div className="page-content space-y-6">
      <PageHeader
        title="Agendamentos"
        description={`Gerencie reservas, confirme presenças ou registre faltas em ${company.name}. Total: ${total} registro(s).`}
        action={
          <button
            type="button"
            onClick={() => setShowWalkInModal(true)}
            className="btn btn-primary btn-sm inline-flex items-center gap-1.5 font-bold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Encaixe Rápido (Walk-in)</span>
          </button>
        }
      />

      <div className="space-y-4">
        {/* Subheader com Filtros */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-[var(--color-bg-elevated)] p-4 rounded-2xl border border-[var(--color-border)] shadow-xs">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5" role="tablist">
            {statuses.map((s) => (
              <Link
                key={s}
                href={buildUrl({ status: s, page: 1 })}
                role="tab"
                aria-selected={filters.status === s}
                className={filters.status === s ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
              >
                {STATUS_LABELS[s]}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <input
                name="q"
                defaultValue={filters.q}
                placeholder="Buscar por cliente…"
                className="input !w-52"
              />
              <button type="submit" className="btn btn-secondary btn-sm">
                Buscar
              </button>
            </form>

            {/* Date range */}
            <form onSubmit={handleDateSubmit} className="flex gap-2 items-center">
              <input
                name="from"
                type="date"
                defaultValue={filters.from}
                className="input !w-auto"
                aria-label="Data inicial"
              />
              <span className="text-[var(--color-text-subtle)] text-sm">–</span>
              <input
                name="to"
                type="date"
                defaultValue={filters.to}
                className="input !w-auto"
                aria-label="Data final"
              />
              <button type="submit" className="btn btn-secondary btn-sm">
                Filtrar
              </button>
              {(filters.from || filters.to) && (
                <Link
                  href={buildUrl({ from: "", to: "", page: 1 })}
                  className="text-xs text-[var(--color-text-subtle)] hover:text-[var(--color-text)]"
                >
                  Limpar
                </Link>
              )}
            </form>
          </div>
        </div>

        {/* Table */}
        {items.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-[var(--color-text-muted)] text-sm">Nenhum agendamento encontrado.</p>
          </div>
        ) : (
          <div className="table-container">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Cliente</th>
                    <th scope="col">Serviço</th>
                    <th scope="col">Data / Hora</th>
                    <th scope="col">Status</th>
                    <th scope="col">Pagamento</th>
                    <th scope="col" className="!text-right">Total</th>
                    <th scope="col"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const isCanMarkNoShow = item.status === "PENDING" || item.status === "CONFIRMED";
                    return (
                      <tr key={item.id}>
                        <td>
                          <p className="font-medium text-[var(--color-text-heading)]">
                            {item.customerName ?? "—"}
                          </p>
                          {item.customerEmail && (
                            <p className="text-xs text-[var(--color-text-subtle)]">{item.customerEmail}</p>
                          )}
                        </td>
                        <td>
                          <p className="text-[var(--color-text)] line-clamp-1">
                            {item.serviceLabels[0] ?? "—"}
                          </p>
                          {item.serviceLabels.length > 1 && (
                            <p className="text-xs text-[var(--color-text-subtle)]">
                              +{item.serviceLabels.length - 1} mais
                            </p>
                          )}
                        </td>
                        <td className="whitespace-nowrap">
                          <p className="text-[var(--color-text-heading)]">
                            {item.scheduledDate.split("-").reverse().join("/")}
                          </p>
                          <p className="text-xs text-[var(--color-text-subtle)]">
                            {item.scheduledStartTime} – {item.scheduledEndTime}
                          </p>
                        </td>
                        <td>
                          <span className={STATUS_COLORS[item.status] ?? "badge"}>
                            {STATUS_LABELS[item.status] ?? item.status}
                          </span>
                        </td>
                        <td>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {item.paymentMethod === "CARD" ? "Cartão" : "Dinheiro/Cheque"}
                          </p>
                          <p className={`text-xs font-medium ${PAYMENT_STATUS_COLORS[item.paymentStatus] ?? "text-[var(--color-text-muted)]"}`}>
                            {PAYMENT_STATUS_LABELS[item.paymentStatus] ?? item.paymentStatus}
                          </p>
                        </td>
                        <td className="!text-right whitespace-nowrap">
                          <span className="font-semibold text-[var(--color-text-heading)]">
                            {formatMoney(Number(item.estimateTotal), company.currency, company.locale)}
                          </span>
                        </td>
                        <td className="!text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {/* Quick Check-in or Complete Action */}
                            {(item.status === "PENDING" || item.status === "CONFIRMED") && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(item.id, "IN_PROGRESS")}
                                disabled={isPending}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                                title="Fazer Check-in (Cliente chegou / Na cadeira)"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>Check-in</span>
                              </button>
                            )}

                            {item.status === "IN_PROGRESS" && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(item.id, "COMPLETED")}
                                disabled={isPending}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                                title="Concluir Atendimento"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Concluir</span>
                              </button>
                            )}

                            {isCanMarkNoShow && (
                              <ActionTooltip label="Registrar Falta / No-Show">
                                <button
                                  type="button"
                                  onClick={() => setSelectedNoShowBooking(item)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center shadow-2xs"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                </button>
                              </ActionTooltip>
                            )}

                            {item.customerPhone && (
                              <a
                                href={`https://wa.me/${item.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                                  `Olá ${item.customerName || ""}! Confirmamos o seu agendamento para ${item.scheduledDate.split("-").reverse().join("/")} às ${item.scheduledStartTime}.`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-success)] hover:opacity-80 bg-[var(--color-success-light)] border border-[var(--color-success-border)] px-2.5 py-1 rounded-lg transition-all"
                                title="Enviar mensagem via WhatsApp"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                            <Link
                              href={`/${company.slug}/agendamentos/${item.id}`}
                              className="btn btn-outline btn-sm"
                            >
                              Detalhes
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Componente Global de Paginação */}
            <Pagination
              currentPage={page}
              totalItems={total}
              pageSize={pageSize ?? 10}
              pageSizeOptions={[10, 20, 30, 50, 100]}
              onPageChange={(newPage) => router.push(buildUrl({ page: newPage }))}
              onPageSizeChange={(newSize) => router.push(buildUrl({ page: 1, pageSize: newSize }))}
              itemLabel="agendamentos"
            />
          </div>
        )}
      </div>

      {/* Modal de Encaixe Rápido (Walk-in) */}
      {showWalkInModal && (
        <Modal
          isOpen={showWalkInModal}
          onClose={() => setShowWalkInModal(false)}
          title="⚡ Encaixe Rápido (Walk-in)"
          size="md"
        >
          <form onSubmit={handleCreateWalkIn} className="space-y-4">
            <p className="text-xs text-slate-500">
              Lance na fila um cliente que acabou de chegar sem agendamento prévio.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Nome do Cliente *</label>
              <input
                type="text"
                required
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                placeholder="Ex: Carlos Oliveira"
                className="input w-full"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Telefone / WhatsApp (Opcional)</label>
              <input
                type="tel"
                value={walkInPhone}
                onChange={(e) => setWalkInPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="input w-full"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Serviço *</label>
              <select
                required
                value={walkInServiceId}
                onChange={(e) => setWalkInServiceId(e.target.value)}
                className="select w-full"
              >
                {services.length === 0 ? (
                  <option value="">Nenhum serviço cadastrado</option>
                ) : (
                  services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {formatMoney(s.price, company.currency, company.locale)} ({s.duration ?? 30} min)
                    </option>
                  ))
                )}
              </select>
            </div>

            {professionals.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Profissional Responsável</label>
                <select
                  value={walkInProfId}
                  onChange={(e) => setWalkInProfId(e.target.value)}
                  className="select w-full"
                >
                  <option value="">Qualquer profissional disponível</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Status Inicial</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWalkInStatus("IN_PROGRESS")}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all text-left ${
                    walkInStatus === "IN_PROGRESS"
                      ? "border-purple-600 bg-purple-50 text-purple-900 shadow-xs"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>💺 Já na Cadeira</span>
                  <p className="text-[10px] font-normal text-slate-500 mt-0.5">Em atendimento agora</p>
                </button>

                <button
                  type="button"
                  onClick={() => setWalkInStatus("CONFIRMED")}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all text-left ${
                    walkInStatus === "CONFIRMED"
                      ? "border-blue-600 bg-blue-50 text-blue-900 shadow-xs"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>🛋️ Na Recepção</span>
                  <p className="text-[10px] font-normal text-slate-500 mt-0.5">Aguardando vez</p>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                className="btn btn-ghost btn-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending || services.length === 0}
                className="btn btn-primary btn-sm font-bold"
              >
                {isPending ? "Lançando…" : "Lançar Atendimento"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de Registro de Falta / No-Show */}
      {selectedNoShowBooking && (
        <Modal
          isOpen={Boolean(selectedNoShowBooking)}
          onClose={() => setSelectedNoShowBooking(null)}
          title="Registrar Falta ou Cancelamento"
          size="md"
        >
          <div className="space-y-5">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Cliente / Agendamento</p>
              <h3 className="text-sm font-extrabold text-slate-900">
                {selectedNoShowBooking.customerName}
              </h3>
              <p className="text-xs text-slate-600">
                {selectedNoShowBooking.scheduledDate.split("-").reverse().join("/")} às {selectedNoShowBooking.scheduledStartTime}
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-extrabold text-slate-800">
                O cliente avisou previamente que não poderia comparecer?
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleConfirmNoShow(true)}
                  className="p-4 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-300/80 text-left transition-all cursor-pointer space-y-1 disabled:opacity-50"
                >
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-slate-600" />
                    Sim, Avisou Previamente
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Marca como Cancelado regular. Não penaliza o contador de faltas do cliente.
                  </p>
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleConfirmNoShow(false)}
                  className="p-4 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-left transition-all cursor-pointer space-y-1 disabled:opacity-50"
                >
                  <span className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Não, Faltou Sem Aviso (No-Show)
                  </span>
                  <p className="text-[11px] text-rose-700">
                    Grava falta sem aviso. Soma +1 no histórico de no-show do cliente.
                  </p>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedNoShowBooking(null)}
                className="btn btn-ghost btn-sm"
              >
                Voltar
              </button>
            </div>
          </div>
        </Modal>
      )}
     </div>
    </div>
  );
}
