"use client";

import Link from "next/link";
import React, { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { AuthShell, AuthError } from "@/components/ui/auth-shell";
import { CheckCircle2 } from "@/components/ui/icons";

export default function RecuperarSenhaClient() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: "/redefinir-senha",
      });
      // A tela confirma o envio mesmo quando o e-mail não existe. Responder
      // "conta não encontrada" transformaria este formulário num verificador
      // de contas — daria para descobrir quem usa a plataforma testando
      // e-mails. Só erro de infraestrutura (5xx) aparece para o usuário.
      if (error && (error.status ?? 0) >= 500) {
        setError("Não foi possível enviar agora. Tente novamente em instantes.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Não foi possível enviar agora. Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthShell
        title="Verifique seu e-mail"
        subtitle="Se existir uma conta com esse endereço, o link já está a caminho."
        footer={
          <p>
            <Link href="/login">Voltar para o login</Link>
          </p>
        }
      >
        <div className="flex flex-col items-center gap-3 text-center py-2">
          <span className="w-11 h-11 rounded-[var(--radius-card)] grid place-items-center bg-[var(--color-success-light)] text-[var(--color-success)]">
            <CheckCircle2 className="w-5 h-5" />
          </span>
          <p
            className="text-[var(--color-text-muted)] measure"
            style={{ fontSize: "var(--text-sm)" }}
          >
            Enviamos um link para <strong className="text-[var(--color-text-heading)]">{email}</strong>.
            Ele vale por 1 hora e só funciona uma vez. Se não chegar, confira a
            caixa de spam.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Recuperar senha"
      subtitle="Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha."
      footer={
        <p>
          Lembrou a senha? <Link href="/login">Entrar</Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="auth-form">
        {error && <AuthError message={error} />}

        <div>
          <label className="input-label" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            required
            className="input"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary btn-lg w-full btn-tactile"
        >
          {loading ? "Enviando..." : "Enviar link de recuperação"}
        </button>
      </form>
    </AuthShell>
  );
}
