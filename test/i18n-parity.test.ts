import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Todos os idiomas têm que ter as mesmas chaves.
 *
 * ─── O defeito que motivou este arquivo ──────────────────────────────────────
 *
 * O cartão da secretária de IA — o primeiro bloco da página pública de
 * agendamento — ficou de fora do i18n quando o resto da tela foi traduzido.
 * Nenhum teste pegou, porque todos rodam em Node sem DOM e o texto estava
 * escrito direto no JSX: não havia chave faltando em lugar nenhum, havia
 * ausência total de chave.
 *
 * Só apareceu abrindo a página num navegador com `Accept-Language: en-US`: a
 * tela inteira em inglês e aquele bloco, no topo, em português. O produto
 * atende Brasil e Estados Unidos, então isso é a primeira coisa que metade dos
 * clientes vê.
 *
 * Este arquivo não impede que alguém escreva texto cru no JSX de novo — nada
 * estático impede. Ele garante a outra metade: uma vez que a chave exista, ela
 * existe em TODOS os idiomas, com a mesma forma. Traduzir pela metade é o modo
 * comum de o problema voltar.
 */

const DIR = path.join(process.cwd(), "messages");
const LOCALES = ["pt-BR", "pt-PT", "en", "es"] as const;
const REFERENCE = "pt-BR";

type Json = { [k: string]: string | Json };

function load(locale: string): Json {
  return JSON.parse(fs.readFileSync(path.join(DIR, `${locale}.json`), "utf8"));
}

/** Todos os caminhos folha, em ordem — "booking.frequency", "aiCopilot.title", … */
function leafPaths(obj: Json, prefix = ""): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.push(p);
    else out.push(...leafPaths(v, p));
  }
  return out.sort();
}

/** `{score}`, `{name}` — os marcadores que o next-intl vai substituir. */
function placeholders(s: string): string[] {
  return [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

function valueAt(obj: Json, dotted: string): string {
  let cur: Json | string = obj;
  for (const part of dotted.split(".")) {
    cur = (cur as Json)[part];
  }
  return cur as string;
}

describe("paridade entre os arquivos de tradução", () => {
  const reference = load(REFERENCE);
  const refPaths = leafPaths(reference);

  it("o idioma de referência não está vazio", () => {
    // Guarda contra o teste passar por não ter o que comparar.
    expect(refPaths.length).toBeGreaterThan(50);
  });

  for (const locale of LOCALES.filter((l) => l !== REFERENCE)) {
    it(`${locale} tem exatamente as mesmas chaves que ${REFERENCE}`, () => {
      const paths = leafPaths(load(locale));
      const faltando = refPaths.filter((p) => !paths.includes(p));
      const sobrando = paths.filter((p) => !refPaths.includes(p));
      expect({ faltando, sobrando }).toEqual({ faltando: [], sobrando: [] });
    });

    it(`${locale} usa os mesmos marcadores em cada texto`, () => {
      // Traduzir "com {score}% de confiança" e esquecer o `{score}` deixa o
      // número de fora — some do texto sem erro nenhum em tempo de execução.
      const other = load(locale);
      const divergentes: string[] = [];
      for (const p of refPaths) {
        const a = placeholders(valueAt(reference, p));
        const b = placeholders(valueAt(other, p)).filter(Boolean);
        if (a.join(",") !== b.join(",")) divergentes.push(`${p}: ${REFERENCE}=[${a}] ${locale}=[${b}]`);
      }
      expect(divergentes).toEqual([]);
    });

    it(`${locale} não tem texto vazio`, () => {
      const other = load(locale);
      const vazios = refPaths.filter((p) => !valueAt(other, p)?.trim());
      expect(vazios).toEqual([]);
    });
  }

  it("o cartão da secretária de IA está traduzido em todos os idiomas", () => {
    // O bloco específico que estava cru. Explicitado para que apagá-lo do
    // componente não passe despercebido junto com as chaves.
    for (const locale of LOCALES) {
      const m = load(locale);
      expect(m.aiCopilot, `${locale} sem aiCopilot`).toBeTruthy();
      expect(leafPaths(m.aiCopilot as Json).length).toBeGreaterThan(10);
    }
  });
});
