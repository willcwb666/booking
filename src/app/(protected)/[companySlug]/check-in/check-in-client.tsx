"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { toast } from "@/lib/toast-service";
import {
  locateCompanyByAddressAction,
  saveCheckinGeofenceAction,
} from "@/server/actions/checkin-settings";
import { MapPin, AlertTriangle, Check } from "@/components/ui/icons";

type Props = {
  companySlug: string;
  settings: { latitude: number | null; longitude: number | null; radiusMeters: number };
  hasAddress: boolean;
};

export function CheckinSettingsClient({ companySlug, settings, hasAddress }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [locating, setLocating] = useState(false);
  const [form, setForm] = useState({
    latitude: settings.latitude === null ? "" : String(settings.latitude),
    longitude: settings.longitude === null ? "" : String(settings.longitude),
    radiusMeters: String(settings.radiusMeters),
  });

  const isActive = settings.latitude !== null && settings.longitude !== null;
  const hasDraft = form.latitude.trim() !== "" && form.longitude.trim() !== "";

  const locate = () => {
    setLocating(true);
    startTransition(async () => {
      const res = await locateCompanyByAddressAction(companySlug);
      setLocating(false);
      if (!res.success) {
        toast.error("Não localizado", res.error);
        return;
      }
      setForm((f) => ({
        ...f,
        latitude: String(res.latitude),
        longitude: String(res.longitude),
      }));
      toast.success("Endereço localizado", "Confira no mapa antes de salvar.");
    });
  };

  const save = () => {
    startTransition(async () => {
      const res = await saveCheckinGeofenceAction(companySlug, {
        latitude: form.latitude.trim() === "" ? null : Number(form.latitude),
        longitude: form.longitude.trim() === "" ? null : Number(form.longitude),
        radiusMeters: Number(form.radiusMeters),
      });
      if (!res.success) {
        toast.error("Não salvo", res.error);
        return;
      }
      toast.success(
        hasDraft ? "Cerca ativada" : "Cerca desativada",
        hasDraft
          ? "A partir de agora o cliente precisa estar perto para confirmar a chegada."
          : "O check-in volta a valer de qualquer lugar."
      );
      router.refresh();
    });
  };

  const mapsUrl =
    hasDraft && `https://www.google.com/maps?q=${form.latitude},${form.longitude}`;

  return (
    <div className="page-content space-y-6">
      <PageHeader
        category="Operação"
        categoryIcon={<MapPin className="w-3.5 h-3.5" />}
        title="Check-in por proximidade"
        description="O cliente confirma a chegada pelo celular, e o sistema verifica se ele está mesmo no local."
      />

      {/* O estado real vem primeiro. O recurso passou a existir sem nunca ter
          rodado porque nada na tela dizia que ele estava desligado. */}
      {isActive ? (
        <p
          className="flex items-start gap-2 text-[var(--color-text-muted)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2"
          style={{ fontSize: "var(--text-2xs)" }}
        >
          <Check className="w-4 h-4 shrink-0 text-[var(--color-success)]" />
          <span>
            Cerca <strong>ativa</strong>. O check-in só é aceito num raio de{" "}
            {settings.radiusMeters} metros do ponto salvo.
          </span>
        </p>
      ) : (
        <p
          className="flex items-start gap-2 text-[var(--color-text-muted)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2"
          style={{ fontSize: "var(--text-2xs)" }}
        >
          <AlertTriangle className="w-4 h-4 shrink-0 text-[var(--color-warning)]" />
          <span>
            Cerca <strong>desligada</strong>: sem o ponto do estabelecimento não há o que
            comparar, e o check-in é aceito de qualquer lugar. Localize o endereço abaixo
            para ativar.
          </span>
        </p>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Onde fica o estabelecimento</h2>
        </div>
        <div className="card-body space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={locate}
              disabled={isPending || !hasAddress}
              className="btn btn-secondary btn-sm"
            >
              <MapPin className="w-3.5 h-3.5" />
              {locating ? "Localizando…" : "Localizar pelo endereço cadastrado"}
            </button>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--color-info)] hover:underline"
              >
                Conferir este ponto no mapa
              </a>
            )}
          </div>

          {!hasAddress && (
            <p
              className="text-[var(--color-text-muted)]"
              style={{ fontSize: "var(--text-2xs)" }}
            >
              Cadastre o endereço da empresa em Configurações para usar a localização
              automática — ou informe as coordenadas à mão abaixo.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field
              id="latitude"
              label="Latitude"
              placeholder="-25.428400"
              value={form.latitude}
              onChange={(v) => setForm({ ...form, latitude: v })}
            />
            <Field
              id="longitude"
              label="Longitude"
              placeholder="-49.273300"
              value={form.longitude}
              onChange={(v) => setForm({ ...form, longitude: v })}
            />
            <Field
              id="radiusMeters"
              label="Raio aceito (metros)"
              type="number"
              value={form.radiusMeters}
              onChange={(v) => setForm({ ...form, radiusMeters: v })}
              hint="Mínimo 50 m — abaixo disso o erro do próprio GPS reprova quem chegou."
            />
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
            <button
              type="button"
              onClick={() => setForm({ ...form, latitude: "", longitude: "" })}
              disabled={isPending || !hasDraft}
              className="btn btn-secondary btn-sm"
            >
              Desligar a cerca
            </button>
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
          <h2 className="card-title">O que esta verificação vale</h2>
        </div>
        <div className="card-body">
          {/* Prometer prova de presença seria mentir, e a mentira reaparece na
              primeira discussão entre o dono e um cliente. */}
          <p className="text-[var(--color-text-muted)] leading-relaxed text-sm">
            A posição vem do celular do cliente, e celular se falsifica. Isto é atrito
            honesto contra a chegada confirmada do sofá, não prova de presença — por isso
            o check-in confirma a chegada e não libera pagamento nem desconto. Quem não
            conseguir confirmar pelo aplicativo continua sendo atendido pela recepção,
            como sempre foi.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-[var(--color-text-muted)] mb-1">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
      />
      {hint && (
        <p
          className="text-[var(--color-text-muted)] mt-1"
          style={{ fontSize: "var(--text-2xs)" }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
