"use client";

import React, { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/lib/toast-service";
import {
  addClientPhotoAction,
  deleteClientPhotoAction,
  saveServiceRecordAction,
  deleteServiceRecordAction,
} from "@/server/actions/client-vault";
import type { ClientVault } from "@/server/queries/client-vault";
import { Lock, Camera, Trash2, ClipboardList } from "@/components/ui/icons";

type Props = {
  companySlug: string;
  customer: { id: string; name: string };
  vault: ClientVault;
  professionals: Array<{ id: string; name: string }>;
  defaultProfessionalId: string | null;
};

const EMPTY_RECORD = {
  formula: "",
  developer: "",
  processingMinutes: "",
  clipperGuard: "",
  productsUsed: "",
  notes: "",
};

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function CofreClient({
  companySlug,
  customer,
  vault,
  professionals,
  defaultProfessionalId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);

  /**
   * O consentimento é estado da tela, não do formulário de cada foto.
   *
   * Ele precisa ser marcado ANTES de escolher o arquivo: uma caixa que aparece
   * depois do upload transforma o consentimento em obstáculo a ser clicado, e
   * quem já enviou a foto vai clicar. O botão de escolher arquivo fica
   * desabilitado enquanto ela estiver em branco.
   */
  const [consent, setConsent] = useState(false);
  const [kind, setKind] = useState<"BEFORE" | "AFTER">("BEFORE");
  const [professionalId, setProfessionalId] = useState<string>(defaultProfessionalId ?? "");
  const [record, setRecord] = useState(EMPTY_RECORD);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Formato não aceito", "Use JPG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Imagem muito grande", "O limite é 8 MB por foto.");
      return;
    }

    setUploading(true);
    try {
      const presign = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "client-photo", contentType: file.type }),
      });
      if (!presign.ok) {
        const body = await presign.json().catch(() => ({}));
        throw new Error(body.error ?? "Erro ao preparar o envio");
      }
      const { uploadUrl, key } = (await presign.json()) as {
        uploadUrl: string;
        key: string;
      };

      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("Erro ao enviar a imagem");

      const res = await addClientPhotoAction(companySlug, {
        customerId: customer.id,
        professionalId: professionalId || null,
        storageKey: key,
        kind,
        consentConfirmed: true,
      });
      if (!res.success) throw new Error(res.error);

      toast.success("Foto guardada", "Ela só aparece para a equipe desta empresa.");
      setConsent(false);
      router.refresh();
    } catch (err) {
      toast.error("Não enviado", err instanceof Error ? err.message : "Erro ao enviar");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const removePhoto = (id: string) => {
    startTransition(async () => {
      const res = await deleteClientPhotoAction(companySlug, id);
      if (!res.success) toast.error("Não apagado", res.error);
      else {
        toast.success("Apagada", "O arquivo saiu do armazenamento, não só da lista.");
        router.refresh();
      }
    });
  };

  const saveRecord = () => {
    startTransition(async () => {
      const res = await saveServiceRecordAction(companySlug, {
        customerId: customer.id,
        professionalId: professionalId || null,
        formula: record.formula,
        developer: record.developer,
        processingMinutes: record.processingMinutes === "" ? null : record.processingMinutes,
        clipperGuard: record.clipperGuard,
        productsUsed: record.productsUsed,
        notes: record.notes,
      });
      if (!res.success) {
        toast.error("Não salvo", res.error);
        return;
      }
      toast.success("Ficha salva", "No retorno dele, ela abre aqui.");
      setRecord(EMPTY_RECORD);
      router.refresh();
    });
  };

  const removeRecord = (id: string) => {
    startTransition(async () => {
      const res = await deleteServiceRecordAction(companySlug, id);
      if (!res.success) toast.error("Não apagada", res.error);
      else router.refresh();
    });
  };

  const dateLabel = (d: Date) => new Date(d).toLocaleDateString();

  return (
    <div className="page-content space-y-6">
      <PageHeader
        category="Cliente"
        categoryIcon={<Lock className="w-3.5 h-3.5" />}
        title={`Cofre · ${customer.name}`}
        description="Fotos e ficha técnica dos atendimentos. Visível só para a equipe desta empresa."
        action={
          <Link href={`/${companySlug}/clientes`} className="btn btn-secondary btn-sm">
            Voltar
          </Link>
        }
      />

      {/* O que o produto faz com essas fotos precisa estar escrito onde a
          equipe está olhando — é ela quem responde ao cliente que perguntar. */}
      <p
        className="text-[var(--color-text-muted)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 leading-relaxed"
        style={{ fontSize: "var(--text-2xs)" }}
      >
        Estas fotos <strong>nunca</strong> aparecem na página pública da empresa — não
        existe caminho no sistema para isso. Cada uma abre por um link temporário, que
        expira em minutos. O cliente pode pedir a exclusão a qualquer momento, e apagar
        aqui remove o arquivo do armazenamento, não só da lista.
      </p>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Nova foto</h2>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="kind" className="block text-xs text-[var(--color-text-muted)] mb-1">
                Momento
              </label>
              <select
                id="kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as "BEFORE" | "AFTER")}
                className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 text-sm"
              >
                <option value="BEFORE">Antes</option>
                <option value="AFTER">Depois</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="professionalId"
                className="block text-xs text-[var(--color-text-muted)] mb-1"
              >
                Profissional
              </label>
              <select
                id="professionalId"
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
                className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 text-sm"
              >
                <option value="">Não informar</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm text-[var(--color-text)]">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="rounded mt-0.5"
            />
            <span>
              O cliente autorizou o registro fotográfico
              <span
                className="block text-[var(--color-text-muted)]"
                style={{ fontSize: "var(--text-2xs)" }}
              >
                Fica registrado quem colheu a autorização e quando. Pergunte antes de
                fotografar, não depois.
              </span>
            </span>
          </label>

          <div>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED.join(",")}
              disabled={!consent || uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
              className="block w-full text-sm text-[var(--color-text)] file:mr-3 file:rounded-[var(--radius-control)] file:border file:border-[var(--color-border)] file:bg-[var(--color-bg-subtle)] file:px-3 file:py-1.5 file:text-sm disabled:opacity-50"
            />
            {!consent && (
              <p
                className="text-[var(--color-text-muted)] mt-1"
                style={{ fontSize: "var(--text-2xs)" }}
              >
                Marque a autorização para liberar o envio.
              </p>
            )}
            {uploading && (
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Enviando…</p>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Galeria</h2>
        </div>
        <div className="card-body">
          {vault.photos.length === 0 ? (
            <EmptyState
              icon={<Camera className="w-5 h-5" />}
              title="Nenhuma foto ainda"
              description="A primeira foto de antes já paga o recurso: no retorno, ninguém precisa lembrar de cabeça."
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {vault.photos.map((photo) => (
                <figure
                  key={photo.id}
                  className="rounded-[var(--radius-card)] border border-[var(--color-border)] overflow-hidden bg-[var(--color-bg-subtle)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={`${photo.kind === "BEFORE" ? "Antes" : "Depois"} — ${customer.name}`}
                    className="w-full aspect-square object-cover"
                  />
                  <figcaption className="p-2 space-y-1">
                    <p className="text-xs font-medium text-[var(--color-text-heading)]">
                      {photo.kind === "BEFORE" ? "Antes" : "Depois"}
                    </p>
                    <p
                      className="text-[var(--color-text-muted)]"
                      style={{ fontSize: "var(--text-2xs)" }}
                    >
                      {dateLabel(photo.takenAt)}
                      {photo.professionalName ? ` · ${photo.professionalName}` : ""}
                    </p>
                    <p
                      className="text-[var(--color-text-subtle)]"
                      style={{ fontSize: "var(--text-2xs)" }}
                    >
                      Guardada até {dateLabel(photo.retainUntil)}
                    </p>
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      disabled={isPending}
                      className="btn btn-secondary btn-sm w-full"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Apagar
                    </button>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Nova ficha técnica</h2>
        </div>
        <div className="card-body space-y-4">
          {/* Os `datalist` são o miolo do item: sugerem o que este profissional
              já usou antes. É mais rápido que ditar para uma IA e, ao
              contrário dela, não inventa uma fórmula que ninguém aplicou. */}
          <datalist id="sug-formula">
            {vault.suggestions.formula.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <datalist id="sug-developer">
            {vault.suggestions.developer.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <datalist id="sug-guard">
            {vault.suggestions.clipperGuard.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <datalist id="sug-products">
            {vault.suggestions.productsUsed.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              id="formula"
              label="Fórmula"
              placeholder="7.1 + 9.3, 40 g"
              list="sug-formula"
              value={record.formula}
              onChange={(v) => setRecord({ ...record, formula: v })}
            />
            <Field
              id="developer"
              label="Oxidante"
              placeholder="20 vol"
              list="sug-developer"
              value={record.developer}
              onChange={(v) => setRecord({ ...record, developer: v })}
            />
            <Field
              id="processingMinutes"
              label="Pausa (minutos)"
              placeholder="35"
              type="number"
              value={record.processingMinutes}
              onChange={(v) => setRecord({ ...record, processingMinutes: v })}
            />
            <Field
              id="clipperGuard"
              label="Lâmina / pente"
              placeholder="2 nas laterais, 4 no topo"
              list="sug-guard"
              value={record.clipperGuard}
              onChange={(v) => setRecord({ ...record, clipperGuard: v })}
            />
          </div>

          <Field
            id="productsUsed"
            label="Produtos"
            placeholder="Shampoo neutro, máscara de reconstrução"
            list="sug-products"
            value={record.productsUsed}
            onChange={(v) => setRecord({ ...record, productsUsed: v })}
          />

          <div>
            <label htmlFor="notes" className="block text-xs text-[var(--color-text-muted)] mb-1">
              Observações
            </label>
            <textarea
              id="notes"
              rows={2}
              value={record.notes}
              onChange={(e) => setRecord({ ...record, notes: e.target.value })}
              className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 text-sm resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={saveRecord}
              disabled={isPending}
              className="btn btn-primary btn-sm"
            >
              {isPending ? "Salvando…" : "Salvar ficha"}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Fichas anteriores</h2>
        </div>
        <div className="card-body">
          {vault.records.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="w-5 h-5" />}
              title="Nenhuma ficha ainda"
              description="É o que o profissional abre no retorno para repetir — ou corrigir — o que fez da última vez."
            />
          ) : (
            <div className="space-y-3">
              {vault.records.map((r) => (
                <div
                  key={r.id}
                  className="rounded-[var(--radius-control)] border border-[var(--color-border)] p-3"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {dateLabel(r.performedAt)}
                      {r.professionalName ? ` · ${r.professionalName}` : ""}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeRecord(r.id)}
                      disabled={isPending}
                      className="btn btn-secondary btn-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <Row label="Fórmula" value={r.formula} />
                    <Row label="Oxidante" value={r.developer} />
                    <Row
                      label="Pausa"
                      value={r.processingMinutes ? `${r.processingMinutes} min` : null}
                    />
                    <Row label="Lâmina / pente" value={r.clipperGuard} />
                    <Row label="Produtos" value={r.productsUsed} />
                    <Row label="Observações" value={r.notes} />
                  </dl>
                </div>
              ))}
            </div>
          )}
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
  list,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  list?: string;
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
        list={list}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className="text-[var(--color-text-muted)] shrink-0">{label}:</dt>
      <dd className="text-[var(--color-text-heading)] min-w-0">{value}</dd>
    </div>
  );
}
