"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  publishBookingConfigAction,
  archiveBookingConfigAction,
} from "@/server/actions/booking-configs";

type Agenda = { id: string; name: string };

type ConfigItem = {
  id: string;
  name: string;
  status: "DRAFT" | "PUBLISHED";
  agenda: { id: string; name: string; status: string };
  serviceTypes: {
    serviceType: { id: string; name: string; serviceName: string };
  }[];
  extraServices: { extraService: { id: string; name: string } }[];
};

type Props = {
  companySlug: string;
  configs: ConfigItem[];
  agendas: Agenda[];
  canManage: boolean;
  isOwner: boolean;
};

const STATUS_CONFIG = {
  DRAFT: {
    label: "Rascunho",
    className: "bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]",
  },
  PUBLISHED: {
    label: "Publicado",
    className: "bg-[var(--color-success-light)] text-[var(--color-success)]",
  },
} as const;

function PublishButton({
  configId,
  companySlug,
}: {
  configId: string;
  companySlug: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handlePublish() {
    const fd = new FormData();
    fd.set("companySlug", companySlug);
    fd.set("id", configId);
    startTransition(async () => {
      await publishBookingConfigAction(fd);
    });
  }

  return (
    <button
      type="button"
      onClick={handlePublish}
      disabled={isPending}
      className="text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium disabled:opacity-60"
    >
      {isPending ? "Publicando..." : "Publicar"}
    </button>
  );
}

function ArchiveButton({
  configId,
  companySlug,
  configName,
}: {
  configId: string;
  companySlug: string;
  configName: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleArchive() {
    if (!confirm(`Excluir "${configName}"? Esta ação não pode ser desfeita.`))
      return;
    const fd = new FormData();
    fd.set("companySlug", companySlug);
    fd.set("id", configId);
    startTransition(async () => {
      await archiveBookingConfigAction(fd);
    });
  }

  return (
    <button
      type="button"
      onClick={handleArchive}
      disabled={isPending}
      className="text-xs text-[var(--color-danger)] hover:text-[var(--color-danger)] font-medium disabled:opacity-60"
    >
      {isPending ? "Excluindo..." : "Excluir"}
    </button>
  );
}

export function BookingConfigsClient({
  companySlug,
  configs,
  canManage,
  isOwner,
}: Props) {
  return (
    <div className="page-container">
     <div className="page-content">
      {/* Header */}
      <div className="page-header !mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Booking</h1>
          <p className="page-description">
            Configure páginas de agendamento online para seus clientes
          </p>
        </div>
        {canManage && (
          <Link
            href={`/${companySlug}/booking/nova`}
            className="btn btn-primary"
          >
            Nova configuração
          </Link>
        )}
      </div>

      {/* Empty state */}
      {configs.length === 0 && (
        <div className="card px-6 py-16 text-center">
          <div
            className="w-12 h-12 bg-[var(--color-primary-light)] rounded-full flex items-center justify-center mx-auto mb-4"
            aria-hidden="true"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--color-primary)]"
            >
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-[var(--color-text-heading)] mb-1">
            Nenhuma configuração de booking
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-6 max-w-sm mx-auto">
            Crie uma configuração para gerar um link de agendamento online para
            seus clientes.
          </p>
          {canManage && (
            <Link
              href={`/${companySlug}/booking/nova`}
              className="btn btn-primary"
            >
              Criar primeira configuração
            </Link>
          )}
        </div>
      )}

      {/* List */}
      {configs.length > 0 && (
        <div className="space-y-3">
          {configs.map((config) => {
            const statusCfg = STATUS_CONFIG[config.status];
            return (
              <div
                key={config.id}
                className="card card-body"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-base font-semibold text-[var(--color-text-heading)] truncate">
                        {config.name}
                      </h2>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.className}`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mb-2">
                      Agenda:{" "}
                      <span className="font-medium text-[var(--color-text-heading)]">
                        {config.agenda.name}
                      </span>
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {config.serviceTypes.length} tipo(s) de serviço
                      {config.extraServices.length > 0 &&
                        ` · ${config.extraServices.length} adicional(is)`}
                    </p>

                    {config.status === "PUBLISHED" && (
                      <a
                        href={`/book/${companySlug}/${config.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-xs text-[var(--color-primary)] hover:underline"
                      >
                        Ver link público ↗
                      </a>
                    )}
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    {canManage && (
                      <Link
                        href={`/${companySlug}/booking/${config.id}/editar`}
                        className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)] font-medium"
                      >
                        Editar
                      </Link>
                    )}
                    {canManage && config.status === "DRAFT" && (
                      <PublishButton
                        configId={config.id}
                        companySlug={companySlug}
                      />
                    )}
                    {isOwner && (
                      <ArchiveButton
                        configId={config.id}
                        companySlug={companySlug}
                        configName={config.name}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
     </div>
    </div>
  );
}
