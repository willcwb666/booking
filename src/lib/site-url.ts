import "server-only";
import { headers } from "next/headers";

/**
 * A origem ("https://host") pela qual o visitante chegou.
 *
 * ─── Por que isto existe ─────────────────────────────────────────────────────
 *
 * O widget de compartilhamento montava o link assim:
 *
 *   typeof window !== "undefined" ? window.location.origin : "https://kreator.com.br"
 *
 * É um componente cliente que passa por SSR, então os dois lados do ternário
 * rodam: o servidor escrevia `kreator.com.br` no HTML e o cliente reescrevia
 * com o host real depois de hidratar. Isso dá o erro de hidratação que o
 * navegador reporta nesta página — e o React descarta e refaz a subárvore.
 *
 * O incômodo não é o aviso. É que o link EXIBIDO antes da hidratação é o
 * chumbado. Numa instalação em domínio próprio, o dono do salão que copiasse
 * rápido — ou cujo JavaScript não carregasse — levava embora um endereço que
 * não é o dele. Os botões de WhatsApp, Telegram e X são montados do mesmo
 * valor.
 *
 * Resolvendo no servidor, os dois lados produzem a mesma string e o domínio
 * é sempre o que o visitante está usando de verdade.
 */
export async function getRequestOrigin(): Promise<string> {
  const h = await headers();

  // Atrás de proxy (Vercel, nginx) o host real vem nos `x-forwarded-*`; `host`
  // sozinho pode ser o do container.
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) {
    // Sem host não há o que deduzir: cai para a configuração, que é o que o
    // resto do sistema (sitemap, robots, metadata) já usa.
    return process.env.NEXT_PUBLIC_APP_URL ?? "https://kreator.com.br";
  }

  const proto =
    h.get("x-forwarded-proto") ??
    // localhost sem proxy não é https; qualquer outro host em produção é.
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return `${proto}://${host}`;
}
