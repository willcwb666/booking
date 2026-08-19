"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  grantBatchModuleLicensesAction,
  renewModuleLicenseAction,
  revokeModuleLicenseAction,
  type SystemModule,
  type ActiveCompanyLicenseRow,
} from "@/server/actions/admin-modules";
import { toast } from "@/lib/toast-service";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { IconAction, RowActions } from "@/components/ui/icon-action";
import {
  Tag,
  CheckCircle2,
  Building2,
  RotateCcw,
  Plus,
  Search,
  Check,
  Sparkles,
  Trash2,
  X,
  FileText,
} from "@/components/ui/icons";

// Removidos daqui `IconPencil` e `IconTrash`: eram SVGs escritos à mão nesta
// tela, nunca usados, e o traçado da lixeira estava malformado. O conjunto de
// ícones da aplicação já tem os dois.

type Company = { id: string; name: string; slug: string; businessType: string };
type Segment = { code: string; label: string };

type Props = {
  modules: SystemModule[];
  companies: Company[];
  segments: Segment[];
  activeLicenses: ActiveCompanyLicenseRow[];
};

export function AdminModulosClient({ modules, companies, segments, activeLicenses }: Props) {
  const [licensesList, setLicensesList] = useState<ActiveCompanyLicenseRow[]>(activeLicenses);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [isPending, startTransition] = useTransition();

  // PASSO 1: Estado de Seleção
  const [grantType, setGrantType] = useState<"INDIVIDUAL" | "GROUP">("INDIVIDUAL");
  const [companySearch, setCompanySearch] = useState("");
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [selectedSegmentCodes, setSelectedSegmentCodes] = useState<string[]>([]);

  // PASSO 2: Estado de Seleção de Módulos
  const [selectedModuleConfig, setSelectedModuleConfig] = useState<
    Record<string, { enabled: boolean; isTrial: boolean; trialDays: number }>
  >({});

  const fmtCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Filtro dinâmico de empresas no listbox com busca inteligente
  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(companySearch.toLowerCase()) ||
      c.slug.toLowerCase().includes(companySearch.toLowerCase())
  );

  function toggleCompanySelect(companyId: string) {
    if (selectedCompanyIds.includes(companyId)) {
      setSelectedCompanyIds(selectedCompanyIds.filter((id) => id !== companyId));
    } else {
      setSelectedCompanyIds([...selectedCompanyIds, companyId]);
    }
  }

  function toggleSegmentSelect(segmentCode: string) {
    if (selectedSegmentCodes.includes(segmentCode)) {
      setSelectedSegmentCodes(selectedSegmentCodes.filter((code) => code !== segmentCode));
    } else {
      setSelectedSegmentCodes([...selectedSegmentCodes, segmentCode]);
    }
  }

  function toggleModuleSelect(moduleCode: string) {
    const current = selectedModuleConfig[moduleCode] || { enabled: false, isTrial: true, trialDays: 30 };
    setSelectedModuleConfig({
      ...selectedModuleConfig,
      [moduleCode]: { ...current, enabled: !current.enabled },
    });
  }

  function updateModuleTrial(moduleCode: string, isTrial: boolean, trialDays?: number) {
    const current = selectedModuleConfig[moduleCode] || { enabled: true, isTrial: true, trialDays: 30 };
    setSelectedModuleConfig({
      ...selectedModuleConfig,
      [moduleCode]: {
        ...current,
        isTrial,
        trialDays: trialDays !== undefined ? trialDays : current.trialDays,
      },
    });
  }

  // Resolve empresas alvo finais com base na seleção
  const getTargetCompanyIds = (): string[] => {
    if (grantType === "INDIVIDUAL") {
      return selectedCompanyIds;
    } else {
      return companies
        .filter((c) => selectedSegmentCodes.includes(c.businessType))
        .map((c) => c.id);
    }
  };

  const getSelectedModulesArray = () => {
    return Object.entries(selectedModuleConfig)
      .filter(([_, cfg]) => cfg.enabled)
      .map(([code, cfg]) => ({
        moduleCode: code,
        isTrial: cfg.isTrial,
        trialDays: cfg.trialDays,
      }));
  };

  function handleSaveWizard() {
    const targetIds = getTargetCompanyIds();
    const modulesToGrant = getSelectedModulesArray();

    if (!targetIds.length) {
      toast.error("Atenção", "Nenhuma empresa alvo selecionada.");
      return;
    }
    if (!modulesToGrant.length) {
      toast.error("Atenção", "Selecione ao menos um módulo no Passo 2.");
      return;
    }

    startTransition(async () => {
      const res = await grantBatchModuleLicensesAction(targetIds, modulesToGrant);
      if (res.success) {
        toast.success("Módulos Liberados!", res.message);
        setIsWizardOpen(false);
        setWizardStep(1);
        setSelectedCompanyIds([]);
        setSelectedSegmentCodes([]);
        setSelectedModuleConfig({});
        window.location.reload();
      } else {
        toast.error("Erro", res.error || "Falha ao liberar módulos.");
      }
    });
  }

  function handleRenew(companyId: string, moduleCode: string) {
    startTransition(async () => {
      const res = await renewModuleLicenseAction(companyId, moduleCode, 30);
      if (res.success) {
        toast.success("Renovado!", res.message);
        window.location.reload();
      } else {
        toast.error("Erro", res.error || "Falha ao renovar.");
      }
    });
  }

  function handleRevoke(companyId: string, moduleCode: string) {
    if (!confirm("Tem certeza que deseja revogar a licença deste módulo para esta empresa?")) return;
    startTransition(async () => {
      const res = await revokeModuleLicenseAction(companyId, moduleCode);
      if (res.success) {
        toast.success("Revogado", res.message);
        setLicensesList(licensesList.filter((l) => !(l.companyId === companyId && l.moduleCode === moduleCode)));
      } else {
        toast.error("Erro", res.error || "Falha ao revogar.");
      }
    });
  }

  return (
    <div className="page-content space-y-8 pb-32">
      {/* Header com Botão + Liberar Módulo(s) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-xs">
            <Tag className="w-4 h-4" />
            <span>Super Admin Marketplace</span>
          </div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-heading)] tracking-tight mt-1">
            Gestão de Módulos Extras & Licenciamento
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Gerencie módulos ativos por empresa e libere novos acessos individuais ou em lote por segmento.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Única porta de entrada do catálogo de add-ons — sem este link a
              página /admin/modulos/catalogo fica órfã. */}
          <Link href="/admin/modulos/catalogo" className="btn btn-outline btn-sm">
            <FileText className="w-3.5 h-3.5" />
            <span>Catálogo de add-ons</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              setWizardStep(1);
              setIsWizardOpen(true);
            }}
            className="btn btn-primary btn-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Liberar módulos</span>
          </button>
        </div>
      </div>

      {/* TABELA DE MÓDULOS ATIVOS POR EMPRESA (Com Botões Renovação e Revogação) */}
      <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)]/80 p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <h2 className="text-base font-semibold text-[var(--color-text-heading)]">Módulos Ativos por Empresa</h2>
          <span className="text-xs text-[var(--color-text-muted)] font-medium">
            Total de {licensesList.length} licença(s) concedida(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] font-bold border-b border-[var(--color-border)]/80">
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Módulo Liberado</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Validade / Expiração</th>
                <th className="px-4 py-3 text-center">Data Concessão</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] font-medium">
              {licensesList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[var(--color-text-subtle)]">
                    Nenhum módulo ativo no momento. Clique no botão acima para liberar módulos!
                  </td>
                </tr>
              ) : (
                licensesList.map((lic) => (
                  <tr key={lic.id} className="hover:bg-[var(--color-bg-subtle)]/60 transition-colors">
                    <td className="px-4 py-3 font-bold text-[var(--color-text-heading)]">{lic.companyName}</td>
                    <td className="px-4 py-3 font-semibold text-[var(--color-primary)]">{lic.moduleName}</td>
                    <td className="px-4 py-3 text-center">
                      {lic.status === "TRIAL" ? (
                        <span className="bg-[var(--color-warning-light)] text-[var(--color-warning)] text-[length:var(--text-2xs)] font-semibold uppercase px-2.5 py-1 rounded-full">
                          Degustação
                        </span>
                      ) : (
                        <span className="bg-[var(--color-success-light)] text-[var(--color-success)] text-[length:var(--text-2xs)] font-semibold uppercase px-2.5 py-1 rounded-full">
                          Definitivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-[var(--color-text-muted)] font-mono">
                      {lic.expiresAt || "Vínculo Vitalício"}
                    </td>
                    <td className="px-4 py-3 text-center text-[var(--color-text-muted)]">{lic.grantedAt}</td>
                    <td className="px-4 py-3">
                      <RowActions>
                        {lic.status === "TRIAL" && (
                          <IconAction
                            intent="refresh"
                            label={`Renovar ${lic.moduleName} de ${lic.companyName} por mais 30 dias`}
                            onClick={() => handleRenew(lic.companyId, lic.moduleCode)}
                            pending={isPending}
                          />
                        )}
                        <IconAction
                          intent="revoke"
                          label={`Revogar ${lic.moduleName} de ${lic.companyName}`}
                          onClick={() => handleRevoke(lic.companyId, lic.moduleCode)}
                          pending={isPending}
                        />
                      </RowActions>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL MULTI-PASSO DE LIBERAÇÃO DE MÓDULOS */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 bg-[var(--color-navy)]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] shadow-2xl max-w-3xl w-full p-6 sm:p-8 space-y-6 animate-fadeIn">
            {/* Header Wizard */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <div>
                <span className="text-[length:var(--text-2xs)] font-semibold text-[var(--color-primary)] uppercase tracking-wider block">
                  Passo {wizardStep} de 3
                </span>
                <h2 className="text-lg font-semibold text-[var(--color-text-heading)]">
                  {wizardStep === 1
                    ? "Passo 1: Seleção de Alvo (Individual ou por Segmento)"
                    : wizardStep === 2
                    ? "Passo 2: Seleção de Módulos & Tipo de Ativação"
                    : "Passo 3: Resumo & Confirmação Final"}
                </h2>
              </div>
              <button type="button" onClick={() => setIsWizardOpen(false)} aria-label="Fechar" title="Fechar" className="icon-action"><X className="w-4 h-4" /></button>
            </div>

            {/* PASSO 1: SELEÇÃO DE EMPRESA(S) OU SEGMENTO(S) */}
            {wizardStep === 1 && (
              <div className="space-y-5">
                {/* Selector de Tipo */}
                <div className="flex gap-4 p-1.5 bg-[var(--color-bg-muted)] rounded-[var(--radius-panel)] border border-[var(--color-border)]">
                  <button
                    type="button"
                    onClick={() => setGrantType("INDIVIDUAL")}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-[var(--radius-card)] transition-all ${
                      grantType === "INDIVIDUAL" ? "bg-[var(--color-bg)] text-[var(--color-primary)] shadow-2xs font-semibold" : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    Empresas Individuais
                  </button>
                  <button
                    type="button"
                    onClick={() => setGrantType("GROUP")}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-[var(--radius-card)] transition-all ${
                      grantType === "GROUP" ? "bg-[var(--color-bg)] text-[var(--color-primary)] shadow-2xs font-semibold" : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    Em Grupo (Por Segmento)
                  </button>
                </div>

                {grantType === "INDIVIDUAL" ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-[var(--color-text-subtle)] absolute left-3.5 top-3" />
                      <input
                        type="text"
                        placeholder="Digite o nome ou pedaço do nome da empresa para buscar..."
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        className="w-full border border-[var(--color-border)] rounded-[var(--radius-card)] pl-10 pr-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    </div>

                    <div className="max-h-60 overflow-y-auto border border-[var(--color-border)] rounded-[var(--radius-panel)] p-2 space-y-1 divide-y divide-[var(--color-border)]">
                      {filteredCompanies.map((c) => {
                        const isChecked = selectedCompanyIds.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className={`flex items-center justify-between p-2.5 rounded-[var(--radius-card)] text-xs font-bold cursor-pointer transition-colors ${
                              isChecked ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]" : "hover:bg-[var(--color-bg-subtle)] text-[var(--color-text)]"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleCompanySelect(c.id)}
                                className="w-4 h-4 text-[var(--color-primary)] rounded"
                              />
                              <span>{c.name}</span>
                              <span className="text-[length:var(--text-2xs)] font-mono text-[var(--color-text-subtle)]">({c.slug})</span>
                            </div>
                            <span className="text-[length:var(--text-2xs)] font-bold uppercase bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] px-2 py-0.5 rounded">
                              {c.businessType}
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)] font-bold">
                      {selectedCompanyIds.length} empresa(s) selecionada(s)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-[var(--color-text)] block">
                      Selecione 1 ou mais Segmentos de Mercado:
                    </span>
                    <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                      {segments.map((seg) => {
                        const isChecked = selectedSegmentCodes.includes(seg.code);
                        return (
                          <button
                            key={seg.code}
                            type="button"
                            onClick={() => toggleSegmentSelect(seg.code)}
                            className={`p-3 rounded-[var(--radius-panel)] border text-xs font-bold text-left flex items-center justify-between cursor-pointer transition-all ${
                              isChecked
                                ? "bg-[var(--color-primary-light)] border-[var(--color-primary)]/40 text-[var(--color-primary)] shadow-2xs"
                                : "bg-[var(--color-bg-subtle)] border-[var(--color-border)]/80 text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]"
                            }`}
                          >
                            <span>{seg.label}</span>
                            {isChecked && <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PASSO 2: SELEÇÃO DE MÓDULOS & DEGUSTAÇÃO */}
            {wizardStep === 2 && (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                <span className="text-xs font-bold text-[var(--color-text)] block mb-2">
                  Selecione os módulos a serem liberados e configure a modalidade:
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {modules.map((m) => {
                    const cfg = selectedModuleConfig[m.code] || { enabled: false, isTrial: true, trialDays: 30 };
                    return (
                      <div
                        key={m.id}
                        className={`p-4 rounded-[var(--radius-panel)] border transition-all text-xs space-y-3 ${
                          cfg.enabled
                            ? "bg-[var(--color-primary-light)]/40 border-[var(--color-primary)]/40 shadow-2xs"
                            : "bg-[var(--color-bg-subtle)]/60 border-[var(--color-border)]/80 opacity-70"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer font-semibold text-[var(--color-text-heading)]">
                            <input
                              type="checkbox"
                              checked={cfg.enabled}
                              onChange={() => toggleModuleSelect(m.code)}
                              className="w-4 h-4 text-[var(--color-primary)] rounded"
                            />
                            <span>{m.name}</span>
                          </label>
                        </div>

                        {cfg.enabled && (
                          <div className="pt-2 border-t border-[var(--color-primary)]/20 space-y-2 animate-fadeIn">
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-1 cursor-pointer font-bold text-[var(--color-text)] text-[length:var(--text-xs)]">
                                <input
                                  type="radio"
                                  name={`type_${m.code}`}
                                  checked={!cfg.isTrial}
                                  onChange={() => updateModuleTrial(m.code, false)}
                                  className="text-[var(--color-primary)]"
                                />
                                <span>Definitivo</span>
                              </label>

                              <label className="flex items-center gap-1 cursor-pointer font-bold text-[var(--color-text)] text-[length:var(--text-xs)]">
                                <input
                                  type="radio"
                                  name={`type_${m.code}`}
                                  checked={cfg.isTrial}
                                  onChange={() => updateModuleTrial(m.code, true)}
                                  className="text-[var(--color-primary)]"
                                />
                                <span>Degustação (Trial)</span>
                              </label>
                            </div>

                            {cfg.isTrial && (
                              <div className="flex items-center gap-2 pt-1">
                                <span className="text-[length:var(--text-xs)] font-bold text-[var(--color-text-muted)]">Dias de teste:</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={cfg.trialDays}
                                  onChange={(e) =>
                                    updateModuleTrial(m.code, true, parseInt(e.target.value) || 30)
                                  }
                                  className="w-20 border border-[var(--color-border)] bg-[var(--color-bg)] rounded-lg px-2 py-1 text-xs font-bold text-[var(--color-text-heading)]"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PASSO 3: RESUMO & CONFIRMAÇÃO FINAL */}
            {wizardStep === 3 && (
              <div className="space-y-4 text-xs">
                <div className="bg-[var(--color-bg-subtle)] p-5 rounded-[var(--radius-panel)] border border-[var(--color-border)] space-y-3">
                  <div>
                    <span className="text-[var(--color-text-subtle)] font-bold uppercase text-[length:var(--text-2xs)] block">Alvo Selecionado</span>
                    <p className="font-semibold text-[var(--color-text-heading)]">
                      {grantType === "INDIVIDUAL"
                        ? `${selectedCompanyIds.length} empresa(s) individual(is)`
                        : `${selectedSegmentCodes.length} segmento(s) de mercado`}
                    </p>
                  </div>

                  <div>
                    <span className="text-[var(--color-text-subtle)] font-bold uppercase text-[length:var(--text-2xs)] block">Módulos a Liberar</span>
                    <ul className="list-disc pl-4 space-y-1 font-semibold text-[var(--color-primary)] mt-1">
                      {getSelectedModulesArray().map((m) => (
                        <li key={m.moduleCode}>
                          {m.moduleCode.replace(/_/g, " ").toUpperCase()} —{" "}
                          {m.isTrial ? `Degustação por ${m.trialDays} dias` : "Ativação Definitiva"}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-[var(--color-warning-light)] rounded-[var(--radius-card)] border border-[var(--color-warning-border)] text-[var(--color-warning)] font-medium text-[length:var(--text-xs)]">
                    Ao clicar em confirmar, os módulos serão liberados e as notificações no <strong>Sistema, E-mail, SMS e WhatsApp</strong> serão enviadas automaticamente.
                  </div>
                </div>
              </div>
            )}

            {/* Navegação entre Passos */}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
              {wizardStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep((wizardStep - 1) as any)}
                  className="px-4 py-2 bg-[var(--color-bg-muted)] text-[var(--color-text)] font-bold text-xs rounded-[var(--radius-card)]"
                >
                  Voltar
                </button>
              ) : <div />}

              {wizardStep < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (wizardStep === 1 && !getTargetCompanyIds().length) {
                      toast.error("Atenção", "Selecione ao menos 1 empresa ou segmento.");
                      return;
                    }
                    if (wizardStep === 2 && !getSelectedModulesArray().length) {
                      toast.error("Atenção", "Selecione ao menos 1 módulo.");
                      return;
                    }
                    setWizardStep((wizardStep + 1) as any);
                  }}
                  className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold text-xs rounded-[var(--radius-card)] shadow-xs"
                >
                  Avançar para Passo {wizardStep + 1}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveWizard}
                  disabled={isPending}
                  className="px-6 py-2.5 bg-[var(--color-success)] hover:bg-[var(--color-success)] text-white font-semibold text-xs rounded-[var(--radius-card)] shadow-md cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isPending ? "Liberando..." : "Confirmar & Salvar Liberação"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
