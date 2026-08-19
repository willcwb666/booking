"use client";

import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AuthShell, AuthError } from "@/components/ui/auth-shell";
import { AlertTriangle, Check } from "@/components/ui/icons";

const MIN_LENGTH = 8;

export default function RedefinirSenhaClient({
  token,
  linkError,
}: {
  token: string | null;
  linkError: string | null;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const longEnough = password.length >= MIN_LENGTH;
  const matches = confirm.length > 0 && password === confirm;
  const canSubmit = longEnough && matches && !loading;

  // Link inválido ou expirado: o better-auth devolve o usuário para cá com
  // `?error=`. Mostrar o formulário nesse caso só levaria a um erro no envio.
  if (!token || linkError) {
    return (
      <AuthShell
        title="Link inválido ou expirado"
        subtitle="Links de recuperação valem por 1 hora e só podem ser usados uma vez."
        footer={
          <p>
            <Link href="/login">Voltar para o login</Link>
          </p>
        }
      >
        <div className="flex flex-col items-center gap-3 text-center py-2">
          <span className="w-11 h-11 rounded-[var(--radius-card)] grid place-items-center bg-[var(--color-warning-light)] text-[var(--color-warning)]">
            <AlertTriangle className="w-5 h-5" />
          </span>
          <Link href="/recuperar-senha" className="btn btn-primary">
            Pedir um novo link
          </Link>
        </div>
      </AuthShell>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError("");

    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token: token!,
      });
      if (error) {
        setError(
          error.message ||
            "Não foi possível redefinir a senha. Peça um novo link e tente de novo."
        );
      } else {
        // Sem login automático: entrar com a senha nova confirma para o
        // usuário que ela funcionou de verdade.
        router.push("/login?reason=senha-alterada");
      }
    } catch {
      setError("Não foi possível redefinir a senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Criar nova senha"
      subtitle="Escolha uma senha que você não use em outro serviço."
      footer={
        <p>
          <Link href="/login">Voltar para o login</Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="auth-form">
        {error && <AuthError message={error} />}

        <div>
          <label className="input-label" htmlFor="password">
            Nova senha
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="input"
          />
          <div className="auth-password-hints">
            <span
              className={`auth-password-hint ${
                longEnough ? "auth-password-hint--valid" : "auth-password-hint--invalid"
              }`}
            >
              <Check className="w-3 h-3" />
              Pelo menos {MIN_LENGTH} caracteres
            </span>
          </div>
        </div>

        <div>
          <label className="input-label" htmlFor="confirm">
            Repita a nova senha
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            required
            aria-invalid={confirm.length > 0 && !matches}
            className="input"
          />
          {confirm.length > 0 && !matches && (
            <p className="input-error mt-1.5">As senhas não coincidem.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="btn btn-primary btn-lg w-full btn-tactile"
        >
          {loading ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>
    </AuthShell>
  );
}
