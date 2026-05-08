"use client";

import { useTransition, useRef, useState } from "react";
import {
  updateProfileAction,
  changePasswordAction,
  updateNotificationPrefsAction,
} from "@/server/actions/profile";

type NotifPrefs = {
  enableEmail: boolean;
  enablePush: boolean;
  enableWhatsApp: boolean;
  enableSms: boolean;
  whatsappPhone: string;
  smsPhone: string;
};

type Props = {
  name: string;
  email: string;
  bio: string;
  location: string;
  notifPrefs: NotifPrefs;
};

type Tab = "perfil" | "seguranca" | "notificacoes";

// ─── Profile form ─────────────────────────────────────────────────────────────

function ProfileForm({ name, bio, location }: Pick<Props, "name" | "bio" | "location">) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateProfileAction(data);
      if (!result.success) { setError(result.error); return; }
      setSuccess(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
        <input
          id="name" name="name" type="text" required defaultValue={name} maxLength={100}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
        <textarea
          id="bio" name="bio" rows={3} defaultValue={bio} maxLength={300}
          placeholder="Uma breve descrição sobre você…"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Localização</label>
        <input
          id="location" name="location" type="text" defaultValue={location} maxLength={100}
          placeholder="Ex: São Paulo, SP"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {success && <p role="status" className="text-sm text-green-700">Perfil atualizado com sucesso!</p>}
      <button type="submit" disabled={pending}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {pending ? "Salvando…" : "Salvar alterações"}
      </button>
    </form>
  );
}

// ─── Password form ────────────────────────────────────────────────────────────

function PasswordForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await changePasswordAction(data);
      if (!result.success) { setError(result.error); return; }
      setSuccess(true);
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {(["currentPassword", "newPassword", "confirmPassword"] as const).map((field) => (
        <div key={field}>
          <label htmlFor={field} className="block text-sm font-medium text-gray-700 mb-1">
            {field === "currentPassword" ? "Senha atual"
              : field === "newPassword" ? "Nova senha"
              : "Confirmar nova senha"}
          </label>
          <input
            id={field} name={field} type="password" required
            minLength={field !== "currentPassword" ? 8 : undefined}
            autoComplete={field === "currentPassword" ? "current-password" : "new-password"}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {field === "newPassword" && (
            <p className="text-xs text-gray-400 mt-1">Mínimo de 8 caracteres</p>
          )}
        </div>
      ))}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {success && <p role="status" className="text-sm text-green-700">Senha alterada com sucesso!</p>}
      <button type="submit" disabled={pending}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {pending ? "Alterando…" : "Alterar senha"}
      </button>
    </form>
  );
}

// ─── Notifications form ───────────────────────────────────────────────────────

function NotificacoesForm({ prefs }: { prefs: NotifPrefs }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [enableWhatsApp, setEnableWhatsApp] = useState(prefs.enableWhatsApp);
  const [enableSms, setEnableSms] = useState(prefs.enableSms);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateNotificationPrefsAction(data);
      if (!result.success) { setError(result.error); return; }
      setSuccess(true);
    });
  }

  const channels = [
    {
      key: "enableEmail",
      label: "E-mail",
      desc: "Confirmações e lembretes por e-mail.",
      defaultChecked: prefs.enableEmail,
      badge: null,
      onChange: undefined,
      extra: null,
    },
    {
      key: "enablePush",
      label: "Notificação push",
      desc: "Alertas direto no celular via app mobile.",
      defaultChecked: prefs.enablePush,
      badge: "App",
      onChange: undefined,
      extra: null,
    },
    {
      key: "enableWhatsApp",
      label: "WhatsApp",
      desc: "Mensagens via WhatsApp Business.",
      defaultChecked: prefs.enableWhatsApp,
      badge: "Em breve",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEnableWhatsApp(e.target.checked),
      extra: enableWhatsApp ? (
        <div className="border-t border-gray-200 px-4 pb-4 pt-3 bg-gray-50">
          <label className="block text-xs text-gray-600 mb-1">Número do WhatsApp</label>
          <input
            name="whatsappPhone"
            type="tel"
            defaultValue={prefs.whatsappPhone}
            placeholder="+55 11 99999-9999"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      ) : null,
    },
    {
      key: "enableSms",
      label: "SMS",
      desc: "Mensagens de texto para seu celular.",
      defaultChecked: prefs.enableSms,
      badge: "Em breve",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEnableSms(e.target.checked),
      extra: enableSms ? (
        <div className="border-t border-gray-200 px-4 pb-4 pt-3 bg-gray-50">
          <label className="block text-xs text-gray-600 mb-1">Número para SMS</label>
          <input
            name="smsPhone"
            type="tel"
            defaultValue={prefs.smsPhone}
            placeholder="+55 11 99999-9999"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      ) : null,
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-gray-500">
        Escolha como deseja ser notificado sobre seus agendamentos.
      </p>

      {channels.map((ch) => (
        <div key={ch.key} className="rounded-xl border border-gray-200 overflow-hidden">
          <label className="flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              name={ch.key}
              defaultChecked={ch.defaultChecked}
              onChange={ch.onChange}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{ch.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{ch.desc}</p>
            </div>
            {ch.badge && (
              <span className="text-xs bg-gray-100 text-gray-500 font-medium px-2 py-0.5 rounded-full self-center shrink-0">
                {ch.badge}
              </span>
            )}
          </label>
          {ch.extra}
        </div>
      ))}

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {success && <p role="status" className="text-sm text-green-700">Preferências salvas!</p>}

      <button type="submit" disabled={pending}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {pending ? "Salvando…" : "Salvar preferências"}
      </button>
    </form>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function PerfilClient({ name, email, bio, location, notifPrefs }: Props) {
  const [tab, setTab] = useState<Tab>("perfil");

  const tabs: { id: Tab; label: string }[] = [
    { id: "perfil", label: "Perfil" },
    { id: "seguranca", label: "Segurança" },
    { id: "notificacoes", label: "Notificações" },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 py-5 border-b border-gray-200 bg-white">
        <h1 className="text-xl font-bold text-gray-900">Meu perfil</h1>
        <p className="text-sm text-gray-500 mt-0.5">{email}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === t.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "perfil" && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Informações pessoais</h2>
            <ProfileForm name={name} bio={bio} location={location} />
          </div>
        )}

        {tab === "seguranca" && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Alterar senha</h2>
            <p className="text-xs text-gray-500 mb-4">
              Depois de alterar a senha, você continuará logado neste dispositivo.
            </p>
            <PasswordForm />
          </div>
        )}

        {tab === "notificacoes" && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Preferências de notificação</h2>
            <NotificacoesForm prefs={notifPrefs} />
          </div>
        )}
      </div>
    </div>
  );
}
