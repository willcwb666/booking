import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Guarda de regressão para a superfície de server actions.
 *
 * Uma server action é um endpoint HTTP próprio: o layout que protege a página
 * NÃO protege a action. Esta sessão encontrou oito actions de gestão abertas
 * exatamente por esse motivo, e nenhuma foi pega por teste — os testes
 * existentes cobrem lógica pura.
 *
 * Este arquivo não testa comportamento em tempo de execução; ele lê o código e
 * exige que toda action esteja em um de dois estados declarados:
 *
 *  1. tem verificação de acesso no corpo (ou chama um auxiliar que tem); ou
 *  2. está em `PUBLIC_ACTIONS` — decisão consciente, com o motivo escrito.
 *
 * O ponto é o passo 2: adicionar uma action de gestão sem guarda quebra o
 * teste, e a única forma de fazê-lo passar é escrever aqui por que ela é
 * pública. Isso transforma "esqueci" em "declarei".
 */

const ACTIONS_DIR = "src/server/actions";

/** Nomes que indicam verificação de identidade ou de acesso. */
const GUARD_HINTS = [
  "getSession",
  "getActiveSession",
  "requireSuperAdmin",
  "assertSuperAdmin",
  "canAccessCompany",
  // Envelopa `canAccessCompany` e ainda exige a licença do módulo — é uma
  // porta mais estreita, não mais larga.
  "canAccessModule",
  "requireAdmin",
  "verifyCompanyAccess",
  "resolveCompanyForManage",
  "withCompanyAuth",
];

/**
 * Actions deliberadamente públicas, com o motivo.
 *
 * Público aqui significa "alcançável sem sessão", não "sem proteção": todas
 * precisam de rate limit, verificado pelo segundo teste deste arquivo.
 */
const PUBLIC_ACTIONS: Record<string, string> = {
  // Credenciais — não pode exigir sessão para criar uma sessão
  "auth.ts:registerAction": "cadastro",
  "auth.ts:loginAction": "login",
  "auth.ts:logoutAction": "encerra a própria sessão",

  // Fluxo de agendamento do cliente final, que não tem conta
  "booking-slots.ts:getAvailableSlotsAction": "horários livres na página pública",
  "booking.ts:createBookingAction": "o cliente agenda sem login",
  "booking.ts:checkPixPaymentAction": "polling do PIX no checkout público",
  "estimate.ts:upsertEstimateAction": "orçamento público, antes de existir conta",
  "waitlist.ts:joinWaitlistAction": "entrar na fila de espera sem login",
  "ghost-slot-buster.ts:getActiveGhostSlotsAction": "vagas de última hora na página pública",

  // Dados públicos da empresa, exibidos na página de agendamento
  "landing-page-settings.ts:getCompanyLandingPageConfigAction": "aparência da página pública",
  "payment-gateways.ts:getCompanyPaymentGatewaysAction": "meios de pagamento no checkout público",
  "loyalty.ts:getCompanyLoyaltyProgramAction": "regras do programa exibidas ao cliente",
  "changelog.ts:getChangelogReleasesAction": "lê o CHANGELOG.md do repositório",

  // Códigos informados pelo próprio portador
  "gift-cards.ts:validateGiftCardAction": "o cliente valida o código que tem em mãos",
  "memberships.ts:checkCustomerMembershipCoverageAction": "cobertura do clube no checkout",

  // Check-in do cliente, autorizado por token assinado na URL
  "checkin.ts:getBookingCheckinInfoAction": "token assinado faz o papel da sessão",
  "checkin.ts:performSmartCheckinAction": "token assinado faz o papel da sessão",
  "review-request.ts:getReviewLinkInfoAction": "token assinado no e-mail; a maioria dos clientes não tem conta",
  "review-request.ts:submitReviewByLinkAction": "token assinado no e-mail; a maioria dos clientes não tem conta",

  // Delega para uma action guardada
  "professionals.ts:deleteProfessionalAction": "encaminha para setProfessionalActiveAction",
};

/** Actions públicas que não precisam de rate limit, com o motivo. */
const NO_RATE_LIMIT_NEEDED: Record<string, string> = {
  "auth.ts:logoutAction": "encerra a própria sessão; abuso não faz sentido",
  "changelog.ts:getChangelogReleasesAction": "lê um arquivo estático do repositório",
  "professionals.ts:deleteProfessionalAction": "delega para action guardada",
};

/**
 * Sinais de que a action amarra o usuário A ESTA empresa.
 *
 * `GUARD_HINTS` responde "autentica?". Estes respondem a pergunta seguinte,
 * que é outra: "autoriza?". Cinco actions passavam na primeira e falhavam na
 * segunda — confirmavam que havia sessão e iam direto ao banco pelo slug, que
 * é público. Com uma conta qualquer da plataforma dava para reescrever o
 * gateway de pagamento, pichar a página pública ou cancelar o agendamento de
 * qualquer empresa.
 */
const AUTHZ_HINTS = [
  "canAccessCompany",
  "canAccessModule",
  "isModuleLicensed",
  "getCompanyBySlugForUser",
  "withCompanyAuth",
  "requireSuperAdmin",
  "assertSuperAdmin",
  "requireAdmin",
  "resolveCompanyForManage",
  "companyUser.find",
  // Checagem de super admin escrita na mão, sem auxiliar
  'user.role !== "admin"',
  'user.role === "admin"',
];

/** A action recebe um identificador de empresa? Então tem de amarrá-lo. */
const COMPANY_PARAM =
  /company(Slug|Id)\s*[:,)]|formData\.get\(\s*["']company(Slug|Id)["']/;

/**
 * Actions que recebem a empresa e legitimamente NÃO amarram o usuário a ela.
 *
 * Mesmo espírito de `PUBLIC_ACTIONS`: a saída é declarar o motivo, não afrouxar
 * a regra.
 */
const UNSCOPED_ACTIONS: Record<string, string> = {
  // Fluxo do cliente final, que não é membro de empresa nenhuma
  "booking.ts:createBookingAction": "o cliente agenda sem login",
  "booking.ts:checkPixPaymentAction": "polling do PIX no checkout público",
  "estimate.ts:upsertEstimateAction": "orçamento público",
  "estimate.ts:submitEstimateAction": "orçamento público; empresa vem do bookingConfigId",
  "ghost-slot-buster.ts:getActiveGhostSlotsAction": "vagas de última hora na página pública",
  "memberships.ts:checkCustomerMembershipCoverageAction": "cobertura do clube no checkout",

  // Leitura de dado que a página pública já exibe
  "landing-page-settings.ts:getCompanyLandingPageConfigAction": "aparência da página pública",
  "payment-gateways.ts:getCompanyPaymentGatewaysAction": "meios de pagamento no checkout",

  // Token assinado na URL faz o papel da sessão
  "checkin.ts:getBookingCheckinInfoAction": "token assinado",
  "checkin.ts:performSmartCheckinAction": "token assinado",
  "review-request.ts:getReviewLinkInfoAction": "token assinado no e-mail",

  // Amarra por outro eixo que não a empresa
  "review.ts:submitReviewAction": "confere que o agendamento é do próprio usuário",
  "ai-copilot.ts:parseAIBookingIntentAction": "exige sessão e rate limit por usuário; só lê nomes de serviço",

  // Não há empresa a que pertencer ainda
  "company.ts:createCompanyWizardAction": "cria a empresa",
};

type Action = { file: string; name: string; body: string; key: string };

function collectActions(): { actions: Action[]; sources: Map<string, string> } {
  const actions: Action[] = [];
  const sources = new Map<string, string>();

  for (const file of readdirSync(ACTIONS_DIR).filter((f) => f.endsWith(".ts"))) {
    const src = readFileSync(join(ACTIONS_DIR, file), "utf8");
    if (!/^\s*["']use server["']/m.test(src.split("\n").slice(0, 3).join("\n"))) {
      continue;
    }
    sources.set(file, src);

    /**
     * Auxiliares do próprio arquivo que já contêm verificação.
     *
     * Dois conjuntos, porque são duas perguntas. `guardedHelpers` carrega
     * autenticação; `authzHelpers`, o vínculo com a empresa. Um auxiliar como
     * `verifyCompanyAccess` faz as duas coisas, mas um que só chama
     * `getSession` faz apenas a primeira — e tratar os dois como o mesmo
     * conjunto daria por autorizadas 41 actions que não são.
     */
    const guardedHelpers = new Set<string>();
    const authzHelpers = new Set<string>();
    for (const m of src.matchAll(/^(?:async )?function (\w+)/gm)) {
      const after = src.slice(m.index! + m[0].length);
      const nextIdx = after.search(/^(?:export )?(?:async )?function /m);
      const helperBody = nextIdx === -1 ? after : after.slice(0, nextIdx);
      if (GUARD_HINTS.some((h) => helperBody.includes(h))) {
        guardedHelpers.add(m[1]);
      }
      if (AUTHZ_HINTS.some((h) => helperBody.includes(h))) {
        authzHelpers.add(m[1]);
      }
    }

    for (const m of src.matchAll(/^export async function (\w+)\s*\(/gm)) {
      const after = src.slice(m.index! + m[0].length);
      const nextIdx = after.search(/^export /m);
      let body = nextIdx === -1 ? after : after.slice(0, nextIdx);
      // Auxiliar guardado chamado no corpo conta como guarda
      for (const helper of guardedHelpers) {
        if (new RegExp(`\\b${helper}\\s*\\(`).test(body)) body += "\n/*guarded*/getSession";
      }
      for (const helper of authzHelpers) {
        if (new RegExp(`\\b${helper}\\s*\\(`).test(body)) body += "\n/*authz*/canAccessCompany";
      }
      actions.push({ file, name: m[1], body, key: `${file}:${m[1]}` });
    }
  }

  return { actions, sources };
}

const { actions, sources } = collectActions();

describe("superfície de server actions", () => {
  it("encontra as actions do projeto", () => {
    // Se a coleta quebrar, os testes abaixo passariam vazios — o pior
    // resultado possível para uma guarda de segurança.
    expect(actions.length).toBeGreaterThan(100);
  });

  it("toda action tem verificação de acesso ou está declarada como pública", () => {
    const undeclared = actions
      .filter((a) => !GUARD_HINTS.some((h) => a.body.includes(h)))
      .filter((a) => !(a.key in PUBLIC_ACTIONS))
      .map((a) => a.key);

    expect(
      undeclared,
      `Action sem verificação de acesso e sem declaração de que é pública.\n` +
        `Server action é endpoint HTTP: o layout da página não a protege.\n` +
        `Ou adicione requireSuperAdmin/canAccessCompany/withCompanyAuth,\n` +
        `ou registre em PUBLIC_ACTIONS com o motivo.`
    ).toEqual([]);
  });

  it("toda action pública passa por rate limit", () => {
    const unprotected = Object.keys(PUBLIC_ACTIONS)
      .filter((key) => !(key in NO_RATE_LIMIT_NEEDED))
      .filter((key) => {
        const action = actions.find((a) => a.key === key);
        if (!action) return false;
        return !/enforceRateLimit|rateLimit\(/.test(action.body);
      });

    expect(
      unprotected,
      "Action pública sem rate limit. Sem sessão para responsabilizar, o " +
        "limite de taxa é a única barreira contra abuso."
    ).toEqual([]);
  });

  it("PUBLIC_ACTIONS não guarda entradas obsoletas", () => {
    // Uma exceção que sobrevive à remoção da action vira permissão fantasma:
    // se alguém recriar o nome depois, ela passa sem revisão.
    const stale = Object.keys(PUBLIC_ACTIONS).filter(
      (key) => !actions.some((a) => a.key === key)
    );
    expect(stale, "Entrada de PUBLIC_ACTIONS sem action correspondente").toEqual([]);
  });

  it("action que recebe empresa amarra o usuário a ela, ou declara por quê", () => {
    const unscoped = actions
      .filter((a) => COMPANY_PARAM.test(a.body))
      .filter((a) => !AUTHZ_HINTS.some((h) => a.body.includes(h)))
      .filter((a) => !(a.key in UNSCOPED_ACTIONS))
      .map((a) => a.key);

    expect(
      unscoped,
      `Action recebe o slug/id da empresa e não confere se o usuário pertence a ela.
` +
        `"Tem sessão" não é "tem permissão": o slug é público, está na URL de
` +
        `agendamento de toda empresa. Use canAccessCompany/canAccessModule/
` +
        `withCompanyAuth, ou registre em UNSCOPED_ACTIONS com o motivo.`
    ).toEqual([]);
  });

  it("UNSCOPED_ACTIONS não guarda entradas obsoletas", () => {
    const stale = Object.keys(UNSCOPED_ACTIONS).filter(
      (key) => !actions.some((a) => a.key === key)
    );
    expect(stale, "Entrada de UNSCOPED_ACTIONS sem action correspondente").toEqual([]);
  });

  it("nenhum arquivo de action exporta algo que não seja função async", () => {
    // O coletor acima só enxerga `export async function`, então um
    // `export const` passava despercebido por este arquivo inteiro. Quem pegava
    // era o Turbopack, no fim de um build de 30 segundos, com uma mensagem
    // sobre Ecmascript. Aqui a falha vem em um segundo e diz o que fazer.
    //
    // `export type` e `export interface` são permitidos: somem na compilação e
    // não viram endpoint.
    const offenders: string[] = [];
    for (const [file, src] of sources) {
      for (const m of src.matchAll(/^export\s+(const|let|var|class|enum)\s+(\w+)/gm)) {
        offenders.push(`${file}:${m[2]} (export ${m[1]})`);
      }
      for (const m of src.matchAll(/^export\s+function\s+(\w+)/gm)) {
        offenders.push(`${file}:${m[1]} (função não-async)`);
      }
    }

    expect(
      offenders,
      "Arquivo `use server` só pode exportar função async — o Next recusa o build.\n" +
        "Constante ou tipo compartilhado vai para src/lib."
    ).toEqual([]);
  });

  it("nenhum arquivo de action exporta função utilitária sem sufixo Action", () => {
    // Foi assim que `awardLoyaltyPointsForBooking` e `notifyWaitlistForDate`
    // viraram endpoints públicos sem ninguém perceber: eram utilitários
    // internos que só estavam no arquivo errado.
    const offenders = actions
      .filter((a) => !a.name.endsWith("Action"))
      .map((a) => a.key);

    expect(
      offenders,
      "Export de arquivo `use server` que não é uma action.\n" +
        "Todo export vira endpoint HTTP. Se é utilitário interno, mova para src/lib."
    ).toEqual([]);
  });
});

describe("rate limit centralizado", () => {
  const rateLimitSrc = readFileSync("src/lib/rate-limit.ts", "utf8");

  it("não restam chamadas ao helper legado rateLimit(key, limit, window)", () => {
    const legacy: string[] = [];
    for (const [file, src] of sources) {
      // `enforceRateLimit(` também casa com `rateLimit(`; exige limite à esquerda
      if (/[^e]\brateLimit\(\s*[`"']/.test(src)) legacy.push(file);
    }
    expect(
      legacy,
      "Chamada ao helper legado: os números passam a morar no call site e " +
        "divergem de RATE_LIMITS em silêncio."
    ).toEqual([]);
  });

  it("toda política de RATE_LIMITS tem pelo menos um call site", () => {
    const declared = [...rateLimitSrc.matchAll(/^\s{2}([A-Z_]+):\s*\{/gm)].map((m) => m[1]);
    expect(declared.length).toBeGreaterThan(10);

    const allSrc = [
      ...sources.values(),
      readFileSync("src/lib/auth-rate-limit.ts", "utf8"),
      ...readdirSync("src/app/api", { recursive: true, encoding: "utf8" })
        .filter((f) => typeof f === "string" && f.endsWith("route.ts"))
        .map((f) => readFileSync(join("src/app/api", f), "utf8")),
    ].join("\n");

    const orphans = declared.filter(
      (name) => !new RegExp(`RATE_LIMITS\\.${name}\\b`).test(allSrc)
    );

    expect(
      orphans,
      "Política declarada e nunca aplicada. Dá impressão de cobertura numa " +
        "revisão de segurança sem proteger nada."
    ).toEqual([]);
  });
});
