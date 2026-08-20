"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCompany } from "@/lib/company-context";
import { formatMoney } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/lib/toast-service";
import { sendWinBackCampaignAction } from "@/server/actions/win-back";
import { WIN_BACK_COOLDOWN_DAYS } from "@/lib/win-back-policy";
import {
  CAMPAIGN_DEFAULT_STATUSES,
  STATUS_LABELS,
  STATUS_VARIANTS,
  type WinBackStatus,
} from "@/lib/win-back";
import type { WinBackCustomer } from "@/server/queries/win-back";
import { Users, Mail, Clock } from "@/components/ui/icons";

type Props = {
  companySlug: string;
  customers: WinBackCustomer[];
};

/** Ordem de exibição — do mais urgente ao irrelevante. */
const FILTERS: { status: WinBackStatus; hint: string }[] = [
  { status: "OVERDUE", hint: "A janela em que uma mensagem ainda funciona" },
  { status: "DUE", hint: "Passou do ciclo há pouco — provavelmente volta sozinho" },
  { status: "LOST", hint: "Sumiu há muito tempo; resposta baixa" },
  { status: "ACTIVE", hint: "Dentro do próprio ritmo" },
  { status: "UNKNOWN", hint: "Histórico curto demais para ter ritmo" },
];

export function ResgateClient({ companySlug, customers }: Props) {
  const company = useCompany();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [active, setActive] = useState<WinBackStatus[]>(CAMPAIGN_DEFAULT_STATUSES);
  const [selected, setSelected] = useState<string[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [offer, setOffer] = useState("");

  const counts = useMemo(() => {
    const map = new Map<WinBackStatus, number>();
    for (const c of customers) map.set(c.status, (map.get(c.status) ?? 0) + 1);
    return map;
  }, [customers]);

  /**
   * O corte da carência, congelado na montagem.
   *
   * `Date.now()` direto no corpo do componente é leitura impura: cada
   * renderização produzia um corte diferente, e a lista podia mudar sozinha no
   * meio de uma interação — um cliente somindo da tela entre o clique e o
   * resultado. Com `useMemo` sem dependências, o valor vale para a visita.
   */
  const [cooldownCutoff] = useState(
    () => Date.now() - WIN_BACK_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
  );

  const visible = useMemo(
    () =>
      customers
        .filter((c) => active.includes(c.status))
        .sort((a, b) => b.overdueBy - a.overdueBy),
    [customers, active]
  );

  /** Quem o servidor recusaria: opt-out ou dentro da carência. */
  const isBlocked = (c: WinBackCustomer) =>
    c.optedOut || (c.lastWinBackAt !== null && new Date(c.lastWinBackAt).getTime() > cooldownCutoff);

  const selectable = visible.filter((c) => !isBlocked(c));
  const allSelected = selectable.length > 0 && selected.length === selectable.length;

  const toggleFilter = (status: WinBackStatus) => {
    setSelected([]);
    setActive((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const send = () => {
    startTransition(async () => {
      const res = await sendWinBackCampaignAction(companySlug, selected, {
        subject,
        message,
        offer: offer.trim() || undefined,
      });

      if (!res.success) {
        toast.error("Não enviado", res.error);
        return;
      }

      // Relata o que aconteceu de verdade, incluindo o que não saiu. Dizer só
      // "campanha enviada" esconderia 40 falhas de provedor num lote de 200.
      const parts = [`${res.sent} enviados`];
      if (res.skipped > 0) parts.push(`${res.skipped} pulados`);
      if (res.failed > 0) parts.push(`${res.failed} falharam`);

      toast.success("Campanha processada", parts.join(" · "));
      setComposerOpen(false);
      setSelected([]);
      router.refresh();
    });
  };

  const overdueCount = counts.get("OVERDUE") ?? 0;

  return (
    <div className="page-content space-y-6">
      <PageHeader
        category="Retenção"
        categoryIcon={<Users className="w-3.5 h-3.5" />}
        title="Resgate de clientes"
        description="Cada cliente tem um ritmo próprio de retorno. Aqui estão os que passaram do ciclo — e ainda dá para trazer de volta."
        action={
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={() => setComposerOpen(true)}
            className="btn btn-primary btn-sm"
          >
            <Mail className="w-3.5 h-3.5" />
            Escrever campanha ({selected.length})
          </button>
        }
      />

      {/* Filtros por faixa. O padrão vem de CAMPAIGN_DEFAULT_STATUSES, que
          deliberadamente exclui quem provavelmente voltaria sozinho. */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ status, hint }) => (
          <button
            key={status}
            type="button"
            onClick={() => toggleFilter(status)}
            title={hint}
            aria-pressed={active.includes(status)}
            data-active={active.includes(status) || undefined}
            className="segmented-item"
          >
            {STATUS_LABELS[status]}
            <span className="ml-1.5 text-[var(--color-text-subtle)]">
              {counts.get(status) ?? 0}
            </span>
          </button>
        ))}
      </div>

      {overdueCount > 0 && !active.includes("OVERDUE") && (
        <p
          className="text-[var(--color-warning)] bg-[var(--color-warning-light)] border border-[var(--color-warning-border)] rounded-[var(--radius-control)] px-3 py-2"
          style={{ fontSize: "var(--text-2xs)" }}
        >
          {overdueCount} cliente{overdueCount === 1 ? "" : "s"} na janela de resgate
          {overdueCount === 1 ? " está" : " estão"} fora do filtro atual.
        </p>
      )}

      <div className="card">
        {visible.length === 0 ? (
          <EmptyState
            icon={<Clock className="w-5 h-5" />}
            title="Ninguém nesta faixa"
            description="Escolha outra faixa acima, ou aguarde — a lista se atualiza conforme os atendimentos são concluídos."
          />
        ) : (
          <div className="table-container" style={{ border: 0, boxShadow: "none" }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: "2.5rem" }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) =>
                        setSelected(e.target.checked ? selectable.map((c) => c.customerId) : [])
                      }
                      aria-label="Selecionar todos"
                    />
                  </th>
                  <th>Cliente</th>
                  <th>Situação</th>
                  <th className="text-right">Ciclo</th>
                  <th className="text-right">Sem voltar há</th>
                  <th className="text-right">Já gastou</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => {
                  const blocked = isBlocked(c);
                  return (
                    <tr key={c.customerId} data-disabled={blocked || undefined}>
                      <td>
                        <input
                          type="checkbox"
                          disabled={blocked}
                          checked={selected.includes(c.customerId)}
                          onChange={(e) =>
                            setSelected((prev) =>
                              e.target.checked
                                ? [...prev, c.customerId]
                                : prev.filter((id) => id !== c.customerId)
                            )
                          }
                          aria-label={`Selecionar ${c.name}`}
                        />
                      </td>
                      <td>
                        <span className="font-medium text-[var(--color-text-heading)] block">
                          {c.name}
                        </span>
                        <span
                          className="text-[var(--color-text-muted)]"
                          style={{ fontSize: "var(--text-2xs)" }}
                        >
                          {/* O motivo do bloqueio é dito, não só desabilitado —
                              senão o dono acha que é bug da tela. */}
                          {!c.acceptsMarketing
                            ? "Não autorizou receber ofertas — peça na próxima visita"
                            : c.optedOut
                              ? "Descadastrou-se das ofertas"
                              : blocked
                                ? `Já recebeu resgate nos últimos ${WIN_BACK_COOLDOWN_DAYS} dias`
                                : c.email}
                        </span>
                      </td>
                      <td>
                        <StatusBadge variant={STATUS_VARIANTS[c.status]}>
                          {STATUS_LABELS[c.status]}
                        </StatusBadge>
                        <span
                          className="text-[var(--color-text-muted)] block mt-0.5"
                          style={{ fontSize: "var(--text-2xs)" }}
                        >
                          {c.reason}
                        </span>
                      </td>
                      <td data-type="number">
                        {c.cycleDays === null ? "—" : `${c.cycleDays} d`}
                      </td>
                      <td data-type="number">{c.daysSinceLast} d</td>
                      <td data-type="number">
                        {formatMoney(c.totalSpent, company.currency, company.locale)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {composerOpen && (
        <Modal
          title={`Campanha para ${selected.length} cliente${selected.length === 1 ? "" : "s"}`}
          isOpen={true}
          onClose={() => setComposerOpen(false)}
        >
          <div className="space-y-4">
            <p className="text-xs text-[var(--color-text-muted)]">
              O texto é seu. Escreva como você falaria com o cliente — e-mail de
              robô para quem já foi seu cliente não traz ninguém de volta.
            </p>

            <div>
              <label htmlFor="subject" className="block text-xs font-bold text-[var(--color-text)] mb-1">
                Assunto
              </label>
              <input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={120}
                placeholder="Faz tempo que a gente não se vê"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-xs font-bold text-[var(--color-text)] mb-1">
                Mensagem
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1200}
                rows={6}
                placeholder={"Oi! Notamos que faz um tempinho desde a sua última visita.\nSe quiser marcar, é só clicar no botão abaixo."}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="offer" className="block text-xs font-bold text-[var(--color-text)] mb-1">
                Incentivo <span className="font-normal text-[var(--color-text-muted)]">(opcional)</span>
              </label>
              <input
                id="offer"
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
                maxLength={120}
                placeholder="15% de desconto até o fim do mês"
                className="input"
              />
              <p
                className="text-[var(--color-text-muted)] mt-1"
                style={{ fontSize: "var(--text-2xs)" }}
              >
                Nem toda campanha precisa de desconto. Muita gente só esqueceu.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
              <button type="button" onClick={() => setComposerOpen(false)} className="btn btn-ghost btn-sm">
                Cancelar
              </button>
              <button
                type="button"
                onClick={send}
                disabled={isPending || subject.trim().length < 3 || message.trim().length < 10}
                className="btn btn-primary btn-sm"
              >
                {isPending ? "Enviando…" : `Enviar para ${selected.length}`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
