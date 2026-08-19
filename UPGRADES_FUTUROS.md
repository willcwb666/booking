# Roadmap de Upgrades — Kreator SaaS

Documento de decisão sobre as 15 funcionalidades propostas. Cada ficha traz o
veredito, o que **já existe no código**, o escopo da v1 e — quando é o caso — o
que **não** deve ser construído.

Revisado em 2026-08-19 contra o schema (`prisma/schema.prisma`) e o código em
`src/`. Onde o documento anterior descrevia algo como novo e a peça já estava
pronta, o texto foi corrigido.

**Estado atual: 3 itens concluídos, 12 abertos. O Bloco 1 está fechado.**

---

## Duas regras que valem para o documento inteiro

**1. Nenhum número de resultado sem fonte.** A versão anterior prometia "+18% a
25% de faturamento" e "no-show de 22% para menos de 3%". Não há base para isso.
Enquanto ficam num documento interno, são hipótese. Se forem para material de
venda nos EUA, a FTC trata claim de resultado sem substanciação como propaganda
enganosa, e é acionável. Números de projeção neste arquivo aparecem marcados
como *hipótese a validar*.

**2. Parar de posicionar por "o que os concorrentes não têm".** Fresha tem sinal
e proteção de no-show. Boulevard tem precificação por demanda e lista de espera.
Booksy tem agendamento em grupo. Vender uma feature que o concorrente tem é o
pior lugar para se colocar: o comprador testa e perde a confiança no resto do
pitch. A vantagem real do Kreator é outra — **um motor multi-segmento**
(barbearia, oficina, pet shop, clínica na mesma base) com preço de entrada
menor. As features abaixo defendem essa posição; não a substituem.

---

## Resumo executivo

| # | Ideia | Veredito | Esforço |
|---|---|---|---|
| 05 | Smart Dynamic Deposit | ✅ **Concluído** — `cc53ed2` | — |
| 12 | Split POS: comissão híbrida | ✅ **Concluído** — `c01e462` | — |
| 03 | 2FA | ✅ **Concluído** — `0bbdb7c` + `61695db` | — |
| 06 | Win-back de inativos | ✅ **Concluído** — `9e13414` (+ `0fd4b60`) | — |
| 08 | Review & Google Maps Booster | ✅ **Concluído** — `5dfcd18`, sem review gating | — |
| 04 | Yield management | ✅ **Concluído** — `e7fa3ab`, só o desconto | — |
| 13 | Estoque | ✅ **Concluído** — `f273dfb`, só o alerta | — |
| 02 | Kreator Pass | ✅ **Concluído** — `4404d96` | — |
| 11 | Drive-time & buffer de trânsito | ✅ **Concluído** — `6124589`, haversine | — |
| 09 | Before/After Vault | **Fazer o cofre, não a IA** | 5–6 d |
| 14 | Metas da equipe | **Fazer só o painel individual** | 3 d |
| 01 | i18n autônoma | **Fazer depois** — DDI agora, cache de tradução depois | 4–6 d |
| 10 | Family & Group Booking | **Reduzir escopo drasticamente** | 10–15 d |
| 07 | AI WhatsApp Receptionist | **Por último**, como add-on licenciado | 20–30 d |
| 15 | Offline-first PWA | **Só leitura** — não fazer sync bidirecional | 1 d / — |

Esforço em dias de trabalho de um desenvolvedor, incluindo teste. É estimativa
grosseira para ordenar, não compromisso.

---

## Ordem de execução

### Bloco 1 — Dinheiro e confiança — ✅ concluído
~~`05 sinal dinâmico`~~ → ~~`12 comissão híbrida`~~ → ~~`03 2FA`~~

Os três atacavam perda direta de receita e risco de conta.

### Bloco 2 — Retenção — ✅ concluído
~~`06 win-back`~~ → ~~`08 review`~~ → ~~`04 desconto ocioso`~~ →
~~`13 alerta de estoque`~~

Tudo calculado sobre dado que já existe. Nenhuma integração externa nova — e
assim ficou: nenhum dos quatro precisou de serviço de terceiro.

### Bloco 3 — Diferenciação (4–6 semanas) — **em andamento**
~~`02 Kreator Pass`~~ → ~~`11 drive-time`~~ → `09 vault` →
`14 painel individual`

### Bloco 4 — A aposta
`07 AI Receptionist`, como módulo licenciado (`SystemModule` +
`CompanyModuleLicense` já existem exatamente para isso).

### Fora do roadmap
- `15` sync bidirecional offline
- `13` dedução de insumo por ficha técnica
- `04` acréscimo de preço no pico
- `08` na forma de *review gating*

Os motivos estão nas fichas.

---

## Inventário: o que já está construído

Cinco itens da lista original foram descritos como novos e já estão 60–80%
prontos. Ignorar isso distorce a priorização inteira.

| Item | Peça pronta |
|---|---|
| 01 DDI Engine | `src/lib/markets.ts` mapeia DDI → moeda, locale, timezone e máscara telefônica. `Company.currency/timezone/locale` existem. `messages/` tem pt-BR, pt-PT, en, es |
| 04 Yield | `src/lib/agenda/ghost-slot-buster.ts` já calcula desconto de última hora para slot vago |
| 05 Sinal | `CompanyPaymentSettings.requireDeposit` / `depositPercentage`; `Customer.noShowCount`, `completedBookings`, `cancelledBookings`, `totalSpent`, `lastBookingDate`; `Company.maxAllowedNoShows`, `minCancellationNoticeHours`, `cancellationFee` |
| 12 Split POS | `PosSale.professionalId` e `commissionAmount`; `SaleItem.type` (PRODUCT/SERVICE/FEE); `Product.barcode`; **`Professional.productCommissionRate` já separado de `commissionRate`**, e `pos.ts` já aplica as duas taxas por tipo de item |
| 13 Estoque | `Product.minStockThreshold`, `StockMovement` com tipos IN/OUT/SALE/RETURN |

Outras peças relevantes já disponíveis:

- **IA**: `src/lib/ai/gemini-client.ts` (Gemini 2.0 Flash + fallback Groq + fallback determinístico local), `booking-copilot.ts`, `admin-copilot.ts`
- **WhatsApp**: `src/lib/whatsapp.ts` — gateway local (Evolution/Baileys) e Meta Cloud API
- **Geo**: `src/lib/geo/haversine.ts`; `Company.latitude/longitude/checkinRadiusMeters`
- **Armazenamento**: `src/lib/r2.ts` (Cloudflare R2 com presigned URL)
- **E-mail**: Resend via `src/lib/email.ts`; `Promotion.lastSentAt` já registra envio de campanha
- **Fidelidade**: `LoyaltyProgram` / `LoyaltyAccount`
- **Avaliação**: `Review` (1–5, um por booking)
- **Multiempresa**: `/selecionar-empresa`, `Customer` isolado por `@@unique([companyId, email])`
- **Licenciamento**: `SystemModule` + `CompanyModuleLicense`
- **Presets**: `SystemPreset` / `SystemSegment` por tipo de negócio

Construído nesta rodada (2026-08-19), disponível para os próximos itens:

- **Moeda por transação**: `Estimate.currency` e `PosSale.currency`, carimbadas
  no ato. Painel da plataforma agrega por moeda em vez de somar mercados.
- **Faixa de confiança do cliente**: `src/lib/trust-tier.ts` +
  `src/server/queries/customer-trust.ts`. Serve ao item 06 (win-back) e ao 04.
- **Taxas de comissão unificadas**: `src/lib/commission-rates.ts`.
- **2FA**: plugin ligado, `TwoFactor` migrado, `/verificacao` no ar.

Não existe: PWA (nenhum manifest, nenhum service worker), tabela de regra de
comissão por categoria, perfil de usuário global (`UserProfile` do item 02),
comissão carimbada em `Booking`.

---

# Bloco 1 — Dinheiro e confiança

## 05. Smart Dynamic Deposit — ✅ CONCLUÍDO (`cc53ed2`, 2026-08-19)

### O que foi entregue
- `src/lib/trust-tier.ts` — puro, sem I/O, no padrão de `pricing.ts`. 15 testes.
- `src/server/queries/customer-trust.ts` — contadores lidos de `booking`, **não**
  dos campos denormalizados de `customer`: divergência entre os dois custaria
  dinheiro do cliente.
- `CompanyPaymentSettings.dynamicDeposit` — chave por empresa, nasce desligada.
- Aba Clientes das configurações: chave, percentual e a tabela das quatro faixas.

### Três decisões que mudaram o desenho original
- **Janela de 180 dias para a falta pesar.** Sem recorte, `noShowCount` é
  condenação perpétua e o cliente nunca volta ao normal — some o próprio
  incentivo de voltar.
- **`dynamicDeposit` nasce desligado.** Ligar muda quanto os clientes pagam, e
  essa troca é do dono, não efeito colateral de aplicar migration. Desligado, o
  comportamento é o de `requireDeposit` bit a bit, com teste garantindo.
- **Não existe action pública que receba e-mail e devolva a faixa.** Seria um
  oráculo: qualquer um descobriria quem tem falta registrada em qualquer empresa
  e varreria uma lista para mapear a carteira de um concorrente. O checkout
  resolve a faixa pelo e-mail da **sessão**; anônimo vê a faixa neutra e o
  servidor reavalia na criação.

### Achado colateral
A aba de clientes afirmava que passar de `maxAllowedNoShows` bloqueava o
agendamento gratuito e exigia sinal. **Não existia** — o número era só guardado.
Agora existe, e o texto foi reescrito para descrever o que de fato acontece.

### Pendente deste item
A faixa ainda não aparece na ficha do cliente (`/clientes`), só nas
configurações. É a peça que faltou do escopo original.

<details>
<summary>Análise original (mantida para referência)</summary>

### A dor
Exigir sinal de cliente fiel gera atrito e ofende. Não exigir de cliente
desconhecido em horário nobre gera falta. Hoje o sinal é uma chave liga/desliga
global da empresa — ou cobra de todo mundo, ou de ninguém.

### Já existe
Quase tudo. `requireDeposit` e `depositPercentage` em `CompanyPaymentSettings`;
`noShowCount`, `completedBookings`, `cancelledBookings` em `Customer`;
`maxAllowedNoShows` em `Company`. Falta a regra que liga uma coisa na outra.

### Escopo v1 — quatro faixas, não um score
```
Confiável   → 3+ atendimentos concluídos, 0 no-show      → sem sinal
Neutro      → histórico curto ou 1 falta antiga          → sem sinal fora de pico
Risco       → no-show recente, ou cliente novo em pico   → sinal de X%
Bloqueado   → acima de maxAllowedNoShows                 → só com pagamento integral
```

A faixa é exibida ao dono na ficha do cliente, com o motivo em texto.

### O que não fazer
**Não construir um "score de IA de 0 a 100".** Um número opaco que decide cobrar
dinheiro de alguém é um pesadelo de atendimento — o dono não consegue explicar
ao cliente por que ele caiu de 71 para 64, e nos EUA um critério automatizado
não explicável que restringe acesso a serviço é exposição regulatória
desnecessária. Quatro faixas derivadas de contadores visíveis fazem o mesmo
trabalho e são defensáveis numa discussão.

### Riscos e detalhes
- **Caução vs. sinal**: pré-autorização de cartão é suportada pelo Stripe, mas é
  complicada no Mercado Pago. A v1 cobra um sinal real que **vira crédito** no
  atendimento — mesma proteção, sem depender de pré-auth.
- O estorno já está implementado (`refundAmount`/`refundedAt` + `booking-reversal.ts`);
  a política de devolução do sinal precisa respeitar `minCancellationNoticeHours`.

*Hipótese a validar: redução de faltas. Instrumentar `noShowCount` antes e
depois para ter número próprio.*

</details>

---

## 12. Split POS: comissão híbrida — ✅ CONCLUÍDO (`c01e462`, 2026-08-19)

### O achado que mudou o escopo — de novo
A ficha anterior (corrigida em 2026-08-19 de manhã) dizia que faltavam
"granularidade por categoria e o extrato em duas colunas". Ao abrir o relatório,
o problema era outro e maior:

**O extrato somava apenas `booking`. Toda venda de balcão ficava de fora.** O PDV
calculava a comissão de produto, gravava em `pos_sale.commissionAmount`, e nada
disso chegava ao relatório. O profissional que vendeu R$ 500 em produtos via
zero, e o dono conferia na planilha. Era o "inferno de planilha" do roadmap
acontecendo **dentro do próprio módulo que promete resolvê-lo**.

### O que foi entregue
- `src/lib/commission-rates.ts` — puro, 11 testes. Uma resposta só para "quanto
  este profissional ganha".
- `SaleItem.commissionAmount` — comissão carimbada **no ato da venda**. Ficou no
  item, e não em duas colunas na venda, para qualquer agrupamento futuro (por
  categoria, por serviço) sair do mesmo dado sem nova migration.
- `getCompanyCommissionReport` reescrito: inclui o PDV, separa serviço de
  produto, e agrega em SQL — antes carregava todos os agendamentos concluídos do
  período com o orçamento junto para somar em JavaScript.
- Taxa de produto editável na tela de comissões; CSV com as duas colunas.

### Três fontes de verdade viraram uma
`Professional` acumulou três campos para duas ideias, e cada lugar resolvia a
ambiguidade do seu jeito:

| Onde | O que usava |
|---|---|
| PDV | `commissionRate ?? commissionPercentage` |
| Relatório | só `commissionPercentage` |
| Listagem de profissionais | os dois se cobrindo em ordem inversa |

Dois comportamentos que os testes agora fixam:
- **Zero explícito é respeitado.** Um `??` ingênuo faria `commissionRate = 0`
  cair no legado — zerar a comissão de alguém ressuscitaria a taxa antiga.
- **Sem taxa de produto, produto paga zero** — não a taxa de serviço. Vender uma
  pomada não pode pagar como cortar cabelo por omissão.

### Por que não houve backfill
`pos_sale` guarda só o total e a taxa vigente naquele dia nunca foi registrada.
Ratear por regra de três com a taxa de hoje produziria números plausíveis e
falsos num relatório de pagamento. O período antigo aparece à parte, com o total
íntegro e a origem declarada como desconhecida.

### Não entrou (e continua valendo se a dor aparecer)
Granularidade por categoria — "10% em cosmético, 5% em bebida". Hoje é uma taxa
de produto e uma de serviço por profissional. A forma seria uma **tabela de
regra**:

```
CommissionRule
  professionalId?   (null = regra padrão da empresa)
  itemType          SERVICE | PRODUCT
  serviceTypeId?    (null = todos os serviços)
  productCategory?  (null = todas as categorias)
  mode              PERCENT | FIXED
  value
```
Resolução por especificidade: profissional+categoria → profissional+tipo →
empresa+tipo → `resolveRates()` como fallback. Manter o fallback evita migração
de dados e não quebra quem já configurou.

### Dívida anotada no código, não resolvida
**`Booking` não guarda comissão.** Ela é recalculada com a taxa atual, então
mudar a comissão de um profissional **reescreve retroativamente** o que ele
ganhou em serviços no mês passado. O balcão já está imune desde este commit; o
agendamento precisaria da mesma coluna e de migrar o histórico. Está comentado
em `src/server/queries/commissions.ts`.

### Sobre o leitor de código de barras
`Product.barcode` já existe. A API `BarcodeDetector` funciona no Chrome Android
e **não funciona no Safari iOS** — é preciso fallback via `zxing-js`, ou o
recurso não existe para metade dos aparelhos. Saber disso antes de prometer na
landing page.

---

## 03. 2FA multi-canal — ✅ CONCLUÍDO (`0bbdb7c` + `61695db`, 2026-08-19)

### O que já funciona
- Plugin `twoFactor` do better-auth ligado, `appName: "Kreator"` como issuer do
  TOTP. Model `TwoFactor` + `User.twoFactorEnabled` migrados.
- Canais: **TOTP** (principal), **OTP por e-mail** via Resend, **8 códigos de
  recuperação** de uso único.
- `/verificacao` — segunda etapa do login, com as três alternativas sempre
  visíveis.
- Painel de ativação em Perfil → Segurança (`src/components/ui/two-factor-panel.tsx`).
- Obrigatório para `OWNER`, `MANAGER` e super admin.

### Decisões de fluxo que valem registro
- **Ativação em duas etapas.** O segredo é gerado mas só passa a valer depois que
  o usuário confirma um código. Sem isso, quem cadastrasse errado no app ficaria
  trancado fora da própria conta na hora seguinte.
- **Códigos de recuperação aparecem ANTES do cadastro no app**, com o aviso de
  que é a única vez. Quem perde o celular precisa já ter salvado.
- **Senha exigida para ativar E para desativar.** É o que impede uma sessão
  roubada — o cenário contra o qual o 2FA existe — de ligar o segundo fator no
  aparelho do atacante ou desligar o da vítima.
- **Erro de código é sempre a mesma mensagem** para inválido, expirado e já
  usado: distinguir diria a quem tenta adivinhar qual parte ele acertou.
- **Alternativas sempre visíveis na tela de verificação.** Quem perdeu o celular
  chega ali em pânico; esconder a saída atrás de um link discreto gera chamado de
  suporte que o produto consegue evitar.

### O reset auditado do super admin — entregue em `61695db`
Os três freios, todos verificados no servidor:

1. **Carência de 24h** (`executeAfter`). Verificada na action, não escondendo o
   botão — quem chama a action direto não passa pela interface.
2. **Aviso ao dono no PEDIDO**, não na execução. Avisar só na hora de executar
   eliminaria a janela inteira de reação, que é o ponto do atraso.
3. **A própria vítima cancela**, por um banner em Perfil → Segurança. Exigir
   sessão para cancelar é correto e não é obstáculo: quem consegue entrar não
   precisa de reset.

Motivo obrigatório (mín. 10 caracteres) que vai para o `AuditLog` e para o
e-mail do dono. Executar derruba as sessões do alvo — se o reset foi pedido
porque a conta pode estar comprometida, manter as sessões de pé anularia o
efeito.

**Falta a UI no painel `/admin`**: hoje as actions existem e estão testadas, mas
não há tela para o super admin abrir o pedido. Na prática o backdoor está
fechado até isso existir, o que é o lado seguro de ficar incompleto.

### Por que agora
O sistema guarda token do Stripe e do Mercado Pago das empresas
(`CompanyPaymentSettings.mercadoPagoAccessToken`), a agenda inteira do negócio e
PII de clientes. Antes de ir ao ar, senha sozinha não é postura defensável.

### Correção ao desenho original
**Use o plugin `twoFactor` do better-auth 1.6.9, que já está instalado.** Ele
traz TOTP, OTP e códigos de backup prontos. Escrever os 8 códigos de recuperação
à mão é reimplementar o que já está no `package.json`.

**Não usar WhatsApp como canal de 2FA.** É o canal mais fraco disponível: SIM
swap é ataque corrente no Brasil, e a Meta restringe template de OTP. Ordem
correta:

1. **TOTP** (Google Authenticator, 1Password, etc.) — mais forte, grátis, offline
2. **E-mail via Resend** — alternativa para quem não usa app autenticador
3. **8 códigos de backup** de uso único, queimados no banco após o uso

### O ponto mais perigoso do documento inteiro: o override do Super Admin

Se o super admin pode zerar o 2FA de qualquer empresa, a segurança de todos os
tenants vale exatamente a segurança de uma conta pessoal. É um backdoor
legítimo, mas precisa de freio:

- **2FA obrigatório na conta de super admin** — sem exceção
- **Atraso de 24h** entre o pedido de reset e a execução
- **Notificação imediata** ao dono em todos os canais cadastrados, no momento do
  pedido, não da execução
- Registro em `AuditLog` com o operador e o motivo

Assim uma conta de admin sequestrada não consegue tomar um tenant em silêncio —
o dono tem 24 horas e um alerta para reagir.

### Escopo v1
Obrigatório para `OWNER` e super admin. Opcional para os demais papéis. Campo de
e-mail de resgate (*rescue email*) é opcional e barato — pode entrar junto.

---

# Bloco 2 — Retenção

## 06. Win-back de clientes inativos — ✅ CONCLUÍDO (`9e13414`, 2026-08-19)

**Veredito: fazer, como campanha que o dono aprova.** Foi o que se fez — o
consentimento de marketing sem conta (`0fd4b60`) era pré-requisito e não estava
mapeado.

### A ideia que se sustenta
Calcular o ciclo médio de retorno de cada cliente e sinalizar quem passou dele.
`Customer.lastBookingDate` e o histórico de `Booking` já dão tudo.

**Não precisa de IA para isso** — é a mediana dos intervalos entre atendimentos.
Mediana, não média, porque um único intervalo longo (viagem, mudança) distorce a
média e some com o sinal.

### Correções ao desenho original
A versão autônoma proposta quebra em dois lugares:

- **Bônus automático sangra margem sem ninguém decidir.** R$ 15 vezes 200
  clientes é uma conta que o dono não aprovou.
- **Disparo promocional não solicitado em WhatsApp queima o número.** A Meta
  bane por taxa de bloqueio, e comunicação promocional exige consentimento
  (LGPD art. 7º; nos EUA, TCPA para SMS). Marketing por WhatsApp precisa de
  opt-in registrado.

### Escopo v1
O motor entrega uma lista ao dono: *"14 clientes passaram do ciclo de retorno.
Enviar campanha?"* — com o desconto configurado por ele e um teto de gasto.
Um clique dispara.

Canal inicial: **e-mail**, onde o Resend já está ligado e `Promotion.lastSentAt`
já registra envio. WhatsApp só para quem deu opt-in explícito.

Se a IA entrar, escreve o texto da mensagem. Não decide o desconto nem o
disparo.

---

## 08. Review & Google Maps Booster — ✅ CONCLUÍDO (`5dfcd18`, 2026-08-19)

**Veredito: fazer — mas a forma proposta viola a política do Google e a lei
americana.** É a melhor relação valor/hora do documento na forma correta.

### O problema com a versão original
Dois pontos, ambos com consequência real:

- **Review gating** — filtrar quem avaliou mal antes do Google — é violação
  explícita da política do Google Business Profile, e a **FTC tem regra
  específica contra isso desde 2024**, com multa. Punição possível do lado do
  Google: remoção do perfil da empresa do Maps. Seria vender, como feature paga,
  algo capaz de apagar a presença do cliente no Google.
- **Gerar o texto do elogio para o cliente postar** também é proibido
  (avaliação não-autêntica).

O usuário opera no mercado americano. Este item não é teórico.

### A versão legal preserva quase todo o valor
1. 20 minutos após o atendimento, uma pergunta de 1 a 5 estrelas (WhatsApp ou
   e-mail), gravada em `Review`
2. **Convite ao Google para todo mundo**, independente da nota
3. **Em paralelo**, nota 1–3 dispara alerta privado imediato ao gerente

O ganho comercial real nunca foi esconder crítica. Era (a) lembrar de avaliar
quem estava satisfeito — a maioria silenciosa que esquece — e (b) o gerente
saber do problema em 20 minutos em vez de descobrir na nota pública. Os dois
continuam de pé.

Em vez do texto pronto, um gatilho: *"o que você mais gostou?"*. Ajuda o cliente
a escrever sem escrever por ele.

---

## 04. Yield management — ✅ CONCLUÍDO (`e7fa3ab`, 2026-08-19)

**Veredito: fazer o desconto em horário ocioso. Não fazer o acréscimo no pico.**

### Por que o acréscimo no pico não deve existir
A Uber consegue cobrar mais no pico porque a relação é anônima e descartável.
Barbearia é o oposto: relação nominal, recorrente, e os clientes **conversam
entre si**. No dia em que o João descobre que pagou R$ 60 no sábado e o Pedro
pagou R$ 50 na terça pelo mesmo corte com o mesmo profissional, você não perdeu
R$ 10 — perdeu o João.

Fresha e Booksy não deixaram isso de fora por limitação técnica. Deixaram porque
donos de salão recusam.

### O que fazer
A metade de baixo produz **o mesmo efeito de yield management com risco zero**,
porque é enquadrada como presente e não como punição:

- Faixas de horário configuráveis com desconto ("Happy Hour — terça 9h às 12h,
  15% OFF")
- Sugestão automática de faixa baseada na ocupação real que o sistema já mede
- Exibição no checkout público como oferta, com o preço cheio riscado

O `ghost-slot-buster` já faz exatamente isso para desistência de última hora.
Aqui é generalizar para o horário estruturalmente vago.

---

## 13. Estoque — ✅ CONCLUÍDO (`f273dfb`, 2026-08-19)

**Veredito: fazer o alerta de reposição. Não fazer a dedução teórica por
serviço.**

### Por que a dedução por consumo morre
Exige que o dono cadastre a ficha técnica de cada serviço: 50ml de shampoo, 1
lâmina, 30g de pó descolorante. Ninguém preenche. É a mesma razão pela qual o
módulo de estoque de ERP fica vazio em 90% das pequenas empresas.

E há um efeito pior que não ter: se a ficha estiver errada — e vai estar, porque
o consumo real varia com o comprimento do cabelo — o estoque teórico diverge do
real, o alerta dispara errado, e o usuário aprende a ignorar a feature inteira.

### O que fazer
`Product.minStockThreshold` já existe e `StockMovement` já registra `SALE` a
partir do POS. A v1 é:

- Alerta quando `stockQuantity <= minStockThreshold`
- Lista de reposição gerada do **histórico real de venda do POS** (giro dos
  últimos 30/60 dias), não de consumo teórico
- Exportação da lista por e-mail ou WhatsApp para o fornecedor

Zero cadastro novo. Dado real.

---

# Bloco 3 — Diferenciação

## 02. Kreator Pass — ✅ CONCLUÍDO (`4404d96`, 2026-08-19)

**Veredito: fazer — com uma correção estrutural que também simplifica a
construção.** A correção foi feita: o perfil pertence ao usuário, e o
preenchimento nunca lê a ficha que a pessoa tem em outra empresa.

### O que foi entregue
- `UserProfile` (nome, telefone, endereço), um por usuário, `onDelete: Cascade`.
- Checkout preenchido a partir dele para quem está logado; sem perfil salvo, o
  nome cai para o da sessão e o e-mail sempre vem dela.
- Caixa "guardar meus dados" no checkout, marcada por padrão e separada da
  caixa de marketing, que continua desmarcada.
- `/minha-conta`: os dados pessoais, os agendamentos em todas as empresas e a
  lista das empresas que a pessoa administra — o alternador de papel.
- Botão de apagar o perfil. Não afeta as fichas já criadas nas empresas.
- Cinco testes de banco no padrão de `authorization.db.test.ts`.

### Duas decisões que valem registro
A gravação do perfil fica **fora da transação** do agendamento e engole o
próprio erro. Falhar em guardar uma conveniência não pode impedir alguém de
agendar.

Campo vazio grava `NULL`, não string vazia. "Não informei" e "informei nada"
precisam ser distinguíveis, senão o próximo checkout não sabe se deve deixar o
campo em branco.

### O modelo de dados já está certo
`User` é global (autenticação). `Customer` é isolado por empresa
(`@@unique([companyId, email])`). A parte difícil está feita: o histórico da Dona
Maria no Salão 1 nunca vaza para o Pet Shop.

### O problema do preenchimento automático
Pegar os dados que a Dona Maria deu ao Salão 1 e injetar no formulário do Pet
Shop é **transferência de dado pessoal entre dois controladores distintos**. O
modal de consentimento proposto ajuda, mas não resolve o ponto central: o Salão
1 não autorizou o repasse da carteira dele.

### A correção
Criar um **`UserProfile`** (nome, telefone, endereço) que pertence **ao
usuário**, não à empresa. O preenchimento lê dali.

Nenhum dado atravessa empresas. A Dona Maria preenche o formulário com os dados
dela mesma — exatamente o que o autofill do navegador faz. Some o problema
jurídico, e some a necessidade do modal de consentimento junto: não há nada a
consentir.

O `Customer` de cada empresa continua sendo criado no primeiro agendamento, com
os dados copiados naquele momento. Editar a ficha no Salão 1 não altera o perfil
global nem a ficha do Pet Shop.

### Alternador Dono / Cliente
`/selecionar-empresa` já existe. `meus-agendamentos` já existe por empresa.
Falta a visão cross-company — "meus agendamentos em todas as empresas".

**Cuidado**: é exatamente o formato de IDOR que foi fechado em 2026-08-18. A
consulta tem de partir de `getActiveSession()` e nunca aceitar e-mail ou id de
cliente por parâmetro. Ver `test/authorization.db.test.ts` para o padrão.

Foi respeitado, e com uma trava a mais: o casamento por e-mail só vale com o
endereço **verificado**. Sem isso bastaria cadastrar uma conta com o e-mail de
outra pessoa para ver a agenda dela na plataforma inteira, e não só em uma
empresa.

---

## 11. Drive-time & buffer de trânsito — ✅ CONCLUÍDO (`6124589`, 2026-08-19)

**Veredito: fazer a versão barata.** Fica quase de graça porque a base já
existe — e ficou: a haversine já estava escrita, e o bloqueio saiu como
`ScheduleEvent`, que a agenda já sabia exibir e filtrar.

### A dor
Serviço a domicílio (mecânico móvel, diarista, banho e tosa móvel, estética):
cliente às 14h no bairro A e às 15h no bairro B garante atraso.

### Escopo v1 — sem Google, sem custo
`src/lib/geo/haversine.ts` já calcula distância em linha reta. A v1 é:

- Endereço do atendimento → coordenadas (uma vez, no cadastro)
- Distância haversine entre atendimentos consecutivos do mesmo profissional
- Buffer = distância × `minutosPorKm` configurável por empresa (default sugerido:
  3 min/km urbano)
- O buffer entra como bloqueio na agenda, visível e editável

Isso entrega ~80% do valor com zero dependência externa.

### Três correções ao escopo acima
**A reserva é nas duas pontas da janela, não só depois do atendimento.** Um
bloco só na frente deixaria vendável o horário colado no atendimento seguinte,
e quem o comprasse chegaria atrasado por construção. Reservar a viagem no
início e no fim da janela deixa livre só o miolo — e quando a janela é menor
que duas viagens, ela fecha inteira.

**Existe teto por trecho (120 min por padrão).** Geocodificador que não acha a
rua devolve o centroide do município, às vezes do errado; uma reta de trezentos
quilômetros viraria quinze horas de bloqueio. Com teto, dado ruim vira erro
limitado em vez de agenda destruída.

**Distância zero não gera bloqueio.** Dois banhos na mesma casa, dois carros na
mesma garagem: sem a regra, o recurso puniria o agendamento mais lucrativo do
dia.

### O trecho da base ficou de fora, e o motivo importa
Reservar a viagem da base até o primeiro atendimento exigiria coordenada da
empresa. O único campo que existe — `Company.latitude` — alimenta o geofence do
check-in, que hoje é **pulado em toda empresa** porque nenhuma tela jamais
preencheu esse campo. Gravá-lo aqui ligaria em silêncio uma validação que nunca
rodou, e ela passaria a reprovar check-in legítimo. Isso é uma decisão do
check-in, não desta ficha.

### Geocodificação
Nominatim do OpenStreetMap: gratuito, sem chave, com cache de um endereço por
consulta na vida (`geocode_cache`) e no máximo uma requisição por segundo.
Falha do provedor é tratada diferente de "endereço inexistente" — gravar uma
queda de dois minutos como inexistente condenaria aquele endereço a uma semana
sem proteção. Toda falha devolve nulo e o agendamento segue.

### Google Distance Matrix — depois, e só no plano superior
Custa por requisição e exige conta de faturamento. E tem uma limitação que o
documento anterior não menciona: **o trânsito no momento do agendamento não é o
trânsito no momento do atendimento**. Consultar a API na hora de marcar dá uma
falsa precisão. Faz sentido como refinamento para quem paga, não como base.

---

## 09. Before/After Vault

**Veredito: fazer o cofre. Não fazer a IA que "anota a fórmula".**

### O valor
Galeria privada por cliente + ficha técnica do que foi feito (fórmula da
tintura, número da lâmina, produto usado). No retorno, o profissional abre e vê
exatamente a última sessão. É real e é caro de conseguir em outro lugar.

Nicho: beleza, cabelo, estética. **Vale zero para oficina, pet shop e a maior
parte dos segmentos** — deve nascer como módulo licenciado
(`CompanyModuleLicense`), não como feature de todo mundo.

### Por que a IA está invertida
O documento propõe que a IA "anote a ficha técnica a partir da foto". Ela não
consegue: a fórmula da tintura não está na imagem, está na cabeça do
profissional. O que funciona é um **campo estruturado com autocomplete das
entradas anteriores daquele profissional** — mais rápido de preencher que ditar
para uma IA, e correto por construção.

### O que precisa de cuidado
Foto de rosto de pessoa identificada é **dado pessoal sensível** em ambas as
jurisdições. Requisitos mínimos:

- Consentimento por foto, registrado com data
- Exclusão sob pedido, propagando para o R2 (não só o registro no banco)
- Política de retenção — o custo de armazenamento cresce para sempre se nada
  expira
- Nunca exibir na landing pública sem autorização separada e explícita

`src/lib/r2.ts` com presigned URL já está pronto, então a parte técnica é curta.

---

## 14. Metas da equipe

**Veredito: fazer o painel individual. Ranking público, opcional e desligado por
padrão.**

### O que fazer
Painel do profissional com progresso contra a **meta dele**: *"você já gerou
$240 hoje, meta $300"*, comissão acumulada em tempo real, serviços do dia. Todo
o dado já existe em `Booking`, `PosSale` e nas regras de comissão do item 12.

Barato de construir e mexe com a motivação certa: comparação com a própria meta.

### Por que o ranking público entra desligado
Ranking de faturamento exposto para a equipe inteira é decisão de gestão, não de
software — desmotiva a metade de baixo e pressiona upsell, o que degrada a
experiência do cliente justamente onde a recorrência é o ativo. Nos EUA, ainda
cria exposição em ambiente com comissionados.

Deixar como chave por empresa, default off, e o dono decide.

---

## 01. i18n autônoma

**Veredito: DDI agora (quase pronto), cache de tradução depois.**

### 1.1 — Inferência por DDI: 80% feito
`src/lib/markets.ts` já mapeia +55/+1/+351/+34 para moeda, locale, timezone e
máscara telefônica. `Company.currency/timezone/locale` já existem. Falta ligar
no campo de telefone do onboarding e pré-selecionar. É uma tarde.

### Correção importante sobre moeda
O documento anterior trata conversão cambial como problema a resolver
("valores quebrados como $ 7.18"). **A conclusão certa é não converter nada.**

Um salão americano precifica em USD. Um brasileiro em BRL. `Company.currency`
já reflete isso. Converter o preço do serviço para a moeda do visitante cria um
valor que o estabelecimento nunca definiu, que muda sozinho com o câmbio, e pelo
qual ele será cobrado a honrar. Exibir o preço na moeda da empresa é correto e é
o que Fresha faz.

**Implementado em 2026-08-19** (commit `68fd608`): `Estimate.currency` e
`PosSale.currency` carimbam a moeda no ato da venda, e o painel da plataforma
agrega por moeda em vez de somar. Antes disso, trocar `Company.currency` — que é
exatamente o que a inferência por DDI vai fazer no onboarding — reinterpretava
todo o histórico da empresa em silêncio. Era pré-requisito do item 1.1, não
consequência dele.

### 1.2 — Cache de tradução: boa arquitetura, fazer depois
Hash SHA-256 do texto de origem + locale destino, consulta ao banco, geração via
Gemini Flash apenas no *miss*, gravação permanente. Custo tende a zero.
`gemini-client.ts` já existe.

Dois ajustes:

- **Não traduzir automaticamente sem deixar editar.** "Escova progressiva"
  traduzida por máquina vira algo que o dono não reconhece e não pode corrigir.
  A tradução automática entra como sugestão marcada, com override do dono
  vencendo sempre.
- **Precisa de coleta de lixo.** Se o nome do serviço muda, o hash muda e a
  linha antiga fica órfã para sempre. Uma limpeza por `updatedAt` resolve.

Escopo: apenas conteúdo público (nome e descrição de serviço, landing page).
Nunca dado de cliente.

---

## 10. Family & Group Multi-Chair Booking

**Veredito: fazer, com escopo drasticamente menor que o proposto.**

### Por que é caro
Alocar N profissionais no mesmo intervalo, atomicamente, é a parte fácil. O
custo está a jusante: cancelamento parcial (o pai cancela só o slot do filho),
estorno parcial, reagendamento de um membro do grupo, sinal de quem, comissão de
quem, ponto de fidelidade para qual conta, e o que o POS mostra. **Cada feature
existente ganha um caso "grupo"** para tratar.

### Escopo v1 — carrinho sequencial
Mesmo cliente, múltiplos serviços em sequência, um pagamento. Cobre
"corte + barba" e boa parte de "pai e filho" na prática, porque na maioria dos
casos não é preciso ser simultâneo. Reaproveita o `recurrenceGroupId` como
padrão de agrupamento.

### v2 — multi-cadeira simultâneo
Só depois de o v1 estar em produção e o comportamento das operações derivadas
estar entendido. Não começar por aqui.

---

# Bloco 4 — A aposta

## 07. AI WhatsApp Receptionist & Audio Booking

**Veredito: fazer por último, como módulo licenciado.** Maior teto da lista e o
único item que realmente separa do Fresha. Também o de maior risco operacional.

### A regra que torna isso seguro
**A IA nunca escreve no banco.** Ela interpreta o áudio, consulta a
disponibilidade, propõe horário e envia um **link de confirmação**. O cliente
toca, e a criação passa pela `createBookingAction` que já existe, já valida
slot, já tem rate limit e já está testada.

Isso muda a natureza da falha: de "alucinação corrompe a agenda e uma pessoa
real aparece num horário inexistente" para "alucinação manda link errado e o
cliente não clica". Um caminho de escrita só, o mesmo do site.

### O que a infraestrutura já cobre
`gemini-client.ts` (Gemini + Groq + fallback determinístico), `booking-copilot.ts`,
`whatsapp.ts`. Transcrição de áudio via Whisper na Groq. A parte de IA é a menor
do problema.

### Os obstáculos reais são de plataforma, não de modelo
- **O gateway Evolution/Baileys viola os termos do WhatsApp.** O número é banido
  eventualmente. Serve para demonstração; não serve para vender como feature.
- **A Cloud API oficial exige verificação de negócio** (semanas) e só permite
  resposta em texto livre **dentro de 24h da última mensagem do cliente** — o
  que, aliás, encaixa perfeitamente neste fluxo, já que é sempre o cliente que
  inicia.
- Cada empresa precisa do próprio número verificado, ou de um número
  compartilhado com identificação clara — decisão de produto ainda em aberto.

### Modelo comercial
Add-on cobrado à parte via `CompanyModuleLicense`. Tem custo variável real
(tokens, número, transcrição) e não pode entrar no preço base.

---

# Fora do roadmap

## 15. Offline-first PWA — construir só a leitura

**Veredito: fazer o cache de leitura da agenda do dia. Não fazer sync
bidirecional.**

### Por que o sync bidirecional não deve ser construído
Duas razões independentes, cada uma suficiente:

1. **É um problema de sistemas distribuídos.** Dois atendentes offline marcam o
   mesmo slot. Quem ganha? Resolução de conflito em agenda não tem resposta
   automática boa — a resposta certa quase sempre exige um humano.
2. **Contradiz o modelo de segurança inteiro.** Server action + sessão + rate
   limit + `canAccessCompany` pressupõem servidor. Offline-first significa
   reescrever a camada de autorização que acabou de ser blindada e coberta por
   teste (`test/authorization.db.test.ts`, 2026-08-18).

### O que resolve a dor descrita
Reler a dor do documento original: *"o estabelecimento não sabe quem é o próximo
cliente da fila"*. Isso é **leitura**, não escrita.

Um service worker cacheando a agenda do dia em JSON resolve, é uma tarde de
trabalho, e não toca em nada crítico. A tela fica em modo somente-leitura com
aviso visível de "sem conexão — dados de HH:MM". Escrita continua exigindo rede.

Não existe manifest nem service worker no projeto hoje, então isso também
entrega o instalável de brinde.

---

# Lacunas: o que falta neste documento

Três itens que pesam mais para fechar contrato do que a maioria das 15 features
acima, e que não estavam na lista.

### 1. Exportação e portabilidade de dados
"E se eu quiser sair?" é pergunta de compra, não de suporte. Não ter resposta
trava venda com o cliente mais organizado — justamente o que paga em dia. LGPD
(art. 18) e CCPA obrigam. Já existe export CSV de agendamentos; falta o pacote
completo (clientes, serviços, histórico financeiro) em um clique.

### 2. Backup e recuperação declarados
O sistema guarda a agenda inteira de um negócio. "O que acontece se vocês
perderem meus dados" não é respondida por nenhuma das 15 features. Precisa de
política escrita, backup testado (restaurado de verdade ao menos uma vez), e a
resposta pronta na página de vendas.

### 3. Tempo até o primeiro agendamento
Hoje o dono configura serviços, agendas, profissionais e formas de pagamento
antes de existir um único cliente. `SystemPreset` e `SystemSegment` são
exatamente o ativo para resolver isso — falta um onboarding que os use para
deixar a empresa agendável em cinco minutos.

**Isso provavelmente move mais receita que qualquer item da lista de 15**, porque
age sobre a conversão do trial, que é onde o funil vaza mais.

---

## Histórico

- **2026-08-19 (noite, 2)** — **Item 11** concluído (`6124589`): reserva de
  tempo de viagem entre atendimentos consecutivos, em linha reta, sem Google.
  Três correções ao escopo da ficha — reserva nas duas pontas da janela, teto
  por trecho e distância zero sem bloqueio — estão registradas acima. O trecho
  da base até o primeiro atendimento ficou de fora por um achado colateral: o
  geofence do check-in está pulado em toda empresa desde que foi construído,
  porque `Company.latitude` nunca foi preenchido por tela nenhuma, e escrever
  ali ligaria a validação em silêncio.
- **2026-08-19 (noite)** — Bloco 2 executado e Bloco 3 aberto. **Item 06**
  (`9e13414`): o consentimento de marketing só existia para quem tinha conta, e
  a maioria agenda sem criar uma — "nunca escolheu" e "escolheu não receber"
  eram o mesmo estado no banco. Corrigido antes do resgate em si (`0fd4b60`).
  **Item 08** (`5dfcd18`): o pedido de avaliação sai 20 minutos após a
  conclusão, sem *review gating* — filtrar nota baixa viola a política do Google
  Business Profile e a regra da FTC de 2024, e a punição possível é a remoção do
  perfil da empresa do Maps. O alerta ao gerente sai em paralelo ao convite, não
  no lugar dele. **Item 04** (`e7fa3ab`): só o desconto em horário ocioso; o
  acréscimo no pico não foi construído e está fora do roadmap. **Item 13**
  (`f273dfb`): reposição pelo giro real de `sale_item`, sem ficha técnica — o
  teste de banco pegou um erro de SQL que o `tsc` jamais veria, com venda
  estornada contando como giro. **Item 02** (`4404d96`): o preenchimento
  automático não copia dado entre empresas; o perfil pertence ao usuário, o que
  elimina o problema jurídico e o modal de consentimento junto. A visão
  cross-company exigiu uma trava a mais que a versão por empresa — e-mail só
  casa se estiver verificado.
- **2026-08-19 (tarde)** — Bloco 1 executado. **Item 05** concluído (`cc53ed2`):
  quatro faixas explicáveis no lugar do score de IA, janela de 180 dias, chave
  desligada por padrão, e nenhuma consulta pública de faixa por e-mail. **Item
  12** concluído (`c01e462`): o extrato ignorava o PDV inteiro — escopo bem maior
  que o mapeado de manhã; três fontes de verdade da taxa viraram uma. **Item 03**
  concluído (`0bbdb7c` + `61695db`): plugin do better-auth, TOTP + OTP por
  e-mail + códigos de recuperação, sem WhatsApp; e o reset do super admin com
  carência de 24h, aviso ao dono no pedido e cancelamento pela própria vítima.
  O build do Next pegou um `export const` em arquivo `use server` que o teste
  estático deixava passar — asserção nova fecha a lacuna.
  Registradas duas dívidas novas: comissão não carimbada em `Booking`, e vendas
  de PDV anteriores sem rateio.
- **2026-08-19 (manhã)** — Moeda por transação e painel da plataforma segmentado
  por mercado (`68fd608`, `4f20885`). Pré-requisito do item 01 que não estava
  mapeado: sem carimbar a moeda no registro, a inferência por DDI reinterpretaria
  o histórico de qualquer empresa que trocasse de mercado. Corrigida a ficha do
  item 12 — a separação serviço/produto já existia em
  `Professional.productCommissionRate`.
- **2026-08-18** — Revisão completa. Vereditos, escopos corrigidos e ordem de
  execução incorporados. Removidos os números de resultado sem base. Corrigidos
  os cinco itens descritos como novos que já estavam parcialmente construídos.
  Marcados como fora do roadmap: sync offline bidirecional, dedução de estoque
  por ficha técnica, acréscimo de preço no pico e review gating.
- **Versão anterior** — catálogo original de 15 inovações.
