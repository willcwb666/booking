"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { toast } from "@/lib/toast-service";
import { saveDriveTimeSettingsAction } from "@/server/actions/drive-time";
import { Car, AlertTriangle } from "@/components/ui/icons";

type Props = {
  companySlug: string;
  settings: { enabled: boolean; minutesPerKm: number; maxMinutes: number };
  coverage: { upcoming: number; located: number; blocks: number };
};

/**
 * Distâncias de referência da prévia.
 *
 * Minuto por quilômetro é uma unidade que ninguém tem intuição sobre. "Quatro
 * minutos e meio para atravessar um bairro" é uma frase que o dono confere
 * contra a própria experiência em dois segundos — e é assim que ele descobre
 * que o número está errado antes de a agenda dele descobrir.
 */
const REFERENCES = [
  { km: 1.5, label: "Mesmo bairro" },
  { km: 5, label: "Bairro vizinho" },
  { km: 12, label: "Atravessar a cidade" },
];

export function TempoDeDeslocamentoClient({ companySlug, settings, coverage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(settings);

  const save = () => {
    startTransition(async () => {
      const res = await saveDriveTimeSettingsAction(companySlug, form);
      if (!res.success) {
        toast.error("Não salvo", res.error);
        return;
      }
      toast.success(
        form.enabled ? "Reserva ligada" : "Reserva desligada",
        form.enabled
          ? "Os próximos agendamentos já respeitam o tempo de viagem."
          : "Os bloqueios de deslocamento foram removidos da agenda."
      );
      router.refresh();
    });
  };

  const preview = (km: number) =>
    Math.min(Math.ceil(km * form.minutesPerKm), Math.max(0, form.maxMinutes));

  const unlocated = Math.max(0, coverage.upcoming - coverage.located);

  return (
    <div className="page-content space-y-6">
      <PageHeader
        category="Agenda"
        categoryIcon={<Car className="w-3.5 h-3.5" />}
        title="Tempo de deslocamento"
        description="Reserva o tempo de viagem entre um atendimento e o próximo, para a agenda parar de vender horários que não dá para cumprir."
      />

      {/* A pergunta que o dono faz na primeira tela é "de onde vem esse
          número?". A resposta fica onde ele está olhando, não no código. */}
      <p
        className="text-[var(--color-text-muted)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 leading-relaxed"
        style={{ fontSize: "var(--text-2xs)" }}
      >
        A distância é medida em <strong>linha reta</strong> entre os dois endereços, não
        pelas ruas. O caminho real é sempre mais longo, e o fator abaixo já leva isso em
        conta: 3 minutos por quilômetro em linha reta equivale a bem menos de 20 km/h de
        rua de verdade. Não consultamos trânsito ao vivo de propósito — o trânsito de
        agora não é o trânsito da hora do atendimento, e pagar por essa consulta compraria
        uma precisão que não existe.
      </p>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Reserva de viagem</h2>
        </div>
        <div className="card-body space-y-5">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="rounded mt-0.5"
            />
            <span className="text-sm text-[var(--color-text)]">
              Reservar tempo de viagem entre atendimentos
              <span
                className="block text-[var(--color-text-muted)]"
                style={{ fontSize: "var(--text-2xs)" }}
              >
                Ligue apenas se a sua equipe vai até o cliente. Para quem atende no
                balcão, isso só apagaria horários vendáveis da grade.
              </span>
            </span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="minutesPerKm"
                className="block text-xs text-[var(--color-text-muted)] mb-1"
              >
                Minutos por quilômetro
              </label>
              <input
                id="minutesPerKm"
                type="number"
                step="0.5"
                min="0.5"
                max="30"
                value={form.minutesPerKm}
                onChange={(e) => setForm({ ...form, minutesPerKm: Number(e.target.value) })}
                className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
              />
              <p
                className="text-[var(--color-text-muted)] mt-1"
                style={{ fontSize: "var(--text-2xs)" }}
              >
                Trânsito parado pede um número maior; cidade pequena, menor.
              </p>
            </div>

            <div>
              <label
                htmlFor="maxMinutes"
                className="block text-xs text-[var(--color-text-muted)] mb-1"
              >
                Reserva máxima por trecho (minutos)
              </label>
              <input
                id="maxMinutes"
                type="number"
                step="5"
                min="5"
                max="480"
                value={form.maxMinutes}
                onChange={(e) => setForm({ ...form, maxMinutes: Number(e.target.value) })}
                className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
              />
              <p
                className="text-[var(--color-text-muted)] mt-1"
                style={{ fontSize: "var(--text-2xs)" }}
              >
                Trava de segurança: um endereço mal interpretado não derruba o dia inteiro.
              </p>
            </div>
          </div>

          <div className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-4">
            <p className="text-xs font-medium text-[var(--color-text-heading)] mb-3">
              Com esses números, a agenda reserva:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {REFERENCES.map((ref) => (
                <div key={ref.km}>
                  <p className="text-sm font-semibold text-[var(--color-text-heading)]">
                    {preview(ref.km)} min
                  </p>
                  <p
                    className="text-[var(--color-text-muted)]"
                    style={{ fontSize: "var(--text-2xs)" }}
                  >
                    {ref.label} · {ref.km.toLocaleString("pt-BR")} km em linha reta
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={save}
              disabled={isPending}
              className="btn btn-primary btn-sm"
            >
              {isPending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Alcance</h2>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-lg font-semibold text-[var(--color-text-heading)]">
                {coverage.upcoming}
              </p>
              <p
                className="text-[var(--color-text-muted)]"
                style={{ fontSize: "var(--text-2xs)" }}
              >
                Atendimentos de hoje em diante
              </p>
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--color-text-heading)]">
                {coverage.located}
              </p>
              <p
                className="text-[var(--color-text-muted)]"
                style={{ fontSize: "var(--text-2xs)" }}
              >
                Com endereço localizado no mapa
              </p>
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--color-text-heading)]">
                {coverage.blocks}
              </p>
              <p
                className="text-[var(--color-text-muted)]"
                style={{ fontSize: "var(--text-2xs)" }}
              >
                Bloqueios de viagem na agenda
              </p>
            </div>
          </div>

          {unlocated > 0 && (
            /* O número que ninguém gosta de mostrar é justamente o que evita a
               confiança falsa: um trecho que não foi medido não está
               protegido, e o dono precisa saber disso antes de contar com a
               agenda para chegar no horário. */
            <p className="flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[var(--color-warning)]" />
              <span>
                {unlocated}{" "}
                {unlocated === 1 ? "atendimento não teve" : "atendimentos não tiveram"} o
                endereço localizado — trechos assim não geram reserva de viagem. Endereço
                incompleto ou rua muito nova costumam ser a causa.
              </span>
            </p>
          )}

          <p
            className="text-[var(--color-text-muted)] leading-relaxed"
            style={{ fontSize: "var(--text-2xs)" }}
          >
            Os bloqueios aparecem na tela de horários e podem ser apagados um a um quando
            você sabe que vai chegar. A conta é refeita quando o dia daquele profissional
            muda — agendamento novo, cancelado ou remarcado.
          </p>
        </div>
      </div>
    </div>
  );
}
