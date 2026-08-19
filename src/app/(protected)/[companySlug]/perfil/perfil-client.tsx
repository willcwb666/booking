"use client";

import { useTransition, useRef, useState } from "react";
import { TwoFactorPanel } from "@/components/ui/two-factor-panel";
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
  enableMarketing: boolean;
  whatsappPhone: string;
  smsPhone: string;
};

type Props = {
  name: string;
  email: string;
  bio: string;
  location: string;
  notifPrefs: NotifPrefs;
  twoFactorEnabled: boolean;
  twoFactorRequired: boolean;
  pendingReset: { id: string; reason: string; executeAfter: string } | null;
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
        <label htmlFor="name" className="block text-sm font-medium text-[var(--color-text-heading)] mb-1">Nome</label>
        <input
          id="name" name="name" type="text" required defaultValue={name} maxLength={100}
          className="input"
        />
      </div>
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-[var(--color-text-heading)] mb-1">Bio</label>
        <textarea
          id="bio" name="bio" rows={3} defaultValue={bio} maxLength={300}
          placeholder="Uma breve descrição sobre você…"
          className="textarea resize-none"
        />
      </div>
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-[var(--color-text-heading)] mb-1">Localização</label>
        <input
          id="location" name="location" type="text" defaultValue={location} maxLength={100}
          placeholder="Ex: São Paulo, SP"
          className="input"
        />
      </div>
      {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
      {success && <p role="status" className="text-sm text-[var(--color-success)]">Perfil atualizado com sucesso!</p>}
      <button type="submit" disabled={pending}
        className="px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-[var(--radius-control)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors">
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
          <label htmlFor={field} className="block text-sm font-medium text-[var(--color-text-heading)] mb-1">
            {field === "currentPassword" ? "Senha atual"
              : field === "newPassword" ? "Nova senha"
              : "Confirmar nova senha"}
          </label>
          <input
            id={field} name={field} type="password" required
            minLength={field !== "currentPassword" ? 8 : undefined}
            autoComplete={field === "currentPassword" ? "current-password" : "new-password"}
            className="input"
          />
          {field === "newPassword" && (
            <p className="text-xs text-[var(--color-text-subtle)] mt-1">Mínimo de 8 caracteres</p>
          )}
        </div>
      ))}
      {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
      {success && <p role="status" className="text-sm text-[var(--color-success)]">Senha alterada com sucesso!</p>}
      <button type="submit" disabled={pending}
        className="px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-[var(--radius-control)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors">
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
        <div className="border-t border-[var(--color-border)] px-4 pb-4 pt-3 bg-[var(--color-bg-subtle)]">
          <label className="block text-xs text-[var(--color-text)] mb-1">Número do WhatsApp</label>
          <input
            name="whatsappPhone"
            type="tel"
            defaultValue={prefs.whatsappPhone}
            placeholder="Com DDI — ex.: +55 11 99999-9999 ou +1 720 555 0123"
            className="input"
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
        <div className="border-t border-[var(--color-border)] px-4 pb-4 pt-3 bg-[var(--color-bg-subtle)]">
          <label className="block text-xs text-[var(--color-text)] mb-1">Número para SMS</label>
          <input
            name="smsPhone"
            type="tel"
            defaultValue={prefs.smsPhone}
            placeholder="Com DDI — ex.: +55 11 99999-9999 ou +1 720 555 0123"
            className="input"
          />
        </div>
      ) : null,
    },
    {
      key: "enableMarketing",
      label: "Ofertas e promoções",
      desc: "Receba por e-mail promoções das empresas parceiras.",
      defaultChecked: prefs.enableMarketing,
      badge: null,
      onChange: undefined,
      extra: null,
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-[var(--color-text-muted)]">
        Escolha como deseja ser notificado sobre seus agendamentos.
      </p>

      {channels.map((ch) => (
        <div key={ch.key} className="rounded-[var(--radius-control)] border border-[var(--color-border)] overflow-hidden">
          <label className="flex items-start gap-4 p-4 cursor-pointer hover:bg-[var(--color-bg-subtle)] transition-colors">
            <input
              type="checkbox"
              name={ch.key}
              defaultChecked={ch.defaultChecked}
              onChange={ch.onChange}
              className="mt-0.5 h-4 w-4 rounded border-[var(--color-border-strong)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-text-heading)]">{ch.label}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{ch.desc}</p>
            </div>
            {ch.badge && (
              <span className="text-xs bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] font-medium px-2 py-0.5 rounded-full self-center shrink-0">
                {ch.badge}
              </span>
            )}
          </label>
          {ch.extra}
        </div>
      ))}

      {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
      {success && <p role="status" className="text-sm text-[var(--color-success)]">Preferências salvas!</p>}

      <button type="submit" disabled={pending}
        className="px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-[var(--radius-control)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors">
        {pending ? "Salvando…" : "Salvar preferências"}
      </button>
    </form>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function PerfilClient({
  name,
  email,
  bio,
  location,
  notifPrefs,
  twoFactorEnabled,
  twoFactorRequired,
  pendingReset,
}: Props) {
  const [tab, setTab] = useState<Tab>("perfil");

  const tabs: { id: Tab; label: string }[] = [
    { id: "perfil", label: "Perfil" },
    { id: "seguranca", label: "Segurança" },
    { id: "notificacoes", label: "Notificações" },
  ];

  return (
    <div className="page-container">
     <div className="page-content space-y-6">
      <div className="page-header !mb-0">
        <h1 className="page-title">Meu perfil</h1>
        <p className="page-description">{email}</p>
      </div>

      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-[var(--color-bg-muted)] p-1 rounded-[var(--radius-control)] w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 text-sm font-medium rounded-[var(--radius-sm)] transition-colors ${
                tab === t.id
                  ? "bg-[var(--color-bg)] text-[var(--color-text-heading)] shadow-sm"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "perfil" && (
          <div className="card card-body">
            <h2 className="text-sm font-semibold text-[var(--color-text-heading)] mb-4">Informações pessoais</h2>
            <ProfileForm name={name} bio={bio} location={location} />
          </div>
        )}

        {tab === "seguranca" && (
          <div className="space-y-6">
            {/* Verificação em duas etapas vem antes da senha: é a decisão de
                segurança que muda mais e a que o usuário não sabe que existe. */}
            <div className="card card-body">
              <h2 className="text-sm font-semibold text-[var(--color-text-heading)] mb-1">
                Verificação em duas etapas
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">
                Uma segunda prova de identidade no login, além da senha.
              </p>
              <TwoFactorPanel
                enabled={twoFactorEnabled}
                required={twoFactorRequired}
                pendingReset={pendingReset}
              />
            </div>

            <div className="card card-body">
              <h2 className="text-sm font-semibold text-[var(--color-text-heading)] mb-1">Alterar senha</h2>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">
                Depois de alterar a senha, você continuará logado neste dispositivo.
              </p>
              <PasswordForm />
            </div>
          </div>
        )}

        {tab === "notificacoes" && (
          <div className="card card-body">
            <h2 className="text-sm font-semibold text-[var(--color-text-heading)] mb-4">Preferências de notificação</h2>
            <NotificacoesForm prefs={notifPrefs} />
          </div>
        )}
      </div>
     </div>
    </div>
  );
}
