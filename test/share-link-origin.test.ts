import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * O link de compartilhamento tem que sair do servidor, não do `window`.
 *
 * ─── O defeito ───────────────────────────────────────────────────────────────
 *
 * O widget montava a URL assim:
 *
 *   typeof window !== "undefined" ? window.location.origin : "https://kreator.com.br"
 *
 * É um componente cliente que passa por SSR, então os dois ramos rodam. O
 * servidor escrevia o domínio chumbado no HTML e o cliente o substituía depois
 * de hidratar — o navegador reportava erro de hidratação e o React descartava a
 * subárvore inteira.
 *
 * O aviso era o sintoma barato. O caro é que o link EXIBIDO até a hidratação
 * terminar era o chumbado: numa instalação em domínio próprio, quem copiasse
 * rápido levava um endereço que não é o dele — e os botões de WhatsApp,
 * Telegram e X saíam do mesmo valor.
 *
 * ─── Por que ler o fonte ─────────────────────────────────────────────────────
 *
 * A prova de que sumiu é a página aberta num navegador sem erro de hidratação,
 * e isso foi verificado à mão. O que este arquivo guarda é a causa: enquanto
 * `window.location` não voltar para dentro do componente, o defeito não volta.
 * É a única forma estática de amarrar isso.
 */

const COMPONENT = path.join(process.cwd(), "src", "components", "ui", "custom-link-share.tsx");
const PAGE = path.join(process.cwd(), "src", "app", "[companySlug]", "page.tsx");

/**
 * Comentários fora antes de asserir — as notas deste projeto explicam o defeito
 * CITANDO o código errado, e o teste acharia a menção.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
}

describe("link de compartilhamento da página da empresa", () => {
  const component = stripComments(fs.readFileSync(COMPONENT, "utf8"));
  const page = stripComments(fs.readFileSync(PAGE, "utf8"));

  it("não lê `window.location` para montar a URL", () => {
    expect(component).not.toMatch(/window\.location/);
  });

  it("não carrega domínio chumbado", () => {
    expect(component).not.toMatch(/kreator\.com\.br/);
  });

  it("recebe a origem como prop obrigatória", () => {
    // Opcional com valor padrão traria o problema de volta em silêncio: quem
    // esquecesse de passar veria o padrão, não um erro.
    expect(component).toMatch(/\borigin:\s*string;/);
    expect(component).not.toMatch(/\borigin\?:\s*string/);
  });

  it("a página passa a origem resolvida no servidor", () => {
    expect(page).toMatch(/getRequestOrigin\(\)/);
    expect(page).toMatch(/origin=\{origin\}/);
  });
});
