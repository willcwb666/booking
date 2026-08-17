"use client";

import { useState, useTransition } from "react";
import {
  createSegmentAction,
  updateSegmentAction,
  toggleSegmentActiveAction,
  deleteSegmentAction,
} from "@/server/actions/admin-segments";
import { toast } from "@/lib/toast-service";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { StatusBadge } from "@/components/ui/status-badge";
import { Edit2, Trash2 } from "@/components/ui/icons";

type SegmentItem = {
  id: string;
  code: string;
  label: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
};

export function SegmentsClient({ initialSegments }: { initialSegments: SegmentItem[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<SegmentItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleOpenCreate() {
    setEditingSegment(null);
    setErrorMsg(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(seg: SegmentItem) {
    setEditingSegment(seg);
    setErrorMsg(null);
    setIsModalOpen(true);
  }

  function handleToggle(segmentId: string, currentState: boolean) {
    startTransition(async () => {
      const res = await toggleSegmentActiveAction(segmentId, currentState);
      if (res.success) {
        toast.warning("Status Alterado", currentState ? "Segmento desativado do Onboarding." : "Segmento ativado no Onboarding.");
      } else {
        toast.error("Erro", "Falha ao alterar status do segmento.");
      }
    });
  }

  function handleDelete(segmentId: string) {
    if (!confirm("Tem certeza que deseja excluir este segmento de mercado?")) return;
    startTransition(async () => {
      const res = await deleteSegmentAction(segmentId);
      if (res.success) {
        toast.success("Segmento Removido", "O segmento de mercado foi excluído com sucesso.");
      } else {
        toast.error("Erro na Exclusão", "Não foi possível excluir o segmento.");
      }
    });
  }

  async function handleSubmitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const action = editingSegment ? updateSegmentAction : createSegmentAction;
      const res = await action(null, formData);

      if (!res.success) {
        const firstErr = res.errors ? Object.values(res.errors)[0]?.[0] : "Erro ao salvar";
        toast.error("Erro ao Salvar", firstErr || "Erro ao salvar segmento");
        setErrorMsg(firstErr || "Erro ao salvar segmento");
      } else {
        toast.success(
          editingSegment ? "Segmento Atualizado" : "Novo Segmento Criado",
          editingSegment ? "As alterações foram salvas." : "O segmento já está disponível no onboarding!"
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
          <h1 className="text-2xl font-extrabold text-[var(--color-text-heading)] tracking-tight">Cadastro Dinâmico de Segmentos de Mercado</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Adicione, edite, habilite ou desabilite os nichos de negócios que estarão disponíveis para novos clientes no Onboarding.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
        >
          + Criar Novo Segmento
        </button>
      </div>

      {/* Table / List */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="py-3.5 px-5">Código Interno</th>
                <th className="py-3.5 px-5">Nome do Segmento / Rótulo</th>
                <th className="py-3.5 px-5">Descrição</th>
                <th className="py-3.5 px-5">Ordem Exibição</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] text-sm">
              {initialSegments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[var(--color-text-subtle)]">
                    Nenhum segmento cadastrado.
                  </td>
                </tr>
              ) : (
                initialSegments.map((seg) => (
                  <tr key={seg.id} className="hover:bg-[var(--color-bg-subtle)]/80 transition-colors">
                    <td className="py-4 px-5 font-mono text-xs font-bold text-[var(--color-text-muted)]">
                      {seg.code}
                    </td>
                    <td className="py-4 px-5 font-bold text-[var(--color-text-heading)]">
                      {seg.label}
                    </td>
                    <td className="py-4 px-5 text-xs text-[var(--color-text-muted)] max-w-xs truncate">
                      {seg.description || "—"}
                    </td>
                    <td className="py-4 px-5 font-bold text-[var(--color-text)] text-xs">
                      #{seg.displayOrder}
                    </td>
                    <td className="py-4 px-5">
                      <button
                        onClick={() => handleToggle(seg.id, seg.isActive)}
                        disabled={isPending}
                        className="cursor-pointer"
                      >
                        <StatusBadge
                          variant={seg.isActive ? "success" : "neutral"}
                          tooltip={seg.isActive ? "Clique para desativar segmento" : "Clique para ativar segmento"}
                        >
                          {seg.isActive ? "Ativo" : "Inativo"}
                        </StatusBadge>
                      </button>
                    </td>
                    <td className="py-4 px-5 text-right space-x-2">
                      <ActionTooltip label="Editar Segmento">
                        <button
                          onClick={() => handleOpenEdit(seg)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center shadow-2xs"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </ActionTooltip>
                      <ActionTooltip label="Excluir Segmento">
                        <button
                          onClick={() => handleDelete(seg.id)}
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

      {/* Modal (Criar / Editar Segmento) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-[var(--color-border)] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <h3 className="text-lg font-bold text-[var(--color-text-heading)]">
                {editingSegment ? "Editar Segmento" : "Novo Segmento de Negócio"}
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
              {editingSegment && <input type="hidden" name="segmentId" value={editingSegment.id} />}

              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] uppercase mb-1">
                  Código Interno (ID sem espaços)
                </label>
                <input
                  type="text"
                  name="code"
                  required
                  defaultValue={editingSegment?.code || ""}
                  placeholder="Ex: DENTIST ou MECHANIC"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] text-sm font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] uppercase mb-1">
                  Nome do Segmento (Com Emoji se desejar)
                </label>
                <input
                  type="text"
                  name="label"
                  required
                  defaultValue={editingSegment?.label || ""}
                  placeholder="Ex: 🦷 Clínica Odontológica"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] uppercase mb-1">
                  Descrição Explicativa (Opcional)
                </label>
                <input
                  type="text"
                  name="description"
                  defaultValue={editingSegment?.description || ""}
                  placeholder="Ex: Para dentistas, ortodontistas e clínicas médicas"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] uppercase mb-1">
                  Ordem de Exibição (Número)
                </label>
                <input
                  type="number"
                  name="displayOrder"
                  required
                  defaultValue={editingSegment?.displayOrder ?? 0}
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
                  {isPending ? "Salvando..." : editingSegment ? "Salvar Alterações" : "Criar Segmento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
