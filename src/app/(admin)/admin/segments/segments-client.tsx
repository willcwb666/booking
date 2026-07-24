"use client";

import { useState, useTransition } from "react";
import {
  createSegmentAction,
  updateSegmentAction,
  toggleSegmentActiveAction,
  deleteSegmentAction,
} from "@/server/actions/admin-segments";
import { toast } from "@/lib/toast-service";

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
    <div className="w-full max-w-7xl px-6 sm:px-8 py-8 text-left space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Cadastro Dinâmico de Segmentos de Mercado</h1>
          <p className="text-xs text-slate-500 mt-1">
            Adicione, edite, habilite ou desabilite os nichos de negócios que estarão disponíveis para novos clientes no Onboarding.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#635bff] hover:bg-[#544dc9] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
        >
          + Criar Novo Segmento
        </button>
      </div>

      {/* Table / List */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-3.5 px-5">Código Interno</th>
                <th className="py-3.5 px-5">Nome do Segmento / Rótulo</th>
                <th className="py-3.5 px-5">Descrição</th>
                <th className="py-3.5 px-5">Ordem Exibição</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {initialSegments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    Nenhum segmento cadastrado.
                  </td>
                </tr>
              ) : (
                initialSegments.map((seg) => (
                  <tr key={seg.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-5 font-mono text-xs font-bold text-gray-500">
                      {seg.code}
                    </td>
                    <td className="py-4 px-5 font-bold text-gray-900">
                      {seg.label}
                    </td>
                    <td className="py-4 px-5 text-xs text-gray-500 max-w-xs truncate">
                      {seg.description || "—"}
                    </td>
                    <td className="py-4 px-5 font-bold text-gray-700 text-xs">
                      #{seg.displayOrder}
                    </td>
                    <td className="py-4 px-5">
                      <button
                        onClick={() => handleToggle(seg.id, seg.isActive)}
                        disabled={isPending}
                        className={`text-xs px-2.5 py-1 rounded-full font-bold transition-all ${
                          seg.isActive
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                      >
                        {seg.isActive ? "Habilitado" : "Desabilitado"}
                      </button>
                    </td>
                    <td className="py-4 px-5 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(seg)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(seg.id)}
                        className="text-xs font-semibold text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
                      >
                        Excluir
                      </button>
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
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {editingSegment ? "Editar Segmento" : "Novo Segmento de Negócio"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
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
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Código Interno (ID sem espaços)
                </label>
                <input
                  type="text"
                  name="code"
                  required
                  defaultValue={editingSegment?.code || ""}
                  placeholder="Ex: DENTIST ou MECHANIC"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Nome do Segmento (Com Emoji se desejar)
                </label>
                <input
                  type="text"
                  name="label"
                  required
                  defaultValue={editingSegment?.label || ""}
                  placeholder="Ex: 🦷 Clínica Odontológica"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Descrição Explicativa (Opcional)
                </label>
                <input
                  type="text"
                  name="description"
                  defaultValue={editingSegment?.description || ""}
                  placeholder="Ex: Para dentistas, ortodontistas e clínicas médicas"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Ordem de Exibição (Número)
                </label>
                <input
                  type="number"
                  name="displayOrder"
                  required
                  defaultValue={editingSegment?.displayOrder ?? 0}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-gray-900 hover:bg-gray-800 rounded-xl disabled:opacity-50"
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
