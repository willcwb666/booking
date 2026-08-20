"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney } from "@/lib/format";
import { toast } from "@/lib/toast-service";
import { progressBarWidth } from "@/lib/team-goals";
import type { RankedEntry } from "@/lib/team-goals";
import type { ProfessionalDayPanel } from "@/server/queries/team-goals";
import {
  saveProfessionalGoalAction,
  setTeamRankingAction,
} from "@/server/actions/team-goals";
import { Target, Calendar } from "@/components/ui/icons";

type Props = {
  companySlug: string;
  canManage: boolean;
  panel: ProfessionalDayPanel | null;
  professionals: Array<{ id: string; name: string; dailyGoal: number | null }>;
  ranking: RankedEntry[];
  rankingEnabled: boolean;
  selfProfessionalId: string | null;
};

export function MeuPainelClient({
  companySlug,
  canManage,
  panel,
  professionals,
  ranking,
  rankingEnabled,
  selfProfessionalId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [goalDraft, setGoalDraft] = useState<string>(
    panel?.goal.goal !== null && panel?.goal.goal !== undefined ? String(panel.goal.goal) : ""
  );

  if (!panel) {
    return (
      <div className="page-content space-y-6">
        <PageHeader
          category="Equipe"
          categoryIcon={<Target className="w-3.5 h-3.5" />}
          title="Meu painel"
        />
        <EmptyState
          icon={<Target className="w-5 h-5" />}
          title="Sem painel para mostrar"
          description="Este painel acompanha o dia de um profissional. Sua conta ainda não está ligada a uma ficha de profissional desta empresa."
        />
      </div>
    );
  }

  const money = (v: number) => formatMoney(v, panel.currency, panel.locale);

  const changeProfessional = (id: string) => {
    router.push(`/${companySlug}/meu-painel?prof=${id}`);
  };

  const saveGoal = () => {
    startTransition(async () => {
      const raw = goalDraft.trim();
      const res = await saveProfessionalGoalAction(companySlug, {
        professionalId: panel.professionalId,
        dailyGoal: raw === "" ? null : Number(raw),
      });
      if (!res.success) {
        toast.error("Não salvo", res.error);
        return;
      }
      toast.success("Meta salva", raw === "" ? "Meta removida." : "Vale a partir de hoje.");
      router.refresh();
    });
  };

  const toggleRanking = (enabled: boolean) => {
    startTransition(async () => {
      const res = await setTeamRankingAction(companySlug, enabled);
      if (!res.success) toast.error("Não salvo", res.error);
      else router.refresh();
    });
  };

  const isSelf = panel.professionalId === selfProfessionalId;

  return (
    <div className="page-content space-y-6">
      <PageHeader
        category="Equipe"
        categoryIcon={<Target className="w-3.5 h-3.5" />}
        title={isSelf ? "Meu painel" : `Painel · ${panel.professionalName}`}
        description="O seu dia: o que já entrou, quanto disso é seu, e quanto falta para a meta."
        action={
          canManage && professionals.length > 1 ? (
            <select
              value={panel.professionalId}
              onChange={(e) => changeProfessional(e.target.value)}
              className="border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-1.5 text-sm"
            >
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : null
        }
      />

      {/* ── A meta ── */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Meta de hoje</h2>
        </div>
        <div className="card-body space-y-4">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-2xl font-semibold text-[var(--color-text-heading)] tabular-nums">
                {money(panel.revenue)}
              </p>
              <p
                className="text-[var(--color-text-muted)]"
                style={{ fontSize: "var(--text-2xs)" }}
              >
                gerado hoje
              </p>
            </div>

            {panel.goal.goal === null ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                Sem meta definida
              </p>
            ) : (
              <div className="text-right">
                <p className="text-sm font-medium text-[var(--color-text-heading)] tabular-nums">
                  {panel.goal.reached
                    ? "Meta batida"
                    : `faltam ${money(panel.goal.remaining ?? 0)}`}
                </p>
                <p
                  className="text-[var(--color-text-muted)] tabular-nums"
                  style={{ fontSize: "var(--text-2xs)" }}
                >
                  meta {money(panel.goal.goal)} · {Math.round(panel.goal.percent ?? 0)}%
                </p>
              </div>
            )}
          </div>

          {panel.goal.goal !== null && (
            <div
              className="h-2 w-full rounded-full bg-[var(--color-bg-subtle)] overflow-hidden"
              role="progressbar"
              aria-valuenow={Math.round(panel.goal.percent ?? 0)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progressBarWidth(panel.goal.percent)}%`,
                  background: panel.goal.reached
                    ? "var(--color-success)"
                    : "var(--color-accent)",
                }}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <Stat label="Comissão acumulada" value={money(panel.commission)} />
            <Stat
              label="Atendimentos a fazer"
              value={String(panel.upcomingCount)}
            />
            <Stat
              label="Neste ritmo, fecha em"
              value={panel.projection === null ? "—" : money(panel.projection)}
              hint={
                panel.projection === null
                  ? "A projeção aparece depois do começo do expediente."
                  : undefined
              }
            />
          </div>

          {canManage && (
            <div className="flex items-end gap-2 pt-2 border-t border-[var(--color-border)]">
              <div className="flex-1 max-w-[220px]">
                <label
                  htmlFor="dailyGoal"
                  className="block text-xs text-[var(--color-text-muted)] mb-1"
                >
                  Meta diária de {panel.professionalName}
                </label>
                <input
                  id="dailyGoal"
                  type="number"
                  min="0"
                  step="10"
                  value={goalDraft}
                  onChange={(e) => setGoalDraft(e.target.value)}
                  placeholder="sem meta"
                  className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={saveGoal}
                disabled={isPending}
                className="btn btn-primary btn-sm"
              >
                Salvar meta
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Os atendimentos do dia ── */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Atendimentos de hoje</h2>
        </div>
        <div className="card-body">
          {panel.services.length === 0 ? (
            <EmptyState
              icon={<Calendar className="w-5 h-5" />}
              title="Nada marcado para hoje"
              description="Quando entrar agendamento, ele aparece aqui com o horário e o valor."
            />
          ) : (
            <div className="space-y-2">
              {panel.services.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-[var(--color-border)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-heading)] truncate">
                      {s.startTime}–{s.endTime} · {s.customerName}
                    </p>
                    <p
                      className="text-[var(--color-text-muted)] truncate"
                      style={{ fontSize: "var(--text-2xs)" }}
                    >
                      {s.serviceName}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm tabular-nums text-[var(--color-text-heading)]">
                      {money(s.total)}
                    </span>
                    <StatusBadge>{s.status}</StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── O ranking, quando a empresa liga ── */}
      {rankingEnabled && ranking.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Equipe hoje</h2>
          </div>
          <div className="card-body space-y-2">
            {ranking.map((r) => (
              <div
                key={r.professionalId}
                className={`flex items-center justify-between gap-3 rounded-[var(--radius-control)] px-3 py-2 ${
                  r.professionalId === panel.professionalId
                    ? "bg-[var(--color-bg-subtle)] border border-[var(--color-border)]"
                    : ""
                }`}
              >
                <span className="text-sm text-[var(--color-text)]">
                  <span className="text-[var(--color-text-muted)] tabular-nums mr-2">
                    {r.position}º
                  </span>
                  {r.name}
                </span>
                <span className="text-sm tabular-nums text-[var(--color-text-heading)]">
                  {money(r.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {canManage && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Ranking da equipe</h2>
          </div>
          <div className="card-body space-y-3">
            <label className="flex items-start gap-2 text-sm text-[var(--color-text)]">
              <input
                type="checkbox"
                checked={rankingEnabled}
                onChange={(e) => toggleRanking(e.target.checked)}
                disabled={isPending}
                className="rounded mt-0.5"
              />
              <span>
                Mostrar o faturamento de cada profissional para a equipe inteira
              </span>
            </label>

            {/* O motivo de vir desligado fica na tela, não só no código: é a
                pergunta que o dono vai fazer, e a resposta precisa estar onde
                ele está olhando. */}
            <p
              className="text-[var(--color-text-muted)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 leading-relaxed"
              style={{ fontSize: "var(--text-2xs)" }}
            >
              Vem desligado de propósito. Metade de uma equipe está sempre na metade de
              baixo de um ranking — por definição —, e essa metade não trabalha melhor
              por saber disso. O ranking também empurra venda adicional, que corrói
              justamente a recorrência que sustenta o negócio. Ligue se a sua equipe já
              é competitiva e você está por perto; a comparação com a própria meta,
              acima, funciona para todo mundo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-lg font-semibold text-[var(--color-text-heading)] tabular-nums">
        {value}
      </p>
      <p className="text-[var(--color-text-muted)]" style={{ fontSize: "var(--text-2xs)" }}>
        {label}
      </p>
      {hint && (
        <p
          className="text-[var(--color-text-subtle)] mt-0.5"
          style={{ fontSize: "var(--text-2xs)" }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
