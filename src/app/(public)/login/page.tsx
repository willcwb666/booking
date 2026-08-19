import { googleAuthEnabled } from "@/lib/auth";
import LoginClient from "./login-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entrar no Sistema",
  description: "Acesse sua conta para gerenciar agendamentos, clientes, orçamentos e equipe.",
};

// Só aceita caminhos relativos internos — evita open redirect
function safeCallbackUrl(url: string | undefined): string | null {
  if (url && url.startsWith("/") && !url.startsWith("//")) return url;
  return null;
}

// Motivos conhecidos de redirecionamento — nunca renderiza texto vindo da URL
const NOTICES: Record<string, string> = {
  idle: "Sua sessão foi encerrada por inatividade. Entre novamente para continuar.",
  revoked: "Sua sessão foi encerrada porque este login foi usado em outro dispositivo.",
  "senha-alterada": "Senha alterada. Entre com a nova senha.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; reason?: string }>;
}) {
  const { callbackUrl, reason } = await searchParams;
  return (
    <LoginClient
      googleEnabled={googleAuthEnabled}
      callbackUrl={safeCallbackUrl(callbackUrl)}
      notice={reason ? (NOTICES[reason] ?? null) : null}
    />
  );
}
