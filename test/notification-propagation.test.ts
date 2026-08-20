import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Toda notificação precisa PROPAGAR a falha.
 *
 * ─── O que estava quebrado ───────────────────────────────────────────────────
 *
 * As seis funções `notify*` tinham `catch (err) { console.error(...) }` e
 * nenhuma relançava. Quem as chama é `processOutbox`, que tem a máquina de
 * retry completa — tentativas, backoff de 1min/5min/15min/1h/6h, e `FAILED`
 * depois de esgotar.
 *
 * Essa máquina NUNCA disparava. Como nada chegava até ela, toda notificação era
 * marcada `SENT` — inclusive as que o provedor de e-mail recusou. O propósito
 * declarado da fila ("se o provedor estiver fora no momento do cron, o lembrete
 * é reenviado na próxima passada") não valia para nenhum tipo.
 *
 * ─── Por que teste estático ──────────────────────────────────────────────────
 *
 * O defeito não é de comportamento observável em caminho feliz: com o provedor
 * de pé, tudo funciona igual. Ele só aparece quando o envio falha — e o que o
 * causa é uma linha ausente. Verificar a ausência dessa linha é exatamente o
 * que este teste faz, no mesmo espírito de `server-actions-guard.test.ts`.
 */

const FILE = path.resolve(__dirname, "..", "src", "lib", "notifications.ts");

describe("propagação de falha nas notificações", () => {
  const source = fs.readFileSync(FILE, "utf8");

  /** Corpo de cada `export async function notify…` até a próxima. */
  function notifiers(): Array<{ name: string; body: string }> {
    const parts = source.split(/\nexport async function /).slice(1);
    return parts
      .map((p) => ({ name: p.slice(0, p.indexOf("(")), body: p }))
      .filter((p) => p.name.startsWith("notify"));
  }

  it("existe mais de uma notificação para conferir", () => {
    // Se a extração quebrar, o teste passaria vazio e não protegeria nada.
    expect(notifiers().length).toBeGreaterThanOrEqual(5);
  });

  it("nenhuma engole o erro em silêncio", () => {
    const engolem = notifiers()
      .filter((n) => /\}\s*catch\s*\(/.test(n.body))
      .filter((n) => !/throw\s+err/.test(n.body))
      .map((n) => n.name);

    expect(
      engolem,
      "Notificação com `catch` que não relança.\n" +
        "Quem chama é a fila: sem o `throw`, ela marca SENT mesmo quando o envio\n" +
        "falhou, e a máquina de retry nunca dispara."
    ).toEqual([]);
  });

  it("todo tipo declarado na fila é enfileirado por alguém", () => {
    /**
     * `BOOKING_COMPLETED_INVOICE` existia na fila e não era enfileirado por
     * lugar nenhum: o disparo real era uma chamada direta com `void`, que numa
     * função serverless pode ser cortada logo depois da resposta.
     */
    const outbox = fs.readFileSync(
      path.resolve(__dirname, "..", "src", "lib", "notification-outbox.ts"),
      "utf8"
    );
    const kinds = [...outbox.matchAll(/\|\s*"([A-Z_]+)"/g)].map((m) => m[1]);
    expect(kinds.length).toBeGreaterThanOrEqual(5);

    const srcDir = path.resolve(__dirname, "..", "src");
    const all: string[] = [];
    (function walk(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "generated") walk(full);
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          all.push(fs.readFileSync(full, "utf8"));
        }
      }
    })(srcDir);
    const haystack = all.join("\n");

    const orfaos = kinds.filter((k) => !haystack.includes(`kind: "${k}"`));
    expect(
      orfaos,
      "Tipo declarado na fila que ninguém enfileira — ou está morto, ou o " +
        "disparo real está acontecendo por fora dela."
    ).toEqual([]);
  });
});
