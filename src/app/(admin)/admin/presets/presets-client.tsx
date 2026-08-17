"use client";

import { useState, useEffect, useTransition } from "react";
import {
  createPresetAction,
  updatePresetAction,
  togglePresetActiveAction,
  deletePresetAction,
} from "@/server/actions/admin-presets";
import { toast } from "@/lib/toast-service";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { StatusBadge } from "@/components/ui/status-badge";
import { Edit2, Trash2 } from "@/components/ui/icons";

type PresetItem = {
  id: string;
  businessType: string;
  title: string;
  description: string | null;
  defaultPrice: any;
  durationMin: number;
  isExtra: boolean;
  parentTitle: string | null;
  displayOrder: number;
  isActive: boolean;
};

const BUSINESS_LABELS: Record<string, string> = {
  MECHANIC: "🛠️ Oficina Mecânica",
  BARBER: "💈 Barbearia",
  HOME_CLEANING: "🧹 Limpeza Residencial",
  PET_GROOMER: "🐶 Pet Shop & Groomer",
  HAIR_SALON: "💅 Salão de Beleza & Estética",
  CAR_WASH: "🚗 Lava-Rápido",
  LAWN_CARE: "🌿 Jardinagem",
  POOL_CLEANING: "🏊 Limpeza de Piscinas",
  PHOTOGRAPHER: "📷 Fotografia",
  OTHER: "⚙️ Outros Serviços",
};

export function PresetsClient({ initialPresets }: { initialPresets: PresetItem[] }) {
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<PresetItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [segmentsMap, setSegmentsMap] = useState<Record<string, string>>(BUSINESS_LABELS);

  useEffect(() => {
    async function loadSegments() {
      try {
        const res = await fetch("/api/segments");
        if (res.ok) {
          const data = await res.json();
          if (data.segments && data.segments.length > 0) {
            const map: Record<string, string> = {};
            data.segments.forEach((s: any) => {
              map[s.code] = s.label;
            });
            setSegmentsMap(map);
          }
        }
      } catch {
        // fallback
      }
    }
    loadSegments();
  }, []);

  const filteredPresets = selectedType === "ALL"
    ? initialPresets
    : initialPresets.filter((p) => p.businessType === selectedType);

  function handleOpenCreate() {
    setEditingPreset(null);
    setErrorMsg(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(preset: PresetItem) {
    setEditingPreset(preset);
    setErrorMsg(null);
    setIsModalOpen(true);
  }

  function handleToggle(presetId: string, currentState: boolean) {
    startTransition(async () => {
      const res = await togglePresetActiveAction(presetId, currentState);
      if (res.success) {
        toast.warning("Status do Preset", currentState ? "Preset desativado do onboarding." : "Preset ativado no onboarding.");
      } else {
        toast.error("Erro", "Falha ao alterar status do preset.");
      }
    });
  }

  function handleDelete(presetId: string) {
    if (!confirm("Tem certeza que deseja excluir este preset de serviço?")) return;
    startTransition(async () => {
      const res = await deletePresetAction(presetId);
      if (res.success) {
        toast.success("Preset Excluído", "O modelo de serviço foi removido.");
      } else {
        toast.error("Erro na Exclusão", "Não foi possível excluir o preset.");
      }
    });
  }

  async function handleSubmitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const action = editingPreset ? updatePresetAction : createPresetAction;
      const res = await action(null, formData);

      if (!res.success) {
        const firstErr = res.errors ? Object.values(res.errors)[0]?.[0] : "Erro ao salvar";
        toast.error("Erro ao Salvar", firstErr || "Erro ao salvar preset");
        setErrorMsg(firstErr || "Erro ao salvar");
      } else {
        toast.success(
          editingPreset ? "Preset Atualizado" : "Novo Preset Salvo",
          editingPreset ? "As alterações do template foram salvas." : "O modelo já estará disponível para novas empresas!"
        );
        setIsModalOpen(false);
      }
    });
  }

  return (
    <div className="page-content space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--color-text-heading)] tracking-tight">Templates de Serviços por Nicho</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Gerencie os modelos de serviços e extras pré-configurados que os novos clientes verão no Onboarding de 1 Clique.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
        >
          + Novo Preset de Serviço
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-[var(--color-border)]">
        <button
          onClick={() => setSelectedType("ALL")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedType === "ALL"
              ? "bg-[var(--color-primary)] text-white shadow-xs"
              : "bg-white text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] border border-[var(--color-border)]"
          }`}
        >
          Todos ({initialPresets.length})
        </button>
        {Object.entries(segmentsMap).map(([code, label]) => {
          const count = initialPresets.filter((p) => p.businessType === code).length;
          return (
            <button
              key={code}
              onClick={() => setSelectedType(code)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                selectedType === code
                  ? "bg-[var(--color-navy)] text-white shadow-sm"
                  : "bg-white text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] border border-[var(--color-border)]"
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Table / List */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="py-3.5 px-5">Segmento</th>
                <th className="py-3.5 px-5">Serviço / Extra</th>
                <th className="py-3.5 px-5">Preço Padrão</th>
                <th className="py-3.5 px-5">Duração</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] text-sm">
              {filteredPresets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[var(--color-text-subtle)]">
                    Nenhum preset cadastrado para este segmento.
                  </td>
                </tr>
              ) : (
                filteredPresets.map((preset) => (
                  <tr key={preset.id} className="hover:bg-[var(--color-bg-subtle)]/80 transition-colors">
                    <td className="py-4 px-5 font-semibold text-[var(--color-text-heading)] text-xs">
                      {segmentsMap[preset.businessType] || preset.businessType}
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        {preset.isExtra ? (
                          <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded uppercase">
                            EXTRA
                          </span>
                        ) : (
                          <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded uppercase">
                            PRINCIPAL
                          </span>
                        )}
                        <span className="font-bold text-[var(--color-text-heading)]">{preset.title}</span>
                      </div>
                      {preset.description && (
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{preset.description}</p>
                      )}
                      {preset.parentTitle && (
                        <p className="text-[11px] text-purple-600 font-medium mt-0.5">
                          Vencimento a: {preset.parentTitle}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-5 font-bold text-[var(--color-text-heading)]">
                      R$ {Number(preset.defaultPrice).toFixed(2)}
                    </td>
                    <td className="py-4 px-5 text-[var(--color-text-muted)] font-medium">
                      {preset.durationMin} min
                    </td>
                    <td className="py-4 px-5">
                      <button
                        onClick={() => handleToggle(preset.id, preset.isActive)}
                        disabled={isPending}
                        className="cursor-pointer"
                      >
                        <StatusBadge
                          variant={preset.isActive ? "success" : "neutral"}
                          tooltip={preset.isActive ? "Clique para desativar preset" : "Clique para ativar preset"}
                        >
                          {preset.isActive ? "Ativo" : "Inativo"}
                        </StatusBadge>
                      </button>
                    </td>
                    <td className="py-4 px-5 text-right space-x-2">
                      <ActionTooltip label="Editar Preset">
                        <button
                          onClick={() => handleOpenEdit(preset)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center shadow-2xs"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </ActionTooltip>
                      <ActionTooltip label="Excluir Preset">
                        <button
                          onClick={() => handleDelete(preset.id)}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center shadow-2xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </ActionTooltip>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Modal (Criar/Editar) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-[var(--color-border)] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <h3 className="text-lg font-bold text-[var(--color-text-heading)]">
                {editingPreset ? "Editar Preset de Serviço" : "Novo Preset de Serviço"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {editingPreset && <input type="hidden" name="presetId" value={editingPreset.id} />}

              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] uppercase mb-1">
                  Segmento de Negócio
                </label>
                <select
                  name="businessType"
                  defaultValue={editingPreset?.businessType || (selectedType !== "ALL" ? selectedType : "MECHANIC")}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  {Object.entries(segmentsMap).map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] uppercase mb-1">
                  Título do Serviço
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={editingPreset?.title || ""}
                  placeholder="Ex: Revisão Geral 10.000km"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] uppercase mb-1">
                  Descrição (Opcional)
                </label>
                <input
                  type="text"
                  name="description"
                  defaultValue={editingPreset?.description || ""}
                  placeholder="Ex: Verificação de 30 itens e fluidos"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text)] uppercase mb-1">
                    Preço Padrão (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="defaultPrice"
                    required
                    defaultValue={editingPreset ? Number(editingPreset.defaultPrice) : 50}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text)] uppercase mb-1">
                    Duração (Minutos)
                  </label>
                  <input
                    type="number"
                    name="durationMin"
                    required
                    defaultValue={editingPreset?.durationMin || 30}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isExtra"
                    defaultChecked={editingPreset?.isExtra || false}
                    className="w-4 h-4 rounded text-[var(--color-text-heading)] focus:ring-[var(--color-primary)]"
                  />
                  <span className="text-xs font-bold text-[var(--color-text-heading)]">
                    Este é um Serviço Extra (Upsell opcional)
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] uppercase mb-1">
                  Vincular ao Serviço Principal (Opcional)
                </label>
                <input
                  type="text"
                  name="parentTitle"
                  defaultValue={editingPreset?.parentTitle || ""}
                  placeholder="Ex: Revisão Geral 10.000km"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-[var(--color-navy)] hover:bg-[var(--color-navy-hover)] rounded-xl disabled:opacity-50"
                >
                  {isPending ? "Salvando..." : editingPreset ? "Salvar Alterações" : "Criar Preset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
