"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/lib/toast-service";
import {
  saveUserProfileAction,
  deleteUserProfileAction,
  type UserProfileInput,
} from "@/server/actions/user-profile";
import type { CrossCompanyBooking } from "@/server/queries/bookings";
import { User, Building2, Calendar, AlertTriangle } from "@/components/ui/icons";

type Props = {
  email: string;
  emailVerified: boolean;
  profile: Required<{ [K in keyof UserProfileInput]: string }> | null;
  bookings: CrossCompanyBooking[];
  companies: { name: string; slug: string; role: string }[];
};

const EMPTY = {
  firstName: "",
  lastName: "",
  phone: "",
  address: "",
  aptNo: "",
  city: "",
  zip: "",
};

const FIELDS: { key: keyof typeof EMPTY; label: string; span?: boolean }[] = [
  { key: "firstName", label: "Nome" },
  { key: "lastName", label: "Sobrenome" },
  { key: "phone", label: "Telefone" },
  { key: "city", label: "Cidade" },
  { key: "address", label: "Endereço", span: true },
  { key: "aptNo", label: "Complemento" },
  { key: "zip", label: "CEP" },
];

export function MinhaContaClient({
  email,
  emailVerified,
  profile,
  bookings,
  companies,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({ ...EMPTY, ...(profile ?? {}) });

  const save = () => {
    startTransition(async () => {
      const res = await saveUserProfileAction(form);
      if (!res.success) {
        toast.error("Não salvo", res.error);
        return;
      }
      toast.success("Salvo", "Seus próximos agendamentos já vêm preenchidos.");
      router.refresh();
    });
  };

  const clear = () => {
    startTransition(async () => {
      const res = await deleteUserProfileAction();
      if (!res.success) {
        toast.error("Erro", res.error);
        return;
      }
      setForm(EMPTY);
      toast.success("Apagado", "Seus dados foram removidos do perfil.");
      router.refresh();
    });
  };

  return (
    <div className="page-content space-y-6">
      <PageHeader
        category="Pessoal"
        categoryIcon={<User className="w-3.5 h-3.5" />}
        title="Minha conta"
        description={email}
      />

      {companies.length > 0 && (
        /* Alternador de papel. O Paulinho é dono da barbearia dele e cliente da
           oficina do Seu Zé — a mesma conta, dois modos. */
        <div className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ fontSize: "var(--text-md)" }}>
              Empresas que você administra
            </h2>
          </div>
          <div className="card-body grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {companies.map((c) => (
              <Link
                key={c.slug}
                href={`/${c.slug}/dashboard`}
                className="p-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] transition-colors hover:border-[var(--color-border-strong)] block"
              >
                <span className="w-8 h-8 rounded-[var(--radius-control)] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-muted)] grid place-items-center mb-2">
                  <Building2 className="w-4 h-4" />
                </span>
                <span className="block font-medium text-[var(--color-text-heading)]">
                  {c.name}
                </span>
                <span
                  className="block text-[var(--color-text-muted)]"
                  style={{ fontSize: "var(--text-2xs)" }}
                >
                  Abrir painel
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="min-w-0">
            <h2 className="card-title">Meus dados</h2>
            <p
              className="text-[var(--color-text-muted)]"
              style={{ fontSize: "var(--text-xs)" }}
            >
              Preenchem seus formulários de agendamento em qualquer empresa
            </p>
          </div>
        </div>
        <div className="card-body space-y-4">
          {/* Onde os dados vivem, dito ao usuário. É a diferença entre "eles
              compartilham meus dados" e "eu guardei meus dados" — e é a
              diferença que torna a funcionalidade legítima. */}
          <p
            className="text-[var(--color-text-muted)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 leading-relaxed"
            style={{ fontSize: "var(--text-2xs)" }}
          >
            Estes dados são seus e ficam na sua conta, não com as empresas. Cada
            estabelecimento só recebe o que você enviar ao agendar com ele — e o
            histórico em um não aparece para o outro.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FIELDS.map(({ key, label, span }) => (
              <div key={key} className={span ? "sm:col-span-2" : undefined}>
                <label
                  htmlFor={key}
                  className="block text-xs font-bold text-[var(--color-text)] mb-1"
                >
                  {label}
                </label>
                <input
                  id={key}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="input"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={clear}
              disabled={isPending || !profile}
              className="btn btn-ghost btn-sm"
            >
              Apagar meus dados
            </button>
            <button type="button" onClick={save} disabled={isPending} className="btn btn-primary btn-sm">
              {isPending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="min-w-0">
            <h2 className="card-title">Meus agendamentos</h2>
            <p
              className="text-[var(--color-text-muted)]"
              style={{ fontSize: "var(--text-xs)" }}
            >
              Em todas as empresas onde você já agendou
            </p>
          </div>
        </div>

        {!emailVerified && (
          <div className="card-body pb-0">
            {/* Sem e-mail verificado, listar por e-mail permitiria ver a agenda
                de outra pessoa só se cadastrando com o endereço dela. */}
            <p className="flex items-start gap-2 text-xs text-[var(--color-warning)] bg-[var(--color-warning-light)] border border-[var(--color-warning-border)] rounded-[var(--radius-control)] p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
              <span>
                Confirme seu e-mail para ver também os agendamentos feitos sem
                login. Por enquanto aparecem só os que você fez logado.
              </span>
            </p>
          </div>
        )}

        {bookings.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-5 h-5" />}
            title="Nenhum agendamento ainda"
            description="Quando você agendar em qualquer empresa da plataforma, aparece aqui."
          />
        ) : (
          <div className="table-container" style={{ border: 0, boxShadow: "none" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Serviço</th>
                  <th>Quando</th>
                  <th>Situação</th>
                  <th className="text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td className="font-medium text-[var(--color-text-heading)]">
                      {b.companyName}
                    </td>
                    <td className="text-[var(--color-text-muted)]">
                      {b.serviceName}
                      {b.professionalName && (
                        <span
                          className="block text-[var(--color-text-subtle)]"
                          style={{ fontSize: "var(--text-2xs)" }}
                        >
                          {b.professionalName}
                        </span>
                      )}
                    </td>
                    <td className="text-[var(--color-text-muted)] whitespace-nowrap">
                      {b.scheduledDate.split("-").reverse().join("/")} · {b.scheduledStartTime}
                    </td>
                    <td>
                      <StatusBadge>{b.status}</StatusBadge>
                    </td>
                    <td data-type="number">
                      {/* Cada empresa na moeda dela — somar não faria sentido,
                          e é a mesma razão pela qual o painel da plataforma
                          separa receita por mercado. */}
                      {formatMoney(b.total, b.currency, b.locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
