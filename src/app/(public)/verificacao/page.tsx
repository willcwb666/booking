import { VerificacaoClient } from "./verificacao-client";

export const metadata = {
  title: "Verificação em duas etapas — Kreator",
};

/**
 * Segunda etapa do login.
 *
 * Não há verificação de sessão aqui de propósito: quem chega nesta tela ainda
 * NÃO tem sessão — o login parou no meio, e o que existe é um cookie temporário
 * que o próprio better-auth emitiu e valida em cada tentativa de código. Exigir
 * sessão tornaria a página inalcançável justamente para quem precisa dela.
 */
export default function VerificacaoPage() {
  return <VerificacaoClient />;
}
