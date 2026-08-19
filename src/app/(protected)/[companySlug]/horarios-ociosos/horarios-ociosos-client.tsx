"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { IconAction, RowActions } from "@/components/ui/icon-action";
import { toast } from "@/lib/toast-service";
import {
  upsertOffPeakWindowAction,
  setOffPeakWindowActiveAction,
  deleteOffPeakWindowAction,
} from "@/server/actions/off-peak";
import {
  WEEKDAY_LABELS,
  type OffPeakWindow,
  type OccupancyGrid,
  type OffPeakSuggestion,
} from "@/lib/off-peak";
import { Clock, PlusCircle, TrendingUp } from "@/components/ui/icons";

type Props = {
  companySlug: string;
  windows: OffPeakWindow[];
  grid: OccupancyGrid;
  suggestions: OffPeakSuggestion[];
};

const EMPTY = {
  label: "",
  weekday: 2,
  startTime: "09:00",
  endTime: "12:00",
  discountPercentage: 15,
};

/** Horas exibidas na grade. Fora disso quase nenhuma empresa atende. */
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 07h–21h

export function HorariosOciososClient({ companySlug, windows, grid, suggestions }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<{ id?: string; form: typeof EMPTY } | null>(null);

  const openNew = (preset?: Partial<typeof EMPTY>) =>
    setEditing({ form: { ...EMPTY, ...preset } });

  const save = () => {
    if (!editing) return;
    startTransition(async () => {
      const res = await upsertOffPeakWindowAction(companySlug, editing.form, editing.id);
      if (!res.success) {
        toast.error("Não salvo", res.error);
        return;
      }
      toast.success("Salvo", "A janela já vale para novos agendamentos.");
      setEditing(null);
      router.refresh();
    });
  };

  const toggle = (id: string, isActive: boolean) => {
    startTransition(async () => {
      const res = await setOffPeakWindowActiveAction(companySlug, id, isActive);
      if (!res.success) toast.error("Erro", res.error);
      else router.refresh();
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      const res = await deleteOffPeakWindowAction(companySlug, id);
      if (!res.success) toast.error("Erro", res.error);
      else router.refresh();
    });
  };

  /** Contagem de uma célula da grade, para o mapa de calor. */
  const cellCount = (weekday: number, hour: number) =>
    grid.cells.find((c) => c.weekday === weekday && c.hour === hour)?.bookings ?? 0;

  return (
    <div className="page-content space-y-6">
      <PageHeader
        category="Ocupação"
        categoryIcon={<Clock className="w-3.5 h-3.5" />}
        title="Horários ociosos"
        description="Desconto nos horários que vivem vazios. O cliente ganha um motivo para vir na terça de manhã, e a cadeira para de ficar parada."
        action={
          <button type="button" onClick={() => openNew()} className="btn btn-primary btn-sm">
            <PlusCircle className="w-3.5 h-3.5" />
            Nova janela
          </button>
        }
      />

      {/* Só desconto, e o motivo fica escrito na tela: é a pergunta que o dono
          vai fazer ("e cobrar mais no sábado?"), e a resposta precisa estar
          onde ele está olhando. */}
      <p
        className="text-[var(--color-text-muted)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 leading-relaxed"
        style={{ fontSize: "var(--text-2xs)" }}
      >
        Aqui só existe desconto, de propósito. Cobrar mais caro no horário de pico
        até funciona em aplicativo de corrida, onde ninguém se conhece — mas o seu
        cliente conversa com o vizinho da cadeira ao lado. Quando ele descobre que
        pagou mais pelo mesmo corte, você não perde a diferença: perde o cliente.
      </p>

      {suggestions.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="min-w-0">
              <h2 className="card-title">Sugestões a partir do seu movimento</h2>
              <p
                className="text-[var(--color-text-muted)]"
                style={{ fontSize: "var(--text-xs)" }}
              >
                Faixas com menos agendamentos nos últimos {grid.daysAnalyzed} dias
              </p>
            </div>
          </div>
          <div className="card-body grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {suggestions.map((s) => (
              <button
                key={`${s.weekday}-${s.startHour}`}
                type="button"
                onClick={() =>
                  openNew({
                    label: `${s.weekdayLabel} ${String(s.startHour).padStart(2, "0")}h`,
                    weekday: s.weekday,
                    startTime: `${String(s.startHour).padStart(2, "0")}:00`,
                    endTime: `${String(s.endHour).padStart(2, "0")}:00`,
                  })
                }
                className="p-3 text-left rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] transition-colors hover:border-[var(--color-border-strong)]"
              >
                <span className="block font-medium text-[var(--color-text-heading)]">
                  {s.weekdayLabel}, {String(s.startHour).padStart(2, "0")}h às{" "}
                  {String(s.endHour).padStart(2, "0")}h
                </span>
                <span
                  className="block text-[var(--color-text-muted)]"
                  style={{ fontSize: "var(--text-2xs)" }}
                >
                  {s.bookings} agendamento{s.bookings === 1 ? "" : "s"} no período
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mapa de calor: o dono confere se a sugestão bate com o que ele sente. */}
      <div className="card">
        <div className="card-header">
          <div className="min-w-0">
            <h2 className="card-title">Seu movimento por horário</h2>
            <p
              className="text-[var(--color-text-muted)]"
              style={{ fontSize: "var(--text-xs)" }}
            >
              Últimos {grid.daysAnalyzed} dias · {grid.total} agendamentos
            </p>
          </div>
        </div>
        <div className="card-body">
          {grid.total === 0 ? (
            <EmptyState
              icon={<TrendingUp className="w-5 h-5" />}
              title="Ainda sem histórico"
              description="Assim que houver atendimentos concluídos, o mapa mostra quais horários ficam vazios."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ fontSize: "var(--text-2xs)" }}>
                <thead>
                  <tr>
                    <th className="text-left pr-2 font-normal text-[var(--color-text-subtle)]" />
                    {HOURS.map((h) => (
                      <th
                        key={h}
                        className="font-normal text-[var(--color-text-subtle)] pb-1"
                        style={{ minWidth: "1.75rem" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {WEEKDAY_LABELS.map((label, weekday) => (
                    <tr key={label}>
                      <td className="pr-2 text-[var(--color-text-muted)] whitespace-nowrap">
                        {label.slice(0, 3)}
                      </td>
                      {HOURS.map((h) => {
                        const n = cellCount(weekday, h);
                        // Opacidade proporcional ao pico da própria empresa —
                        // a escala é relativa, como o critério da sugestão.
                        const intensity = grid.max > 0 ? n / grid.max : 0;
                        return (
                          <td key={h} className="p-0.5">
                            <span
                              title={`${label} ${h}h — ${n} agendamento${n === 1 ? "" : "s"}`}
                              className="block h-6 rounded-[3px]"
                              style={{
                                background:
                                  n === 0
                                    ? "var(--color-bg-muted)"
                                    : `color-mix(in srgb, var(--color-primary) ${Math.round(intensity * 100)}%, var(--color-bg-muted))`,
                              }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Janelas com desconto</h2>
        </div>
        {windows.length === 0 ? (
          <EmptyState
            icon={<Clock className="w-5 h-5" />}
            title="Nenhuma janela criada"
            description="Escolha uma sugestão acima ou crie a sua. O desconto aparece no preço quando o cliente escolhe o horário."
          />
        ) : (
          <div className="table-container" style={{ border: 0, boxShadow: "none" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Janela</th>
                  <th>Quando</th>
                  <th className="text-right">Desconto</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {windows.map((w) => (
                  <tr key={w.id} data-disabled={!w.isActive || undefined}>
                    <td className="font-medium text-[var(--color-text-heading)]">
                      {w.label}
                      {!w.isActive && (
                        <span
                          className="block text-[var(--color-text-subtle)]"
                          style={{ fontSize: "var(--text-2xs)" }}
                        >
                          Pausada
                        </span>
                      )}
                    </td>
                    <td className="text-[var(--color-text-muted)]">
                      {WEEKDAY_LABELS[w.weekday]}, {w.startTime} às {w.endTime}
                    </td>
                    <td data-type="number">{w.discountPercentage}%</td>
                    <td>
                      <RowActions>
                        <IconAction
                          intent={w.isActive ? "deactivate" : "activate"}
                          onClick={() => toggle(w.id, !w.isActive)}
                          disabled={isPending}
                        />
                        <IconAction
                          intent="edit"
                          onClick={() =>
                            setEditing({
                              id: w.id,
                              form: {
                                label: w.label,
                                weekday: w.weekday,
                                startTime: w.startTime,
                                endTime: w.endTime,
                                discountPercentage: w.discountPercentage,
                              },
                            })
                          }
                          disabled={isPending}
                        />
                        <IconAction
                          intent="delete"
                          onClick={() => remove(w.id)}
                          disabled={isPending}
                        />
                      </RowActions>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <Modal
          title={editing.id ? "Editar janela" : "Nova janela de desconto"}
          isOpen={true}
          onClose={() => setEditing(null)}
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="label" className="block text-xs font-bold text-[var(--color-text)] mb-1">
                Nome
              </label>
              <input
                id="label"
                value={editing.form.label}
                onChange={(e) =>
                  setEditing({ ...editing, form: { ...editing.form, label: e.target.value } })
                }
                maxLength={60}
                placeholder="Terça de manhã"
                className="input"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="weekday" className="block text-xs font-bold text-[var(--color-text)] mb-1">
                  Dia
                </label>
                <select
                  id="weekday"
                  value={editing.form.weekday}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      form: { ...editing.form, weekday: Number(e.target.value) },
                    })
                  }
                  className="input"
                >
                  {WEEKDAY_LABELS.map((l, i) => (
                    <option key={l} value={i}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="startTime" className="block text-xs font-bold text-[var(--color-text)] mb-1">
                  Das
                </label>
                <input
                  id="startTime"
                  type="time"
                  value={editing.form.startTime}
                  onChange={(e) =>
                    setEditing({ ...editing, form: { ...editing.form, startTime: e.target.value } })
                  }
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="endTime" className="block text-xs font-bold text-[var(--color-text)] mb-1">
                  Até
                </label>
                <input
                  id="endTime"
                  type="time"
                  value={editing.form.endTime}
                  onChange={(e) =>
                    setEditing({ ...editing, form: { ...editing.form, endTime: e.target.value } })
                  }
                  className="input"
                />
              </div>
            </div>

            <div>
              <label htmlFor="discount" className="block text-xs font-bold text-[var(--color-text)] mb-1">
                Desconto (%)
              </label>
              <input
                id="discount"
                type="number"
                min={1}
                max={90}
                value={editing.form.discountPercentage}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    form: { ...editing.form, discountPercentage: Number(e.target.value) || 1 },
                  })
                }
                className="input max-w-[8rem]"
              />
              <p
                className="text-[var(--color-text-muted)] mt-1"
                style={{ fontSize: "var(--text-2xs)" }}
              >
                Aplicado sobre o total do serviço quando o cliente escolhe um
                horário dentro da janela. O horário final não entra: das 09:00 às
                12:00 cobre até 11:59.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
              <button type="button" onClick={() => setEditing(null)} className="btn btn-ghost btn-sm">
                Cancelar
              </button>
              <button type="button" onClick={save} disabled={isPending} className="btn btn-primary btn-sm">
                {isPending ? "Salvando…" : "Salvar janela"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
