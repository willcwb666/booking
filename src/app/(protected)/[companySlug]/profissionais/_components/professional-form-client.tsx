"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createProfessionalAction,
  updateProfessionalAction,
  type FullProfessionalData,
} from "@/server/actions/professionals";
import type { CompanyRoleItem } from "@/server/actions/company-roles";
import { toast } from "@/lib/toast-service";
import {
  User,
  Scissors,
  DollarSign,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
} from "@/components/ui/icons";

type CompanyService = {
  id: string;
  name: string;
};

type Props = {
  companySlug: string;
  initialData?: FullProfessionalData | null;
  companyServices: CompanyService[];
  companyRoles: CompanyRoleItem[];
};

export function ProfessionalFormClient({
  companySlug,
  initialData,
  companyServices,
  companyRoles,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isEditing = Boolean(initialData?.id);

  let parsedServices: string[] = [];
  if (initialData?.servicesJson) {
    try {
      parsedServices = JSON.parse(initialData.servicesJson);
    } catch {
      // fallback
    }
  }

  const [selectedServices, setSelectedServices] = useState<string[]>(parsedServices);
  const [showOnLanding, setShowOnLanding] = useState<boolean>(initialData?.showOnLanding ?? true);

  function toggleService(serviceId: string) {
    if (selectedServices.includes(serviceId)) {
      setSelectedServices(selectedServices.filter((id) => id !== serviceId));
    } else {
      setSelectedServices([...selectedServices, serviceId]);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("companySlug", companySlug);
    fd.set("showOnLanding", String(showOnLanding));
    fd.set("servicesJson", JSON.stringify(selectedServices));

    if (isEditing && initialData) {
      fd.set("id", initialData.id);
    }

    startTransition(async () => {
      const res = isEditing
        ? await updateProfessionalAction(fd)
        : await createProfessionalAction(fd);

      if (res.success) {
        toast.success(
          isEditing ? "ATUALIZADO!" : "CADASTRADO!",
          isEditing ? "Dados do profissional atualizados com sucesso." : "Profissional cadastrado com sucesso."
        );
        router.push(`/${companySlug}/profissionais`);
        router.refresh();
      } else {
        const errorMsg = res.errors?.["_"]?.[0] || res.errors?.name?.[0] || "Preencha todos os campos obrigatórios.";
        toast.error("Atenção", errorMsg);
      }
    });
  }

  return (
    <div className="w-full max-w-5xl px-6 sm:px-10 py-8 text-left space-y-8 pb-32">
      {/* Header com botão Voltar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href={`/${companySlug}/profissionais`}
            className="inline-flex items-center gap-2 text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors mb-2 uppercase"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>VOLTAR PARA PROFISSIONAIS</span>
          </Link>
          <h1 className="text-2xl font-semibold text-[var(--color-text-heading)] tracking-tight">
            {isEditing ? `EDITAR CADASTRO: ${initialData?.name?.toUpperCase()}` : "NOVO CADASTRO DE PROFISSIONAL"}
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Preencha os dados completos do profissional, cargo/especialidade do segmento, comissões (Split) e serviços prestados.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* CARD 1: DADOS PESSOAIS & CONTATO */}
        <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-4">
            <div className="w-10 h-10 rounded-[var(--radius-card)] bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center shrink-0 border border-[var(--color-primary)]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text-heading)]">INFORMAÇÕES PESSOAIS & CONTATO</h2>
              <p className="text-xs text-[var(--color-text-muted)] font-medium">Dados de identificação e cargo no sistema.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block font-bold text-[var(--color-text)] mb-1.5">
                NOME COMPLETO <span className="text-[var(--color-danger)]">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                defaultValue={initialData?.name || ""}
                placeholder="Ex: Carlos Eduardo Silva"
                className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-4 py-3 font-medium focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            {/* LISTBOX DE CARGOS & ESPECIALIDADES */}
            <div>
              <label className="block font-bold text-[var(--color-text)] mb-1.5">CARGO / ESPECIALIDADE</label>
              <select
                name="roleTitle"
                defaultValue={initialData?.roleTitle || (companyRoles[0]?.name ?? "Profissional Especialista")}
                className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-4 py-3 font-bold cursor-pointer focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                {companyRoles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
                {!companyRoles.length && (
                  <option value="Profissional Especialista">Profissional Especialista</option>
                )}
              </select>
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text)] mb-1.5">CPF / CNPJ</label>
              <input
                type="text"
                name="documentNumber"
                defaultValue={initialData?.documentNumber || ""}
                placeholder="000.000.000-00"
                className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-4 py-3 font-medium focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text)] mb-1.5">E-MAIL DE CONTATO</label>
              <input
                type="email"
                name="email"
                defaultValue={initialData?.email || ""}
                placeholder="carlos@email.com"
                className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-4 py-3 font-medium focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text)] mb-1.5">TELEFONE / WHATSAPP</label>
              <input
                type="tel"
                name="phone"
                defaultValue={initialData?.phone || ""}
                placeholder="(11) 99999-9999"
                className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-4 py-3 font-medium focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text)] mb-1.5">INSTAGRAM (@USUARIO)</label>
              <input
                type="text"
                name="instagram"
                defaultValue={initialData?.instagram || ""}
                placeholder="@carlos_barber"
                className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-4 py-3 font-medium focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
        </div>

        {/* CARD 2: REGRAS DE COMISSÃO & REPASSE PIX (SPLIT) */}
        <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-4">
            <div className="w-10 h-10 rounded-[var(--radius-card)] bg-[var(--color-success-light)] text-[var(--color-success)] flex items-center justify-center shrink-0 border border-[var(--color-success-border)]">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text-heading)]">COMISSÕES & REPASSE PIX (SPLIT AUTOMÁTICO)</h2>
              <p className="text-xs text-[var(--color-text-muted)] font-medium">Percentuais de comissão e chave para repasses diretos.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block font-bold text-[var(--color-text)] mb-1.5">COMISSÃO SOBRE SERVIÇOS (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                name="commissionRate"
                defaultValue={initialData?.commissionRate ?? 50}
                placeholder="50.00"
                className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-4 py-3 font-bold focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              <span className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] mt-1 block">Porcentagem padrão sobre o valor dos atendimentos.</span>
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text)] mb-1.5">COMISSÃO SOBRE PRODUTOS (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                name="productCommissionRate"
                defaultValue={initialData?.productCommissionRate ?? 10}
                placeholder="10.00"
                className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-4 py-3 font-bold focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              <span className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] mt-1 block">Porcentagem sobre vendas de produtos adicionados na comanda.</span>
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text)] mb-1.5">TIPO DE CHAVE PIX</label>
              <select
                name="pixKeyType"
                defaultValue={initialData?.pixKeyType || "CPF"}
                className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-4 py-3 font-medium cursor-pointer focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="CPF">CPF / CNPJ</option>
                <option value="EMAIL">E-mail</option>
                <option value="PHONE">Telefone</option>
                <option value="RANDOM">Chave Aleatória (EVP)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text)] mb-1.5">CHAVE PIX PARA REPASSE</label>
              <input
                type="text"
                name="pixKey"
                defaultValue={initialData?.pixKey || ""}
                placeholder="Chave Pix para transferência automática"
                className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-4 py-3 font-medium focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
              />
            </div>
          </div>
        </div>

        {/* CARD 3: SERVIÇOS PRESTADOS PELO PROFISSIONAL (CHECKBOXES) */}
        <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-4">
            <div className="w-10 h-10 rounded-[var(--radius-card)] bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center shrink-0 border border-[var(--color-primary)]">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text-heading)]">SERVIÇOS PRESTADOS PELO PROFISSIONAL</h2>
              <p className="text-xs text-[var(--color-text-muted)] font-medium">Marque os serviços do catálogo (ou presets restaurados) que este profissional atende.</p>
            </div>
          </div>

          {companyServices.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--color-text-subtle)] bg-[var(--color-bg-subtle)] rounded-[var(--radius-card)] border border-[var(--color-border)]">
              Nenhum serviço cadastrado no catálogo da empresa ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {companyServices.map((srv) => {
                const isChecked = selectedServices.includes(srv.id);
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => toggleService(srv.id)}
                    className={`p-3.5 rounded-[var(--radius-card)] border text-xs font-bold text-left flex items-center justify-between cursor-pointer transition-all ${
                      isChecked
                        ? "bg-[var(--color-primary-light)] border-[var(--color-primary)] text-[var(--color-text-heading)] shadow-2xs"
                        : "bg-[var(--color-bg-subtle)] border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]"
                    }`}
                  >
                    <span>{srv.name}</span>
                    {isChecked && <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)] shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* CARD 4: BIOGRAFIA & VISIBILIDADE NA LANDING PAGE */}
        <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-4">
            <div className="w-10 h-10 rounded-[var(--radius-card)] bg-[var(--color-warning-light)] text-[var(--color-warning)] flex items-center justify-center shrink-0 border border-[var(--color-warning-border)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text-heading)]">PERFIL PÚBLICO & APRESENTAÇÃO</h2>
              <p className="text-xs text-[var(--color-text-muted)] font-medium">Biografia e exibição na capa pública de agendamento.</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-[var(--color-text)] mb-1.5">BIOGRAFIA / APRESENTAÇÃO</label>
              <textarea
                name="bio"
                rows={4}
                defaultValue={initialData?.bio || ""}
                placeholder="Especialista em cortes modernos, visagismo e barboterapia..."
                className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] p-4 font-medium focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <label className="flex items-center gap-3 p-4 bg-[var(--color-bg-subtle)] rounded-[var(--radius-card)] border border-[var(--color-border)] cursor-pointer">
              <input
                type="checkbox"
                checked={showOnLanding}
                onChange={(e) => setShowOnLanding(e.target.checked)}
                className="w-5 h-5 text-[var(--color-primary)] rounded cursor-pointer"
              />
              <div>
                <span className="font-semibold text-[var(--color-text-heading)] block">EXIBIR ESTE PROFISSIONAL NA LANDING PAGE PÚBLICA</span>
                <span className="text-[var(--text-2xs)] text-[var(--color-text-muted)]">Permite que os clientes escolham este profissional durante o agendamento online.</span>
              </div>
            </label>
          </div>
        </div>

        {/* BARRA FIXA DE SALVAMENTO COM BOTÕES UPPERCASE */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href={`/${companySlug}/profissionais`}
            className="px-6 py-3 bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted)] text-[var(--color-text)] font-semibold text-xs rounded-[var(--radius-control)] transition-all uppercase"
          >
            CANCELAR
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="px-8 py-3 bg-[#635bff] hover:bg-[#544dc9] text-white font-semibold text-xs rounded-[var(--radius-control)] shadow-md transition-all cursor-pointer inline-flex items-center gap-2 uppercase"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isPending ? "SALVANDO..." : isEditing ? "SALVAR ALTERAÇÕES" : "CONCLUIR CADASTRO"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
