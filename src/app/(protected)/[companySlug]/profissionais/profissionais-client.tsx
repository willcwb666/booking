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
    <p className="text-xs text-[var(--color-danger)] mt-1" role="alert">
      {msgs[0]}
    </p>
  );
}

function GlobalError({ errors }: { errors: Record<string, string[]> | null }) {
  const msgs = errors?.["_"];
  if (!msgs?.length) return null;
  return (
    <p
      className="alert alert-danger"
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
      className="w-8 h-8 rounded-full bg-[var(--color-bg-muted)] flex items-center justify-center shrink-0"
      aria-hidden="true"
    >
      <span className="text-xs font-semibold text-[var(--color-text-muted)]">
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
    <div className="page-container">
     <div className="page-content">
      {/* Header */}
      <div className="page-header !mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Profissionais</h1>
          <p className="page-description">
            {limit !== null
              ? `${professionals.length} de ${limit} profissionais ativos`
              : `${professionals.length} profissional(is) ativo(s)`}
          </p>
        </div>
        <button
          onClick={() => openDialog({ type: "create" })}
          disabled={atLimit}
          className="btn btn-primary shrink-0"
          aria-disabled={atLimit}
          title={atLimit ? `Limite de ${limit} profissionais atingido` : undefined}
        >
          + Novo Profissional
        </button>
      </div>

      {atLimit && (
        <div className="mb-4 bg-[var(--color-warning-light)] border border-[var(--color-warning-border)] rounded-xl px-4 py-3">
          <p className="text-sm text-[var(--color-warning)]">
            Limite de <strong>{limit}</strong> profissional(is) atingido no plano atual. Faça upgrade para adicionar mais.
          </p>
        </div>
      )}

      {professionals.length === 0 ? (
        <div className="card py-16 text-center">
          <p className="text-sm text-[var(--color-text-subtle)]">Nenhum profissional cadastrado ainda.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <caption className="sr-only">Lista de profissionais</caption>
            <thead>
              <tr>
                <th scope="col">Profissional</th>
                <th scope="col">Email</th>
                <th scope="col">Telefone</th>
                <th scope="col" className="!text-right sr-only">Ações</th>
              </tr>
            </thead>
            <tbody>
              {professionals.map((pro) => (
                <tr key={pro.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={pro.name} avatarUrl={pro.avatarUrl} />
                      <div>
                        <p className="font-medium text-[var(--color-text-heading)]">{pro.name}</p>
                        {pro.bio && (
                          <p className="text-xs text-[var(--color-text-subtle)] truncate max-w-48">{pro.bio}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text)]">
                    {pro.email ?? <span className="text-[var(--color-text-subtle)]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text)]">
                    {pro.phone ?? <span className="text-[var(--color-text-subtle)]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div
                      className="flex items-center justify-end gap-2"
                      role="group"
                      aria-label={`Ações para ${pro.name}`}
                    >
                      <button
                        onClick={() => openDialog({ type: "edit", item: pro })}
                        className="px-3 py-1 text-xs text-[var(--color-text)] hover:text-[var(--color-text-heading)] transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(pro.id)}
                        className="px-3 py-1 text-xs text-[var(--color-danger)] hover:opacity-80 transition-colors"
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
        className="rounded-xl shadow-xl border border-[var(--color-border)] p-0 w-full max-w-md backdrop:bg-black/40"
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
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
              <h2
                id="dialog-title"
                className="text-base font-semibold text-[var(--color-text-heading)]"
              >
                {dialog.type === "edit" ? "Editar Profissional" : "Novo Profissional"}
              </h2>
              <button
                type="button"
                onClick={closeDialog}
                className="text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition-colors"
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
                  className="input-label"
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
                  className="input"
                  aria-describedby={fieldErrors?.name ? "name-error" : undefined}
                />
                <FieldError errors={fieldErrors} field="name" />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="input-label"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={dialog.type === "edit" ? (dialog.item.email ?? "") : ""}
                  className="input"
                  aria-describedby={fieldErrors?.email ? "email-error" : undefined}
                />
                <FieldError errors={fieldErrors} field="email" />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="input-label"
                >
                  Telefone
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={dialog.type === "edit" ? (dialog.item.phone ?? "") : ""}
                  className="input"
                />
              </div>

              <div>
                <label
                  htmlFor="bio"
                  className="input-label"
                >
                  Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={3}
                  defaultValue={dialog.type === "edit" ? (dialog.item.bio ?? "") : ""}
                  className="textarea resize-none"
                  aria-describedby={fieldErrors?.bio ? "bio-error" : undefined}
                />
                <FieldError errors={fieldErrors} field="bio" />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-[var(--color-border)] flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDialog}
                className="btn btn-ghost"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn btn-primary"
              >
                {isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        )}
      </dialog>
     </div>
    </div>
  );
}
