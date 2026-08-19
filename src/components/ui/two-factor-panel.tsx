"use client";

import React, { useState } from "react";
import { twoFactor } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { cancelTwoFactorResetAction } from "@/server/actions/two-factor-reset";
import { ShieldCheck, AlertTriangle, Copy, Check } from "@/components/ui/icons";

type PendingReset = {
  id: string;
  reason: string;
  executeAfter: string;
};

type Props = {
  enabled: boolean;
  /** Papéis para os quais a verificação é obrigatória mostram outro aviso. */
  required?: boolean;
  /** Pedido de reset em curso contra esta conta, se houver. */
  pendingReset?: PendingReset | null;
};

/**
 * Ativação e desativação da verificação em duas etapas.
 *
 * A senha é pedida nas duas pontas porque é isso que impede que uma sessão
 * roubada — justamente o cenário contra o qual o 2FA existe — ligue o segundo
 * fator num aparelho do atacante, ou desligue o da vítima.
 */
export function TwoFactorPanel({ enabled, required = false, pendingReset = null }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Etapa intermediária da ativação: o segredo já existe no banco, mas só vale
  // depois que o usuário prova que conseguiu ler o código no app.
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [confirmCode, setConfirmCode] = useState("");
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setPassword("");
    setConfirmCode("");
    setTotpUri(null);
    setBackupCodes([]);
    setError(null);
  };

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await twoFactor.enable({ password });
    setLoading(false);

    if (res.error || !res.data) {
      setError("Senha incorreta.");
      return;
    }

    setTotpUri(res.data.totpURI);
    setBackupCodes(res.data.backupCodes ?? []);
    setPassword("");
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await twoFactor.verifyTotp({ code: confirmCode.trim() });
    setLoading(false);

    if (res.error) {
      setError("Código inválido. Confira o horário do celular e tente de novo.");
      setConfirmCode("");
      return;
    }

    reset();
    router.refresh();
  };

  const disable = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await twoFactor.disable({ password });
    setLoading(false);

    if (res.error) {
      setError("Senha incorreta.");
      return;
    }

    reset();
    router.refresh();
  };

  const copyCodes = async () => {
    await navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cancelReset = async () => {
    if (!pendingReset) return;
    setCancelling(true);
    const res = await cancelTwoFactorResetAction(pendingReset.id);
    setCancelling(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    router.refresh();
  };

  /**
   * Aviso de reset pendente.
   *
   * Fica acima de tudo e não pode ser dispensado: é a única chance da vítima de
   * barrar a remoção do próprio segundo fator, e ela tem 24 horas para ver.
   */
  const resetBanner = pendingReset ? (
    <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-danger-light)] border border-[var(--color-danger-border)] space-y-3 mb-5">
      <p className="flex items-start gap-2 text-xs font-bold text-[var(--color-danger)]">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
        <span>
          Um administrador pediu para remover a verificação em duas etapas da sua
          conta. Isso acontece em{" "}
          {new Date(pendingReset.executeAfter).toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
          })}
          .
        </span>
      </p>
      <p className="text-xs text-[var(--color-danger)] pl-6">
        Motivo informado: &ldquo;{pendingReset.reason}&rdquo;
      </p>
      <p className="text-xs text-[var(--color-text-muted)] pl-6">
        Se não foi você que pediu, cancele agora — você está conseguindo entrar,
        então não precisa de reset.
      </p>
      <div className="pl-6">
        <button
          type="button"
          onClick={cancelReset}
          disabled={cancelling}
          className="btn btn-primary btn-sm"
        >
          {cancelling ? "Cancelando…" : "Cancelar este pedido"}
        </button>
      </div>
    </div>
  ) : null;

  // ── Segredo gerado, aguardando confirmação ──────────────────────────────
  if (totpUri) {
    // O segredo cru serve para quem não consegue ler QR code (leitor de tela,
    // app sem câmera). O QR é gerado pelo app autenticador a partir da URI.
    const secret = new URL(totpUri).searchParams.get("secret") ?? "";

    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-heading)] mb-1">
            1. Guarde seus códigos de recuperação
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">
            Esta é a única vez que eles aparecem. Se você perder o celular, é com
            um destes que você entra — cada um funciona uma vez só.
          </p>

          <div className="grid grid-cols-2 gap-2 p-3 rounded-[var(--radius-card)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] font-mono text-xs">
            {backupCodes.map((c) => (
              <span key={c} className="text-[var(--color-text-heading)]">
                {c}
              </span>
            ))}
          </div>

          <button type="button" onClick={copyCodes} className="btn btn-outline btn-sm mt-2">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copiado" : "Copiar códigos"}
          </button>
        </div>

        <div className="border-t border-[var(--color-border)] pt-4">
          <h3 className="text-sm font-semibold text-[var(--color-text-heading)] mb-1">
            2. Cadastre no app autenticador
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mb-2">
            No Google Authenticator, 1Password, Authy ou similar, escolha
            &ldquo;inserir chave manualmente&rdquo; e cole:
          </p>
          <code className="block p-3 rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] font-mono text-xs break-all text-[var(--color-text-heading)]">
            {secret}
          </code>
        </div>

        <form onSubmit={confirm} className="border-t border-[var(--color-border)] pt-4 space-y-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">
            3. Confirme com o código
          </h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            A verificação só passa a valer depois desta confirmação — assim ninguém
            fica trancado fora por ter cadastrado errado.
          </p>

          {error && (
            <p className="text-xs font-semibold text-[var(--color-danger)]">{error}</p>
          )}

          <input
            value={confirmCode}
            onChange={(e) => setConfirmCode(e.target.value)}
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            className="input font-mono tracking-[0.3em] text-center max-w-[12rem]"
          />

          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
              {loading ? "Confirmando…" : "Ativar verificação"}
            </button>
            <button type="button" onClick={reset} className="btn btn-ghost btn-sm">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Já ativa ────────────────────────────────────────────────────────────
  if (enabled) {
    return (
      <div className="space-y-4">
        {resetBanner}
        <p className="flex items-center gap-2 text-xs font-semibold text-[var(--color-success)]">
          <ShieldCheck className="w-4 h-4" />
          Verificação em duas etapas ativa
        </p>

        {required ? (
          <p className="text-xs text-[var(--color-text-muted)]">
            Sua conta administra uma empresa, então a verificação não pode ser
            desligada. Para trocar de aparelho, desative e ative novamente pelo
            suporte.
          </p>
        ) : (
          <form onSubmit={disable} className="space-y-3">
            <label
              htmlFor="disable2fa"
              className="block text-xs font-bold text-[var(--color-text)]"
            >
              Para desativar, confirme sua senha
            </label>
            {error && (
              <p className="text-xs font-semibold text-[var(--color-danger)]">{error}</p>
            )}
            <input
              id="disable2fa"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="input max-w-sm"
            />
            <button type="submit" disabled={loading} className="btn btn-outline btn-sm">
              {loading ? "Desativando…" : "Desativar verificação"}
            </button>
          </form>
        )}
      </div>
    );
  }

  // ── Desligada ───────────────────────────────────────────────────────────
  return (
    <form onSubmit={start} className="space-y-3">
      {resetBanner}
      {required && (
        <p className="flex items-start gap-2 text-xs text-[var(--color-warning)] bg-[var(--color-warning-light)] border border-[var(--color-warning-border)] rounded-[var(--radius-control)] p-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
          <span>
            Sua conta administra uma empresa e tem acesso a dados de pagamento e à
            carteira de clientes. A verificação em duas etapas é obrigatória.
          </span>
        </p>
      )}

      <p className="text-xs text-[var(--color-text-muted)]">
        Além da senha, entrar passa a exigir um código de 6 dígitos do seu
        aplicativo autenticador. Quem descobrir sua senha continua sem acesso.
      </p>

      {error && <p className="text-xs font-semibold text-[var(--color-danger)]">{error}</p>}

      <label htmlFor="enable2fa" className="block text-xs font-bold text-[var(--color-text)]">
        Confirme sua senha para começar
      </label>
      <input
        id="enable2fa"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
        className="input max-w-sm"
      />

      <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
        {loading ? "Gerando…" : "Ativar verificação em duas etapas"}
      </button>
    </form>
  );
}
