# Próximos Passos

Estado em **20/08/2026**, último commit auditado `3a9bd29`.
486 testes verdes, `tsc` limpo, zero erros de lint.

Este arquivo é a lista de trabalho em aberto. Cada item diz **o que é**, **por que importa**, **o que está travando** e **o que fazer**. Itens de decisão vêm primeiro, porque bloqueiam o resto.

---

## 🔴 1. Repasse aos estabelecimentos — não existe

**A pergunta:** quando o cliente paga o salão, como isso é cobrado e como o salão recebe?

**A resposta, depois de rastrear o caminho do dinheiro:**

| Fluxo | Onde o dinheiro cai hoje |
|---|---|
| Cliente paga **cartão** (Stripe) | **na conta da plataforma** — `STRIPE_SECRET_KEY` é uma chave única |
| Cliente paga **PIX** (Mercado Pago) | na conta **do estabelecimento** — `mercadoPagoAccessToken` é por empresa |
| Cliente paga presencial | direto com o estabelecimento; a plataforma só registra |
| Estabelecimento paga o plano | na conta da plataforma (Stripe Billing) |

Busca por `stripeAccount`, `application_fee_amount`, `transfer_data`, `on_behalf_of`, `acct_`: **zero ocorrências**. Não há Stripe Connect. `Company.stripeCustomerId` é a empresa *pagando* a plataforma, não o contrário.

### Por que isso é o item mais importante da lista

**Não há receita por transação.** Nenhuma linha cobra percentual ou taxa fixa sobre agendamento pago. Se a intenção era ganhar por transação, isso nunca foi construído — o faturamento é só a assinatura do plano.

**A plataforma segura dinheiro dos salões sem meio de devolver.** Todo pagamento em cartão cai na conta da plataforma e **não existe caminho de código que transfira para o estabelecimento**. Não é só funcionalidade faltando: receber em nome de terceiro sem ser o *merchant of record* é atividade regulada na maioria das jurisdições — nos EUA é *money transmission*. O Stripe Connect existe exatamente para isso e é ele que assume o risco.

A assimetria denuncia a origem: o PIX foi feito certo (token por empresa, dinheiro direto ao salão) e o cartão não. O cartão provavelmente nasceu antes do conceito de multiempresa e nunca foi revisitado.

### Decisões necessárias antes de escrever código

1. **Modelo de receita:** só assinatura, ou assinatura + percentual por transação?
2. **Tipo de conta Connect:** Standard (salão tem conta Stripe própria, menos responsabilidade da plataforma), Express (onboarding hospedado pelo Stripe, meio-termo) ou Custom (controle total, responsabilidade total).
3. **Quem paga a taxa do Stripe** — a plataforma ou o salão.
4. **Estorno em conta conectada:** de quem sai o dinheiro quando o saldo do salão não cobre.
5. **O que fazer com o que já foi recebido** na conta da plataforma antes da migração.

### Esforço

Semanas, não dias. Onboarding com KYC, verificação de conta, `application_fee_amount` nos PaymentIntents, webhooks de `account.updated`, tela de status do repasse, e revisão de todo o fluxo de estorno.

---

## 🟠 2. Orçamentos invisíveis para o estabelecimento

**O que existe:** o orçamento funciona ponta a ponta. Toda reserva nasce de um `estimate`; o cliente monta, salva, imprime e tem a tela dele em `/orcamentos`, linkada no painel do cliente.

**O que não existe:** o outro lado. `grep db.estimate` no painel inteiro da empresa retorna **zero**. Não há tela, não há item na sidebar (`app-sidebar.tsx` não menciona orçamento).

**O tamanho do buraco:** o banco tem **1.078 orçamentos com status `PENDING`**. São 1.078 pessoas que montaram o carrinho, salvaram e não fecharam. O dono do salão não tem como saber que existem, quanto valem, nem ligar para nenhuma delas. É a lista de leads mais quente que um negócio de serviço pode ter, e ela está invisível.

### O que fazer

- Tela `/[companySlug]/orcamentos`: lista com valor, cliente, data, serviços e idade do orçamento;
- Filtro por status (`PENDING`, `CONVERTED`, `CANCELLED`) e por período;
- Ação de converter em agendamento e ação de arquivar;
- Item na sidebar, na seção de vendas;
- Indicador no dashboard: "X orçamentos abertos, somando R$ Y".

**Sem bloqueio.** É trabalho direto.

---

## 🟠 3. Faturamento nos gráficos

Pedido: adicionar faturamento aos gráficos da visão geral, **nos dois contextos** — super admin e estabelecimento.

- **Estabelecimento:** o dashboard tem indicadores e gráficos de evolução, mas o recorte de faturamento não está lá como série. Falta receita por período, comparativo com o período anterior, e quebra por forma de pagamento.
- **Super admin:** o painel da plataforma precisa de faturamento agregado — MRR das assinaturas, volume transacionado pelos estabelecimentos e, se o item 1 for implementado, a receita de taxa por transação.

**Atenção:** os dados devem ser agregados no Postgres (`GROUP BY`), não em memória, seguindo o que já foi feito nos outros painéis. E o "hoje" de cada empresa é o do fuso dela — ver item 1 da lista de armadilhas conhecidas, mais abaixo.

**Sem bloqueio.**

---

## 🟡 4. Entrega real de e-mail, WhatsApp e SMS

**O que já está provado:** a fila de saída funciona. Gravação da intenção na mesma transação do agendamento, reserva atômica contra worker duplicado, backoff de 1/5/15/60/360 min em até 6 tentativas, resgate de linha abandonada em `SENDING` e marca que impede lembrete repetido. Tudo com teste de integração.

**O que não está provado:** que a mensagem chega. Os três canais fazem chamada HTTP de verdade (`src/lib/email.ts`, `whatsapp.ts`, `sms.ts`), mas ficam atrás de credenciais que não existem no ambiente de desenvolvimento.

### Bloqueio

Faltam no `.env`:

```
RESEND_API_KEY=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
# provedor de SMS (chave e endpoint)
```

### O que fazer quando as chaves existirem

- Disparar cada tipo de notificação para um endereço e um número reais;
- Conferir template, acentuação, formatação de data e moeda **nos quatro idiomas**;
- Testar o comportamento com credencial inválida: a fila tem que reagendar, não marcar como enviada;
- Conferir que WhatsApp e SMS falhando **não** provocam reenvio do e-mail (é o desenho atual — o e-mail é o canal de referência da fila).

---

## 🟡 5. Aplicativo mobile

`mobile/` **nunca foi aberto** em nenhuma das auditorias. Zero cobertura.

### Onde eu começaria

1. **Autenticação por bearer token.** O app não usa cookie: a sessão é consultada direto na tabela `session` pelo token. É o ponto mais provável de defeito, e o mais caro se estiver errado — todas as falhas de autorização encontradas no painel foram desta família.
2. **Paridade das travas.** Toda correção de autorização desta auditoria foi feita nas server actions. Se o app tem caminho próprio de API, precisa ser verificado um por um.
3. **Fluxo de agendamento** ponta a ponta no simulador.
4. **Push:** o token do Expo é registrado e usado, mas nunca foi testado com aparelho real.

### Bloqueio

Precisa de Expo rodando e de simulador ou aparelho pareado. Decidir se eu começo pela revisão do código (dá para fazer agora) ou se você sobe o ambiente para teste de verdade.

---

## 🔵 Dívidas conhecidas, menores

| Item | Situação |
|---|---|
| `/[empresa]/rebooking` | A sidebar aponta para essa rota no módulo `smart_rebooking` e **a rota não existe**. Hoje o item está escondido por falta de licença; conceder a licença revela um link para 404. |
| `/[empresa]/split` | Página estática de marketing (`"use client"`, sem action nenhuma) que diz "Módulo Extra Ativo" mesmo sem contrato. Não há funcionalidade atrás — só o texto está mentindo. |
| `src/server/queries/admin.ts` | Tem um `catch` que roda uma segunda implementação inteira em SQL bruto. É a mesma família do fallback de profissional que já se provou destrutivo (gravava só metade dos campos). Maior candidato remanescente a defeito escondido. |
| 133 avisos de lint | Maioria variável não usada. Ruído, não barra nada. Inclui `sendWaitlistNotificationEmail` importado e nunca usado em `waitlist.ts` — a notificação de vaga aberta provavelmente nunca é enviada. |
| 12 `react-hooks/set-state-in-effect` | Com `disable` pontual e motivo escrito: leitura do ambiente após a hidratação. Dívida anotada, não resolvida. |
| Módulos sem página nem trava | `relatorios_avancados`, `comanda_pos`, `ai_booking_copilot`, `ghost_slot_buster`, `vip_experience`, `dynamic_return` estão no catálogo e não têm verificação de licença. |
| Copiloto de IA na página pública | O componente aparece para visitante anônimo, mas `parseAIBookingIntentAction` exige sessão. O cliente sem login digita e recebe "Não autenticado". Decidir: abrir para anônimo com limite por IP, ou esconder a caixa. |

---

## ⚪ Dimensões nunca auditadas

Estas nunca foram tocadas por nenhuma varredura. Não há achado nem garantia — não há dado.

- **Desempenho:** consultas N+1, índices faltando, comportamento sob carga;
- **Acessibilidade e responsivo:** navegação por teclado, leitor de tela, telas pequenas;
- **Backup e restauração:** existe rotina? Já foi testada uma restauração de verdade?
- **Retenção e exclusão de dados (LGPD/GDPR):** o cofre de fotos tem prazo e expurgo; o resto dos dados pessoais, não. Não há fluxo de "apagar minha conta".

---

## Armadilhas conhecidas deste projeto

Anotadas porque já custaram tempo mais de uma vez.

**1. Data e hora sempre no fuso da EMPRESA.** `new Date().toISOString()` é o dia do servidor, em UTC. Este projeto já teve **quatro** defeitos desta família, um deles escondendo a manhã inteira do dia seguinte na página pública de agendamento, toda noite. Use `todayInTimezone`, `minutesIntoDayInTimezone` e `slotAlreadyPassed` de `@/lib/company-date` — e nunca misture duas fontes de tempo na mesma comparação.

**2. Server action é endpoint HTTP.** Não herda a proteção do layout da página que a chama. "Ter sessão" nunca é "ter permissão": se a action recebe o identificador de uma empresa, ela precisa amarrar o usuário àquela empresa. Há guarda estática em `test/server-actions-guard.test.ts`.

**3. Toda correção verificada nas duas direções.** Escreva o teste, **desarme a correção** e confirme que o teste falha. Nesta base, três testes já passavam com o furo aberto — e nesta última rodada uma verificação negativa revelou que o teste media o filtro errado, não a trava real.

**4. Limpeza de teste sempre no `afterEach`.** No fim do `it` ela não roda quando o caso falha, e o resíduo contamina a execução seguinte da suíte inteira. Já aconteceu três vezes.

**5. Dois falsos positivos que o ambiente de dev sempre produz.** Depois de `prisma generate`, o dev server em execução fica com o client velho e páginas passam a dar **500** com `PrismaClientValidationError`; e o Turbopack serve build velho, fazendo rota existente responder **404**. Os dois enganam porque são estáveis. Reinicie o servidor e force recompilação antes de investigar.

**6. Esquema do banco só muda por migration.** Nenhum caminho de requisição pode executar DDL. Há guarda em `test/no-runtime-ddl.test.ts`.
