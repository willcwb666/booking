"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createProfessionalAction,
  updateProfessionalAction,
  deleteProfessionalAction,
} from "@/server/actions/professionals";
import type { ActionResult } from "@/types";

type Professional = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
};

type DialogState =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; item: Professional };

type Props = {
  companySlug: string;
  professionals: Professional[];
  limit: number | null;
};

function FieldError({
  errors,
  field,
}: {
  errors: Record<string, string[]> | null;
  field: string;
}) {
  const msgs = errors?.[field];
  if (!msgs?.length) return null;
  return (
    <p className="text-xs text-red-600 mt-1" role="alert">
      {msgs[0]}
    </p>
  );
}

function GlobalError({ errors }: { errors: Record<string, string[]> | null }) {
  const msgs = errors?.["_"];
  if (!msgs?.length) return null;
  return (
    <p
      className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
      role="alert"
    >
      {msgs[0]}
    </p>
  );
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`Foto de ${name}`}
        className="w-8 h-8 rounded-full object-cover"
      />
    );
  }
  return (
    <div
      className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0"
      aria-hidden="true"
    >
      <span className="text-xs font-semibold text-gray-500">
        {name[0].toUpperCase()}
      </span>
    </div>
  );
}

export function ProfissionaisClient({ companySlug, professionals, limit }: Props) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const atLimit = limit !== null && professionals.length >= limit;

  function openDialog(state: DialogState) {
    setDialog(state);
    setFieldErrors(null);
    requestAnimationFrame(() => dialogRef.current?.showModal());
  }

  function closeDialog() {
    dialogRef.current?.close();
    setDialog({ type: "none" });
    setFieldErrors(null);
  }

  function handleAction(
    action: (fd: FormData) => Promise<ActionResult>,
    formData: FormData
  ) {
    startTransition(async () => {
      const result = await action(formData);
      if (result.success) {
        closeDialog();
        router.refresh();
      } else {
        setFieldErrors(result.errors);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Tem certeza? O profissional será desativado.")) return;
    const fd = new FormData();
    fd.set("companySlug", companySlug);
    fd.set("id", id);
    startTransition(async () => {
      await deleteProfessionalAction(fd);
      router.refresh();
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profissionais</h1>
          <p className="text-sm text-gray-500 mt-1">
            {limit !== null
              ? `${professionals.length} de ${limit} profissionais ativos`
              : `${professionals.length} profissional(is) ativo(s)`}
          </p>
        </div>
        <button
          onClick={() => openDialog({ type: "create" })}
          disabled={atLimit}
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-disabled={atLimit}
          title={atLimit ? `Limite de ${limit} profissionais atingido` : undefined}
        >
          + Novo Profissional
        </button>
      </div>

      {atLimit && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-sm text-amber-800">
            Limite de <strong>{limit}</strong> profissional(is) atingido no plano atual. Faça upgrade para adicionar mais.
          </p>
        </div>
      )}

      {professionals.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-400">Nenhum profissional cadastrado ainda.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <caption className="sr-only">Lista de profissionais</caption>
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr className="text-xs text-gray-400 uppercase">
                <th scope="col" className="text-left px-4 py-3 font-medium">
                  Profissional
                </th>
                <th scope="col" className="text-left px-4 py-3 font-medium">
                  Email
                </th>
                <th scope="col" className="text-left px-4 py-3 font-medium">
                  Telefone
                </th>
                <th scope="col" className="text-right px-4 py-3 font-medium sr-only">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {professionals.map((pro) => (
                <tr key={pro.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={pro.name} avatarUrl={pro.avatarUrl} />
                      <div>
                        <p className="font-medium text-gray-900">{pro.name}</p>
                        {pro.bio && (
                          <p className="text-xs text-gray-400 truncate max-w-48">{pro.bio}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {pro.email ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {pro.phone ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div
                      className="flex items-center justify-end gap-2"
                      role="group"
                      aria-label={`Ações para ${pro.name}`}
                    >
                      <button
                        onClick={() => openDialog({ type: "edit", item: pro })}
                        className="px-3 py-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(pro.id)}
                        className="px-3 py-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        Desativar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog */}
      <dialog
        ref={dialogRef}
        className="rounded-xl shadow-xl border border-gray-200 p-0 w-full max-w-md backdrop:bg-black/40"
        onClose={closeDialog}
        aria-labelledby="dialog-title"
      >
        {dialog.type !== "none" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              fd.set("companySlug", companySlug);
              if (dialog.type === "edit") {
                fd.set("id", dialog.item.id);
                handleAction(updateProfessionalAction, fd);
              } else {
                handleAction(createProfessionalAction, fd);
              }
            }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2
                id="dialog-title"
                className="text-base font-semibold text-gray-900"
              >
                {dialog.type === "edit" ? "Editar Profissional" : "Novo Profissional"}
              </h2>
              <button
                type="button"
                onClick={closeDialog}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              <GlobalError errors={fieldErrors} />

              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Nome <span aria-hidden="true">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  autoFocus
                  defaultValue={dialog.type === "edit" ? dialog.item.name : ""}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-describedby={fieldErrors?.name ? "name-error" : undefined}
                />
                <FieldError errors={fieldErrors} field="name" />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={dialog.type === "edit" ? (dialog.item.email ?? "") : ""}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-describedby={fieldErrors?.email ? "email-error" : undefined}
                />
                <FieldError errors={fieldErrors} field="email" />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Telefone
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={dialog.type === "edit" ? (dialog.item.phone ?? "") : ""}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="bio"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={3}
                  defaultValue={dialog.type === "edit" ? (dialog.item.bio ?? "") : ""}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  aria-describedby={fieldErrors?.bio ? "bio-error" : undefined}
                />
                <FieldError errors={fieldErrors} field="bio" />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDialog}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
