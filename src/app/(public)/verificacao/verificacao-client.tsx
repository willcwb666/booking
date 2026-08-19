"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { twoFactor } from "@/lib/auth-client";
import { AuthShell, AuthError } from "@/components/ui/auth-shell";

/** Os três caminhos para concluir o login, na ordem em que devem ser tentados. */
type Mode = "totp" | "otp" | "backup";

const MODE_COPY: Record<Mode, { title: string; hint: string; placeholder: string }> = {
  totp: {
    title: "Código do aplicativo",
    hint: "Abra seu app autenticador e digite o código de 6 dígitos que aparece para o Kreator.",
    placeholder: "000000",
  },
  otp: {
    title: "Código por e-mail",
    hint: "Enviamos um código para o e-mail da sua conta. Ele vale por poucos minutos.",
    placeholder: "000000",
  },
  backup: {
    title: "Código de recuperação",
    hint: "Use um dos códigos que você salvou ao ativar a verificação. Cada um funciona uma vez só.",
    placeholder: "xxxxx-xxxxx",
  },
};

export function VerificacaoClient() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("totp");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);

  const copy = MODE_COPY[mode];

  const switchTo = (next: Mode) => {
    setMode(next);
    setCode("");
    setError(null);
  };

  const sendEmailCode = async () => {
    setLoading(true);
    setError(null);
    const res = await twoFactor.sendOtp();
    setLoading(false);
    if (res.error) {
      setError("Não conseguimos enviar o código agora. Tente o app autenticador.");
      return;
    }
    setOtpSent(true);
    switchTo("otp");
    setMode("otp");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = code.trim();
    if (!value) return;

    setLoading(true);
    setError(null);

    const res =
      mode === "backup"
        ? await twoFactor.verifyBackupCode({ code: value })
        : mode === "otp"
          ? await twoFactor.verifyOtp({ code: value, trustDevice })
          : await twoFactor.verifyTotp({ code: value, trustDevice });

    setLoading(false);

    if (res.error) {
      // Mensagem única para código errado, expirado e já usado: distinguir os
      // casos diria a quem está tentando adivinhar qual parte ele acertou.
      setError("Código inválido ou expirado.");
      setCode("");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <AuthShell
      title="Verificação em duas etapas"
      subtitle="Falta um passo para entrar na sua conta."
      footer={
        <Link href="/login" className="text-[var(--color-text-muted)] hover:underline">
          Voltar para o login
        </Link>
      }
    >
      {error && <AuthError message={error} />}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label
            htmlFor="code"
            className="block text-xs font-bold text-[var(--color-text)] mb-1"
          >
            {copy.title}
          </label>
          <input
            id="code"
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={copy.placeholder}
            autoComplete="one-time-code"
            // `inputMode` numérico abre o teclado certo no celular, mas o
            // código de recuperação é alfanumérico.
            inputMode={mode === "backup" ? "text" : "numeric"}
            autoFocus
            required
            className="input text-center tracking-[0.4em] font-mono text-lg"
          />
          <p
            className="text-[var(--color-text-muted)] mt-1.5 leading-relaxed"
            style={{ fontSize: "var(--text-2xs)" }}
          >
            {copy.hint}
          </p>
        </div>

        {mode !== "backup" && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
            />
            <span
              className="text-[var(--color-text-muted)]"
              style={{ fontSize: "var(--text-2xs)" }}
            >
              Confiar neste dispositivo por 30 dias
            </span>
          </label>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? "Verificando…" : "Entrar"}
        </button>
      </form>

      {/* Alternativas sempre visíveis. Quem perdeu o celular chega aqui já em
          pânico; esconder a saída atrás de um link discreto gera chamado de
          suporte que o produto consegue evitar. */}
      <div className="mt-6 pt-4 border-t border-[var(--color-border)] space-y-2">
        <p
          className="text-[var(--color-text-subtle)] font-semibold uppercase tracking-wide"
          style={{ fontSize: "var(--text-2xs)" }}
        >
          Não consegue usar este método?
        </p>

        {mode !== "totp" && (
          <button type="button" onClick={() => switchTo("totp")} className="btn btn-ghost btn-sm w-full">
            Usar o app autenticador
          </button>
        )}

        {mode !== "otp" && (
          <button
            type="button"
            onClick={sendEmailCode}
            disabled={loading}
            className="btn btn-ghost btn-sm w-full"
          >
            {otpSent ? "Reenviar código por e-mail" : "Receber código por e-mail"}
          </button>
        )}

        {mode !== "backup" && (
          <button type="button" onClick={() => switchTo("backup")} className="btn btn-ghost btn-sm w-full">
            Usar código de recuperação
          </button>
        )}
      </div>
    </AuthShell>
  );
}
