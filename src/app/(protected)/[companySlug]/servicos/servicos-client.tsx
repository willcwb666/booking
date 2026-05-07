"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createServiceAction,
  updateServiceAction,
  deleteServiceAction,
  reorderServiceAction,
  createServiceTypeAction,
  updateServiceTypeAction,
  deleteServiceTypeAction,
  reorderServiceTypeAction,
  createExtraServiceAction,
  updateExtraServiceAction,
  deleteExtraServiceAction,
  reorderExtraServiceAction,
} from "@/server/actions/services";
import type { ActionResult } from "@/types";

type ServiceType = {
  id: string;
  serviceId: string;
  name: string;
  description: string | null;
  price: number;
  estimatedMinutes: number;
  order: number;
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  order: number;
  serviceTypes: ServiceType[];
};

type ExtraService = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  estimatedMinutes: number;
  order: number;
};

type DialogState =
  | { type: "none" }
  | { type: "create-service" }
  | { type: "edit-service"; item: Service }
  | { type: "create-service-type"; serviceId: string }
  | { type: "edit-service-type"; item: ServiceType }
  | { type: "create-extra" }
  | { type: "edit-extra"; item: ExtraService };

type Props = {
  companySlug: string;
  services: Service[];
  extraServices: ExtraService[];
  extrasEnabled: boolean;
};

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function FieldError({ errors, field }: { errors: Record<string, string[]> | null; field: string }) {
  const msgs = errors?.[field];
  if (!msgs?.length) return null;
  return (
    <p className="text-xs text-red-600 mt-1" role="alert" id={`${field}-error`}>
      {msgs[0]}
    </p>
  );
}

function GlobalError({ errors }: { errors: Record<string, string[]> | null }) {
  const msgs = errors?.["_"];
  if (!msgs?.length) return null;
  return (
    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
      {msgs[0]}
    </p>
  );
}

export function ServicosClient({
  companySlug,
  services,
  extraServices,
  extrasEnabled,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"services" | "extras">("services");
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);

  function openDialog(state: DialogState) {
    setDialog(state);
    setFieldErrors(null);
    // Use rAF to ensure state is set before showModal
    requestAnimationFrame(() => dialogRef.current?.showModal());
  }

  function closeDialog() {
    dialogRef.current?.close();
    setDialog({ type: "none" });
    setFieldErrors(null);
  }

  function handleAction(action: (fd: FormData) => Promise<ActionResult>, formData: FormData) {
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

  function handleReorder(
    action: (fd: FormData) => Promise<ActionResult>,
    id: string,
    direction: "up" | "down",
    extra?: Record<string, string>
  ) {
    const fd = new FormData();
    fd.set("companySlug", companySlug);
    fd.set("id", id);
    fd.set("direction", direction);
    if (extra) Object.entries(extra).forEach(([k, v]) => fd.set(k, v));
    startTransition(async () => {
      await action(fd);
      router.refresh();
    });
  }

  function handleDelete(
    action: (fd: FormData) => Promise<ActionResult>,
    id: string
  ) {
    if (!confirm("Tem certeza? O item será desativado.")) return;
    const fd = new FormData();
    fd.set("companySlug", companySlug);
    fd.set("id", id);
    startTransition(async () => {
      await action(fd);
      router.refresh();
    });
  }

  const dialogTitle = {
    none: "",
    "create-service": "Novo Serviço",
    "edit-service": "Editar Serviço",
    "create-service-type": "Novo Tipo de Serviço",
    "edit-service-type": "Editar Tipo de Serviço",
    "create-extra": "Novo Serviço Extra",
    "edit-extra": "Editar Serviço Extra",
  }[dialog.type];

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Serviços</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie os serviços, tipos e extras da sua empresa.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6" role="tablist" aria-label="Seções de serviços">
        {(["services", "extras"] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`tabpanel-${tab}`}
            id={`tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "services" ? "Serviços e Tipos" : "Extras"}
          </button>
        ))}
      </div>

      {/* Tab: Services */}
      <div
        id="tabpanel-services"
        role="tabpanel"
        aria-labelledby="tab-services"
        hidden={activeTab !== "services"}
      >
        <div className="flex justify-end mb-4">
          <button
            onClick={() => openDialog({ type: "create-service" })}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Novo Serviço
          </button>
        </div>

        {services.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12 bg-white rounded-xl border border-gray-200">
            Nenhum serviço cadastrado ainda.
          </p>
        ) : (
          <div className="space-y-3">
            {services.map((service, sIdx) => (
              <div key={service.id} className="bg-white rounded-xl border border-gray-200">
                {/* Service row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() =>
                      setExpandedService(
                        expandedService === service.id ? null : service.id
                      )
                    }
                    className="flex-1 flex items-center gap-3 text-left"
                    aria-expanded={expandedService === service.id}
                    aria-controls={`service-types-${service.id}`}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={`shrink-0 text-gray-400 transition-transform ${
                        expandedService === service.id ? "rotate-90" : ""
                      }`}
                      aria-hidden="true"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {service.name}
                      </p>
                      {service.description && (
                        <p className="text-xs text-gray-400">{service.description}</p>
                      )}
                    </div>
                    <span className="ml-auto text-xs text-gray-400">
                      {service.serviceTypes.length} tipo(s)
                    </span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0" role="group" aria-label={`Ações para ${service.name}`}>
                    <button
                      onClick={() => handleReorder(reorderServiceAction, service.id, "up")}
                      disabled={sIdx === 0 || isPending}
                      className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors"
                      aria-label="Mover para cima"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleReorder(reorderServiceAction, service.id, "down")}
                      disabled={sIdx === services.length - 1 || isPending}
                      className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors"
                      aria-label="Mover para baixo"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => openDialog({ type: "edit-service", item: service })}
                      className="px-2.5 py-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(deleteServiceAction, service.id)}
                      className="px-2.5 py-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                    >
                      Desativar
                    </button>
                  </div>
                </div>

                {/* Service Types */}
                {expandedService === service.id && (
                  <div
                    id={`service-types-${service.id}`}
                    className="border-t border-gray-100 px-4 py-3"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Tipos
                      </p>
                      <button
                        onClick={() =>
                          openDialog({
                            type: "create-service-type",
                            serviceId: service.id,
                          })
                        }
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        + Adicionar tipo
                      </button>
                    </div>

                    {service.serviceTypes.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">
                        Nenhum tipo cadastrado.
                      </p>
                    ) : (
                      <table className="w-full text-sm" aria-label={`Tipos do serviço ${service.name}`}>
                        <caption className="sr-only">
                          Tipos do serviço {service.name}
                        </caption>
                        <thead>
                          <tr className="text-xs text-gray-400 uppercase">
                            <th scope="col" className="text-left pb-2 font-medium">Nome</th>
                            <th scope="col" className="text-right pb-2 font-medium">Preço</th>
                            <th scope="col" className="text-right pb-2 font-medium">Duração</th>
                            <th scope="col" className="text-right pb-2 font-medium sr-only">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {service.serviceTypes.map((st, stIdx) => (
                            <tr key={st.id} className="border-t border-gray-50">
                              <td className="py-2">
                                <p className="font-medium text-gray-800">{st.name}</p>
                                {st.description && (
                                  <p className="text-xs text-gray-400">{st.description}</p>
                                )}
                              </td>
                              <td className="py-2 text-right font-medium text-gray-800">
                                {formatCurrency(st.price)}
                              </td>
                              <td className="py-2 text-right text-gray-500">
                                {formatDuration(st.estimatedMinutes)}
                              </td>
                              <td className="py-2 text-right">
                                <div className="flex items-center justify-end gap-1" role="group" aria-label={`Ações para tipo ${st.name}`}>
                                  <button
                                    onClick={() => handleReorder(reorderServiceTypeAction, st.id, "up", { serviceId: service.id })}
                                    disabled={stIdx === 0 || isPending}
                                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs"
                                    aria-label="Mover para cima"
                                  >↑</button>
                                  <button
                                    onClick={() => handleReorder(reorderServiceTypeAction, st.id, "down", { serviceId: service.id })}
                                    disabled={stIdx === service.serviceTypes.length - 1 || isPending}
                                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs"
                                    aria-label="Mover para baixo"
                                  >↓</button>
                                  <button
                                    onClick={() => openDialog({ type: "edit-service-type", item: st })}
                                    className="px-2 py-0.5 text-xs text-gray-600 hover:text-gray-900"
                                  >Editar</button>
                                  <button
                                    onClick={() => handleDelete(deleteServiceTypeAction, st.id)}
                                    className="px-2 py-0.5 text-xs text-red-500 hover:text-red-700"
                                  >Desativar</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tab: Extras */}
      <div
        id="tabpanel-extras"
        role="tabpanel"
        aria-labelledby="tab-extras"
        hidden={activeTab !== "extras"}
      >
        {!extrasEnabled ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <p className="text-sm font-medium text-amber-900 mb-1">
              Recurso não disponível no plano atual
            </p>
            <p className="text-sm text-amber-700">
              Serviços extras estão disponíveis nos planos Normal e Advanced.
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => openDialog({ type: "create-extra" })}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Novo Extra
              </button>
            </div>

            {extraServices.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12 bg-white rounded-xl border border-gray-200">
                Nenhum extra cadastrado ainda.
              </p>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <caption className="sr-only">Lista de serviços extras</caption>
                  <thead className="border-b border-gray-100">
                    <tr className="text-xs text-gray-400 uppercase">
                      <th scope="col" className="text-left px-4 py-3 font-medium">Nome</th>
                      <th scope="col" className="text-right px-4 py-3 font-medium">Preço</th>
                      <th scope="col" className="text-right px-4 py-3 font-medium">Duração</th>
                      <th scope="col" className="text-right px-4 py-3 font-medium sr-only">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extraServices.map((extra, idx) => (
                      <tr key={extra.id} className="border-t border-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{extra.name}</p>
                          {extra.description && (
                            <p className="text-xs text-gray-400">{extra.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-800">
                          {formatCurrency(extra.price)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">
                          {formatDuration(extra.estimatedMinutes)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1" role="group" aria-label={`Ações para extra ${extra.name}`}>
                            <button
                              onClick={() => handleReorder(reorderExtraServiceAction, extra.id, "up")}
                              disabled={idx === 0 || isPending}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs"
                              aria-label="Mover para cima"
                            >↑</button>
                            <button
                              onClick={() => handleReorder(reorderExtraServiceAction, extra.id, "down")}
                              disabled={idx === extraServices.length - 1 || isPending}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs"
                              aria-label="Mover para baixo"
                            >↓</button>
                            <button
                              onClick={() => openDialog({ type: "edit-extra", item: extra })}
                              className="px-2 py-0.5 text-xs text-gray-600 hover:text-gray-900"
                            >Editar</button>
                            <button
                              onClick={() => handleDelete(deleteExtraServiceAction, extra.id)}
                              className="px-2 py-0.5 text-xs text-red-500 hover:text-red-700"
                            >Desativar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

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

              if (dialog.type === "create-service")
                handleAction(createServiceAction, fd);
              else if (dialog.type === "edit-service") {
                fd.set("id", dialog.item.id);
                handleAction(updateServiceAction, fd);
              } else if (dialog.type === "create-service-type") {
                fd.set("serviceId", dialog.serviceId);
                handleAction(createServiceTypeAction, fd);
              } else if (dialog.type === "edit-service-type") {
                fd.set("id", dialog.item.id);
                fd.set("serviceId", dialog.item.serviceId);
                handleAction(updateServiceTypeAction, fd);
              } else if (dialog.type === "create-extra")
                handleAction(createExtraServiceAction, fd);
              else if (dialog.type === "edit-extra") {
                fd.set("id", dialog.item.id);
                handleAction(updateExtraServiceAction, fd);
              }
            }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 id="dialog-title" className="text-base font-semibold text-gray-900">
                {dialogTitle}
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

              {/* Service fields */}
              {(dialog.type === "create-service" || dialog.type === "edit-service") && (
                <>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Nome <span aria-hidden="true">*</span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      autoFocus
                      defaultValue={dialog.type === "edit-service" ? dialog.item.name : ""}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-describedby={fieldErrors?.name ? "name-error" : undefined}
                    />
                    <FieldError errors={fieldErrors} field="name" />
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={2}
                      defaultValue={dialog.type === "edit-service" ? (dialog.item.description ?? "") : ""}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <FieldError errors={fieldErrors} field="description" />
                  </div>
                </>
              )}

              {/* ServiceType fields */}
              {(dialog.type === "create-service-type" || dialog.type === "edit-service-type") && (
                <>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Nome <span aria-hidden="true">*</span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      autoFocus
                      defaultValue={dialog.type === "edit-service-type" ? dialog.item.name : ""}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <FieldError errors={fieldErrors} field="name" />
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={2}
                      defaultValue={dialog.type === "edit-service-type" ? (dialog.item.description ?? "") : ""}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                        Preço (R$) <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id="price"
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        defaultValue={dialog.type === "edit-service-type" ? dialog.item.price : ""}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-describedby={fieldErrors?.price ? "price-error" : undefined}
                      />
                      <FieldError errors={fieldErrors} field="price" />
                    </div>
                    <div>
                      <label htmlFor="estimatedMinutes" className="block text-sm font-medium text-gray-700 mb-1">
                        Duração (min) <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id="estimatedMinutes"
                        name="estimatedMinutes"
                        type="number"
                        min="1"
                        step="1"
                        required
                        defaultValue={dialog.type === "edit-service-type" ? dialog.item.estimatedMinutes : ""}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-describedby={fieldErrors?.estimatedMinutes ? "estimatedMinutes-error" : undefined}
                      />
                      <FieldError errors={fieldErrors} field="estimatedMinutes" />
                    </div>
                  </div>
                </>
              )}

              {/* ExtraService fields */}
              {(dialog.type === "create-extra" || dialog.type === "edit-extra") && (
                <>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Nome <span aria-hidden="true">*</span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      autoFocus
                      defaultValue={dialog.type === "edit-extra" ? dialog.item.name : ""}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <FieldError errors={fieldErrors} field="name" />
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={2}
                      defaultValue={dialog.type === "edit-extra" ? (dialog.item.description ?? "") : ""}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                        Preço (R$) <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id="price"
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        defaultValue={dialog.type === "edit-extra" ? dialog.item.price : ""}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <FieldError errors={fieldErrors} field="price" />
                    </div>
                    <div>
                      <label htmlFor="estimatedMinutes" className="block text-sm font-medium text-gray-700 mb-1">
                        Duração (min) <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id="estimatedMinutes"
                        name="estimatedMinutes"
                        type="number"
                        min="1"
                        step="1"
                        required
                        defaultValue={dialog.type === "edit-extra" ? dialog.item.estimatedMinutes : ""}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <FieldError errors={fieldErrors} field="estimatedMinutes" />
                    </div>
                  </div>
                </>
              )}
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
