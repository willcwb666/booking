# Roadmap — Booking App

## Stack
Next.js 16 | Prisma v7 | better-auth | PostgreSQL | Redis | Tailwind v4 | Stripe

## Status da fundação
- [x] Auth (better-auth) — login, register, logout, admin plugin
- [x] Estrutura de pastas — src/lib, src/server, src/schemas, src/types, route groups
- [x] Proxy.ts — proteção de rotas autenticadas e admin
- [x] Docker — PostgreSQL + Redis

---

## Contexto e Motivacao

Este sistema substitui o uso do **BookingKoala** com foco direto nos seus pontos de falha.

O problema central observado na operacao real: clientes cancelam agendamentos, o email nao chega ou vai para spam, e o profissional aparece no endereco sem saber do cancelamento. Resultado: tempo perdido, custo de deslocamento e dano de imagem para a empresa.

Isso define duas prioridades nao negociaveis neste sistema:
1. **Notificacoes push sao criticas** — nao opcionais. Cancelamentos, reagendamentos e confirmacoes devem chegar via push no celular do profissional, nao apenas por email.
2. **O profissional precisa de um app mobile** — ele trabalha em campo, sem acesso a desktop. Push confiavel requer app nativo instalado.

---

## Pilares Inegociáveis

Estes pilares devem ser aplicados em TODAS as fases, sem exceção. Cada fase possui uma checklist de compliance. Nenhuma fase está concluída sem todos os itens marcados.

### 1. Segurança
- **Zero Trust no servidor:** companyId e userId NUNCA vêm do cliente — sempre derivados da sessão autenticada (anti-IDOR)
- **Validação dupla:** toda validação Zod feita no cliente deve ser repetida no server action/route handler
- **Preços calculados no servidor:** valores monetários nunca devem vir do cliente — sempre recalculados server-side antes de salvar
- **Rate limiting:** rotas de auth e ações críticas com limite de tentativas (better-auth rateLimit)
- **Security Headers:** CSP, X-Frame-Options, X-Content-Type-Options, HSTS configurados em `next.config.ts`
- **Tokens assinados:** links externos (confirmação, avaliação, acesso) usam tokens JWT com expiração — nunca IDs expostos
- **Dados sensíveis:** campos como `accessNote` (localização de chaves) criptografados em repouso
- **Uploads:** arquivos validados por tipo (allowlist MIME), tamanho máximo e hospedados em storage externo (nunca URL externa bruta — risco SSRF)
- **Webhook Stripe:** pagamento confirmado SOMENTE via webhook com verificação de assinatura — nunca pelo cliente
- **CSV injection:** exportações sanitizam valores que iniciem com `=`, `+`, `-`, `@`
- **SSE/streams:** endpoints de streaming verificam sessão ativa antes de manter conexão

### 2. Boas Práticas
- **Testes obrigatórios por fase:** unitários com Vitest (schemas, utils, cálculos), integração (server actions, queries), E2E com Playwright (fluxos críticos)
- **Error boundaries:** `error.tsx` e `not-found.tsx` em todas as rotas relevantes
- **Observabilidade:** erros capturados com Sentry (ou similar) — logs estruturados no servidor
- **Semântica de modelos clara:** evitar entidades com campos idênticos sem diferença semântica documentada
- **Migrations:** todas as migrations são aditivas em produção — nunca dropar coluna sem deprecation cycle
- **State management:** política definida — `useState` simples, `useReducer` para estado complexo local, Zustand apenas se estado compartilhado entre rotas
- **Ambiente:** dev / staging / prod com variáveis separadas; staging espelha produção

### 3. Escalabilidade
- **Índices explícitos:** todo campo usado em `WHERE`, `ORDER BY` ou `JOIN` frequente deve ter `@@index` no schema Prisma
- **Sem N+1:** queries usam `include` ou `select` aninhado — proibido fazer queries em loops
- **Cache com Redis:** dados semi-estáticos (planos, catálogo de serviços) cacheados com TTL; invalidação explícita ao mudar
- **Storage externo:** arquivos (avatares, logos) armazenados em S3/Cloudflare R2 — banco guarda apenas a URL
- **Slots pré-calculados:** disponibilidade de agenda cacheada ou pré-gerada — nunca recalculada a cada request
- **Double booking:** reservas usam `SELECT FOR UPDATE` em transação atômica — lock otimista não é suficiente
- **Relatórios pesados:** queries de agregação (financeiro, dashboards) rodam com `READ COMMITTED` e podem usar views materializadas

### 4. Acessibilidade
- **Conformidade alvo: WCAG 2.1 AA** — auditada com axe-core (automatizado) e revisão manual por fase
- **Nunca cor como único indicador:** status sempre comunicados com ícone + texto além da cor (WCAG 1.4.1)
- **Formulários:** todo `<input>` tem `<label>` associado via `htmlFor`; erros de validação têm `aria-describedby`
- **Navegação por teclado:** todos os elementos interativos acessíveis via Tab/Enter/Escape; focus ring visível
- **Focus trap:** modais, drawers e dropdowns prendem o foco enquanto abertos (`focus-trap-react` ou implementação nativa)
- **Atualizações dinâmicas:** contadores, totais e notificações que mudam sem reload usam `aria-live`
- **Calendários:** implementação segue WAI-ARIA Calendar Pattern (role="grid", aria-selected, arrow key navigation)
- **Checklists:** usam `role="checkbox"`, `aria-checked`, agrupados em `role="group"` com label
- **Imagens:** toda `<img>` tem `alt` descritivo; ícones decorativos têm `aria-hidden="true"`
- **Contraste:** mínimo 4.5:1 para texto normal, 3:1 para texto grande (WCAG 1.4.3)

---

## Fase 1 — Tenant Foundation + Plans
**Status: CONCLUIDA**

**Objetivo:** Permitir que um negócio crie sua empresa na plataforma, escolha seu tipo de negócio e assine um plano.

### Modelos (schema.prisma)
- `BusinessType` — enum: home_cleaning, pet_groomer, car_wash, pool_cleaning, lawn_care, barber, hair_salon, photographer, other
- `Plan` — id, name (starter/normal/advanced), description, priceMonthly, priceYearly, isActive
- `PlanFeature` — id, planId, featureKey, featureLabel, enabled, limit (nullable)
- `Company` — id, name, slug, businessType, planId, ownerId, logoUrl, phone, address, isActive, createdAt, updatedAt
- `CompanyUser` — id, companyId, userId, role (owner/manager/employee), isActive, joinedAt

### Funcionalidades
- Onboarding: escolha de tipo de negócio → plano → dados da empresa
- Painel de planos com feature matrix (tabela comparativa)
- Usuário autenticado criando empresa → vira owner
- Seed dos planos e feature flags no banco
- Tenant context: todas as queries de dados filtradas por companyId

### Notas técnicas
- `slug` da empresa usado nas URLs: `/[slug]/dashboard`
- Feature flags checados via `checkFeature(companyId, featureKey)` em `src/lib/features.ts`
- CompanyUser.role diferente de User.role do better-auth (role global vs role dentro da empresa)

### Checklist de Pilares
- [x] **Segurança:** companyId derivado da sessão; slug reservado validado server-side; sem URL externa em logoUrl (campo livre por enquanto)
- [x] **Boas Práticas:** schemas Zod em `src/schemas/`; server actions com try/catch; redirect após auth
- [ ] **Escalabilidade:** `@@index` em `Company.slug`, `CompanyUser(companyId, userId)` — verificar se foram criados na migration
- [ ] **Acessibilidade:** cards de business type com `role="radio"` ou `role="button"` + aria-pressed; onboarding com indicador de etapa (`aria-current="step"`)
- [ ] **Testes:** schema Zod de company; `generateSlug()`; `isReservedSlug()`; `checkFeature()`

---

## Fase 2 — Catalogo de Servicos + Profissionais

**Objetivo:** Empresa cadastra seus servicos, tipos, extras e profissionais.

### Modelos
- `Service` — representacao generica de servico (ex: "Limpeza Residencial"); id, companyId, name, description, isActive, order, createdAt
- `ServiceType` — variacao/modalidade de um Service com preco proprio (ex: "Apartamento 2 quartos"); id, companyId, serviceId (FK), name, description, price (Decimal), estimatedMinutes, isActive, order, createdAt
- `ExtraService` — adicional avulso (ex: "Limpeza de forno"); id, companyId, name, description, price (Decimal), estimatedMinutes, isActive, order, createdAt
- `Professional` — id, companyId, userId (nullable), name, email, phone, bio, avatarUrl, isActive, createdAt

> **Diferenca semantica obrigatoria:** `Service` e o agrupador (ex: "Limpeza"); `ServiceType` e a variacao com preco (ex: "Studio", "2 quartos"). `ExtraService` e independente, nao ligado a Service.

### Funcionalidades
- CRUD completo com tabelas paginadas para Services, ServiceTypes, ExtraServices, Professionals
- Soft delete (isActive = false) para preservar historico
- Reordenacao via drag-and-drop (campo `order`)
- Associacao Professional → User (opcional): se tiver conta, pode acessar area do funcionario

### Notas tecnicas
- `price` como `Decimal` no Prisma (nao Float) para evitar erros de ponto flutuante financeiro
- Validacao com Zod em `src/schemas/service.schema.ts` e `src/schemas/professional.schema.ts`

### Checklist de Pilares
- [ ] **Seguranca:** `companyId` sempre da sessao — nunca do body da requisicao; `avatarUrl` aceita apenas upload para R2/S3 (nao URL livre); tipo MIME validado (image/jpeg, image/png, image/webp); tamanho maximo 2MB
- [ ] **Boas Praticas:** `ServiceType` obrigatoriamente ligado a um `Service` via FK (sem servico orfao); Zod schemas cobrem todos os campos; erro 404 se servico nao pertencer a empresa
- [ ] **Escalabilidade:** `@@index([companyId])` em Service, ServiceType, ExtraService, Professional; `@@index([companyId, isActive])` para filtros de listagem; storage de avatar em R2 (URL salva no banco)
- [ ] **Acessibilidade:** tabelas com `<caption>`, `scope="col"` nos cabecalhos; drag-and-drop com alternativa de reordenacao por teclado (botoes "mover para cima/baixo"); upload de avatar com `aria-label` descritivo
- [ ] **Testes:** validacao Zod de preco (Decimal, minimo 0); upload com tipo invalido rejeitado; query de listagem filtrada por companyId

---

## Fase 3 — Gestao de Agendas

**Objetivo:** Empresa cria e publica agendas de disponibilidade com todas as regras de operacao.

### Modelos
- `Agenda`
  - id, companyId, name, status (draft/active/cancelled)
  - startDate (obrigatorio, nao pode ser anterior a hoje)
  - endDate (opcional)
  - workingDays (Int[] — 0=Dom a 6=Sab)
  - startTime (String "HH:MM")
  - endTime (String "HH:MM")
  - intervalMinutes (Int — 30 ou 60)
  - cancelledAt, cancelledById, cancellationReason
  - createdById, createdAt, updatedAt
- `AgendaProfessional` — agendaId, professionalId (profissionais ativos nessa agenda)

### Funcionalidades
- Formulario de criacao com todas as validacoes:
  - startDate >= hoje (erro se anterior)
  - endDate > startDate (se informada)
  - endTime > startTime
  - Ao menos 1 dia da semana selecionado
- Salvar como rascunho ou publicar
- Edicao conforme role:
  - OWNER: pode criar, editar, publicar e cancelar
  - MANAGER: pode criar, editar e publicar (nao cancelar)
  - EMPLOYEE: apenas visualiza
- Cancelamento:
  - Se houver agendamentos futuros: opcao de remanejamento antes de cancelar
  - Cancelar = inativar (nao apagar, preservar historico)
- Lista de agendas com filtros:
  - Status (multi-select checkbox, default: active)
  - Data inicio e data fim
  - Profissional (multi-select, default: nenhum selecionado)

### Notas tecnicas
- `workingDays` como `Int[]` no Prisma (array de inteiros)
- Geracao de slots disponíveis: funcao `generateSlots(agenda)` em `src/lib/agenda.ts` — resultado cacheado no Redis com TTL de 1h; invalidado ao editar agenda
- Validacao de conflito: agenda ativa nao pode sobrepor mesma empresa+profissional no mesmo horario

### Checklist de Pilares
- [ ] **Seguranca:** role verificado server-side antes de cada operacao (create/edit/publish/cancel); `createdById` e `cancelledById` sempre da sessao; conflito de horario verificado em transacao atomica
- [ ] **Boas Praticas:** status gerenciado por maquina de estados explicita (draft → active → cancelled; sem transicao invalida); migration aditiva (nunca remover campo de status sem deprecation)
- [ ] **Escalabilidade:** `@@index([companyId, status])`, `@@index([companyId, startDate])`; slots cacheados no Redis (chave `slots:{agendaId}:{date}`) — nunca recalculados a cada request
- [ ] **Acessibilidade:** seletor de dias da semana com `role="group"` e `aria-labelledby`; checkboxes com `aria-checked`; datas com `<input type="date">` nativo (acessivel por padrao)
- [ ] **Testes:** validacao de startDate no passado; conflito de horario detectado; geracao correta de slots para diferentes intervalos

---

## Fase 4 — Configuracao de Booking

**Objetivo:** Empresa configura quais servicos ficam disponíveis em cada agenda publicada.

### Modelos
- `BookingConfig`
  - id, companyId, agendaId, name, status (draft/published)
  - allowPartialService (Boolean) — permite selecao parcial de servicos
  - createdById, createdAt, updatedAt
- `BookingConfigServiceType` — bookingConfigId, serviceTypeId
- `BookingConfigExtraService` — bookingConfigId, extraServiceId (extras disponíveis nessa config)

### Funcionalidades
- Ao abrir cadastro de agendamento: unico campo inicial e selecao de agenda
- Apos selecionar agenda: aparecem os tipos de servicos disponíveis (da empresa)
- Selecao de extras disponíveis
- Toggle: permitir selecao parcial de servicos
- Salvar rascunho ou publicar
- Ao publicar: booking fica visivel para clientes
- Edicao permitida desde que nao altere agendamentos ja salvos (validacao server-side)

### Notas tecnicas
- BookingConfig publicada = "booking page" publica da empresa
- URL publica: `/book/[companySlug]/[bookingConfigId]`

### Checklist de Pilares
- [ ] **Seguranca:** edicao de BookingConfig publicada verifica server-side se ha Bookings vinculados antes de permitir alteracao de servicos; URL publica (`/book/...`) nao expoe dados internos da empresa alem do necessario para o cliente
- [ ] **Boas Praticas:** ao publicar, valida que ao menos 1 ServiceType esta selecionado; estado draft/published com maquina de estados — sem publicar BookingConfig com agenda cancelada
- [ ] **Escalabilidade:** `@@index([companyId, status])`, `@@index([agendaId])`; listagem de configs pagina server-side
- [ ] **Acessibilidade:** lista de servicos para selecao com `role="listbox"` ou checkboxes acessíveis; toggle de `allowPartialService` com `role="switch"` e `aria-checked`
- [ ] **Testes:** publicar sem servico retorna erro; edicao com agendamento vinculado e bloqueada; URL publica retorna 404 se config nao publicada

---

## Fase 5 — Manager Schedule (Calendario Operacional)

**Objetivo:** Painel interno para gestores visualizarem e gerenciarem a agenda de trabalho.

### Modelos
- `ScheduleEvent` (eventos nao-agendamentos)
  - id, companyId, agendaId, professionalId, title, type (appointment/event/estimate)
  - date, startTime, endTime, notes, createdById, createdAt

### Funcionalidades
- **Layout:**
  - Esquerda (menor): mini calendario com data atual selecionada + filtro de profissionais (All + lista)
  - Direita (maior): grade de horarios configurados na agenda
- **Navegacao:** `< date >` com botoes Anterior/Proximo
  - Day: avanca/recua 1 dia
  - Week: avanca/recua 1 semana (exibe 7 colunas)
  - Month: exibe calendario completo do mes
- **Interacao na grade:**
  - Clique em slot vazio: menu com opcoes — "Agendar Trabalho", "Evento", "Estimate"
  - Clique em agendamento existente: painel lateral com detalhes + acoes
- **Status com cor + icone + texto:** agendado (azul + icone calendario + "Agendado"), confirmado (verde + check + "Confirmado"), cancelado (cinza + X + "Cancelado"), em andamento (laranja + spinner + "Em andamento")

### Notas tecnicas
- Componente de calendario custom com Tailwind — segue WAI-ARIA Calendar Pattern obrigatoriamente
- Slots carregados por periodo (day/week) via Server Component ou fetch paginado — nunca todos de uma vez
- Filtro por profissional filtra a grade (se "All": mostra todos em colunas separadas na view Week)

### Checklist de Pilares
- [ ] **Seguranca:** todos os dados do calendario filtrados por `companyId` da sessao; `ScheduleEvent` criado com `createdById` da sessao; role verificado — EMPLOYEE nao pode criar eventos de outros
- [ ] **Boas Praticas:** calendario e um componente isolado e testavel; interacoes de clique e teclado separadas da logica de negocio; sem queries em loops ao renderizar slots
- [ ] **Escalabilidade:** dados carregados por janela de tempo (ex: 1 semana de cada vez); `@@index([companyId, date])`, `@@index([professionalId, date])`; slots do Redis — nao recalcular a cada navegacao
- [ ] **Acessibilidade:** WAI-ARIA Calendar Pattern completo: `role="grid"`, celulas com `role="gridcell"`, navegacao por setas, `aria-selected`, `aria-label` nas datas; status NUNCA so por cor — sempre icone + texto auxiliar; menu de slot vazio e um `role="menu"` com `aria-label`; painel lateral com `role="dialog"` e focus trap
- [ ] **Testes:** navegacao de semanas carrega dados corretos; filtro por profissional funciona; evento criado aparece no slot certo

---

## Fase 6 — Estimate + Fluxo de Booking (Parte 1: Calculo)

**Objetivo:** Cliente monta seu pedido, seleciona servicos e ve o resumo de precos antes de agendar.

### Modelos
- `Estimate`
  - id, companyId, bookingConfigId, customerId (nullable — pode ser anonimo)
  - customerEmail, customerName, status (draft/pending/converted/cancelled)
  - subtotal (Decimal), total (Decimal)
  - frequency (once/weekly/biweekly/monthly)
  - notes, createdAt, updatedAt
- `EstimateServiceType` — estimateId, serviceTypeId, quantity, unitPrice, subtotal
- `EstimateExtraService` — estimateId, extraServiceId, quantity, unitPrice, subtotal

### Funcionalidades
- **Selecao de tipo de servico** com preco unitario visivel
- **Frequency:** once / weekly / biweekly / monthly
- **Quantidade de servicos**
- **Selecao parcial** (se `allowPartialService = true`): lista todos os servicos do tipo, cliente seleciona os que quer
- **Extras:** lista de extras disponíveis nessa config, cada um com toggle
- **Booking Summary:**
  - Painel lateral/fixo que atualiza em tempo real conforme selecao
  - Mostra itemizacao + total calculado
  - Comportamento de calculadora: adicionar/remover item atualiza total imediatamente

### Notas tecnicas
- **Preco SEMPRE recalculado no servidor:** o cliente envia apenas IDs e quantidades — o server action busca os precos do banco e calcula o total. Nunca confiar em valores monetarios vindos do cliente.
- Calculo de total: `sum(EstimateServiceType.subtotal) + sum(EstimateExtraService.subtotal)` — feito no server action
- Estado local gerenciado com `useReducer` (selecoes, quantidades, extras)
- Estimate salvo como draft ao iniciar selecao (autosave com debounce de 1s)
- `unitPrice` no EstimateServiceType/ExtraService salvo no momento da criacao (snapshot de preco — preco pode mudar depois)

### Checklist de Pilares
- [ ] **Seguranca:** server action recalcula total a partir dos IDs — body do cliente contem apenas `{ serviceTypeId, quantity }[]`, nunca preco; `bookingConfigId` validado como publicado e pertencente a empresa; estimate anonimo nao expoe dados de outros clientes
- [ ] **Boas Praticas:** snapshot de preco salvo no EstimateServiceType (preco unitario no momento da criacao); autosave com debounce evita spam de writes; estimate expirado (>24h em draft) nao converte
- [ ] **Escalabilidade:** autosave usa upsert atomico; `@@index([bookingConfigId, status])`, `@@index([customerId, status])`; listagem de estimates para o admin pagina server-side
- [ ] **Acessibilidade:** booking summary usa `aria-live="polite"` para anunciar mudancas de total; contadores de quantidade com `aria-label="Quantidade de [servico]"`; toggles de extra com `role="switch"` e `aria-checked`; total formatado como moeda com `<span aria-label="Total: R$ 150,00">`
- [ ] **Testes:** preco manipulado no cliente e ignorado pelo server; total calculado corretamente com multiplos itens; estimate expirado nao converte

---

## Fase 7 — Booking Finalization + Pagamento (Stripe)

**Objetivo:** Cliente escolhe data, informa dados pessoais, paga e confirma o agendamento.

### Modelos
- `Booking`
  - id, companyId, estimateId, bookingConfigId, agendaId
  - professionalId (nullable)
  - scheduledDate, scheduledStartTime, scheduledEndTime
  - status (pending/confirmed/in_progress/completed/cancelled/rescheduled)
  - paymentMethod (card/cash_check)
  - paymentStatus (pending/paid/failed/refunded)
  - stripePaymentIntentId (nullable)
  - cancelledAt, cancelledById, cancellationReason
  - createdAt, updatedAt
- `BookingSlot` — bookingId, agendaId, date, startTime, endTime (slot bloqueado)
- `BookingCustomerDetail`
  - bookingId, firstName, lastName, email, phone
  - sendReminders (Boolean)
  - address, aptNo, city, zip
- `BookingHomeAccess`
  - bookingId, accessType (someone_home/hide_keys)
  - keepKeyWithProvider (Boolean)
  - accessNote (criptografado em repouso), additionalNote

### Funcionalidades
- **Selecao de data:** calendario mostrando apenas slots disponíveis (nao bloqueados)
- **"First Available":** botao que seleciona automaticamente o primeiro slot livre
- **Customer Details:**
  - Se nao logado: formulario completo (nome, email, telefone, endereco, checkbox reminder)
  - Se logado: campos pre-preenchidos com dados do perfil
- **Acesso ao imovel:** opcoes + nota + chave
- **Pagamento:**
  - Card: integracao Stripe Elements (Payment Intent criado no servidor)
  - Cash/Check: reserva sem cobranca imediata
- **Checkbox de termos**
- **Ao salvar:**
  - Transacao atomica: verificar slot disponível (`SELECT FOR UPDATE`) + criar BookingSlot + criar Booking
  - Estimate status → "converted"
  - Dispara notificacao para empresa e profissional
- **Confirmacao de pagamento APENAS via webhook Stripe** (`/api/stripe/webhook`) com verificacao de assinatura (`stripe.webhooks.constructEvent`)
- **Editar/Cancelar** booking com politicas de prazo

### Notas tecnicas
- Double booking: `SELECT FOR UPDATE` no BookingSlot dentro de transacao Prisma — lock otimista nao e suficiente
- `accessNote` criptografado com AES-256-GCM antes de salvar (chave via env `ENCRYPTION_KEY`)
- Stripe: PaymentIntent criado no server action; confirmado no cliente com Stripe.js; status final atualizado via webhook
- Webhook endpoint: `/api/stripe/webhook` — sem autenticacao better-auth, usa `stripe-signature` header

### Checklist de Pilares
- [ ] **Seguranca:** slot reservado em transacao com `SELECT FOR UPDATE`; `accessNote` criptografado (AES-256-GCM); webhook Stripe com verificacao de assinatura obrigatoria; `cancelledById` sempre da sessao; dados do cliente nao expostos em URL
- [ ] **Boas Praticas:** BookingSlot criado atomicamente com Booking (mesma transacao); status do pagamento atualizado APENAS pelo webhook; politica de cancelamento documentada e aplicada server-side
- [ ] **Escalabilidade:** `@@index([agendaId, date, startTime])` para verificacao de disponibilidade; `@@index([companyId, scheduledDate])`; webhook idempotente (reprocessar mesmo evento nao duplica booking)
- [ ] **Acessibilidade:** calendario de selecao de data segue WAI-ARIA Calendar Pattern; slots indisponíveis com `aria-disabled="true"` e `aria-label` explicativo; Stripe Elements tem acessibilidade propria (nao customizar sem testar); checkbox de termos com label associado e erro de validacao acessível; botao "First Available" com `aria-label` descritivo
- [ ] **Testes:** double booking rejeitado em concorrencia; webhook com assinatura invalida retorna 400; accessNote nunca retorna em texto puro na API; pagamento via cash nao requer Stripe

---

## Fase 8 — Dashboard do Funcionario + Gestao de Jobs

**Objetivo:** Funcionario ve seus jobs do dia, executa checklists e confirma conclusao.

### Modelos
- `JobChecklist` — id, bookingId, createdAt
- `ChecklistItem`
  - id, checklistId, label, order, isChecked
  - checkedByType (employee/client)
  - checkedById, checkedAt
- `ChecklistTemplate` — id, companyId, serviceTypeId, name (templates reutilizaveis)
- `ChecklistTemplateItem` — templateId, label, order

### Funcionalidades
- **Dashboard do funcionario:**
  - Lista de jobs do dia com: horario, cliente, endereco, tipo de servico
  - Valor a receber (comissao calculada — Fase 9)
  - Status visual com cor + icone + texto
- **Checklist por job:**
  - Lista de itens gerada a partir do template do servico
  - Funcionario marca cada item como feito
  - Todos os itens precisam estar checados para marcar como "finalizado"
  - Ao completar: job muda para status "aguardando confirmacao do cliente"
- **Confirmacao do cliente:**
  - Cliente recebe link com token assinado (JWT, expiracao 72h)
  - Ao confirmar: status muda para "concluido"
- **Templates de checklist:** empresa configura itens padrao por tipo de servico

### Notas tecnicas
- Link de confirmacao: `/confirm/[token]` onde token e JWT assinado com `CONFIRMATION_SECRET` (env) contendo `{ bookingId, exp }`
- Dashboard acessivel apenas por profissional associado ao job (verificacao server-side via `Booking.professionalId === session.user.id`)
- Atualizacao de status do checklist: Server Action com revalidacao de cache

### Checklist de Pilares
- [ ] **Seguranca:** link de confirmacao usa JWT assinado — nunca bookingId exposto em URL; verificacao de que o profissional logado e o profissional do job antes de cada acao; `checkedById` sempre da sessao; token de confirmacao com expiracao (72h) e uso unico (invalidar apos uso)
- [ ] **Boas Praticas:** checklist gerado a partir do template no momento da criacao do booking (snapshot — template pode mudar depois); transicao de status valida (nao pode pular etapas); template de checklist com ao menos 1 item validado server-side
- [ ] **Escalabilidade:** `@@index([bookingId])` em ChecklistItem; jobs do dia carregados com `scheduledDate = today` indexado; listagem do dashboard pagina por dia (nao carrega historico completo)
- [ ] **Acessibilidade:** checklist com `role="group"` e `aria-labelledby` para o titulo do job; cada item com `role="checkbox"` e `aria-checked`; progresso do checklist com `aria-valuenow`, `aria-valuemin`, `aria-valuemax`; botao "Finalizar" desabilitado com `aria-disabled="true"` e tooltip explicativo enquanto itens pendentes
- [ ] **Testes:** token invalido ou expirado retorna erro; profissional errado nao acessa job; checklist incompleto nao permite finalizar; confirmacao duplicada e idempotente

---

## Fase 9 — Financeiro + Comissionamento

**Objetivo:** Empresa configura regras de comissao e funcionarios acompanham seus ganhos.

### Modelos
- `CommissionRule`
  - id, companyId, type (individual/group)
  - professionalId (nullable — null = regra de grupo)
  - rateType (percentage/fixed)
  - rate (Decimal)
  - serviceTypeId (nullable — null = aplica a tudo)
  - isActive, createdAt
- `FinancialRecord`
  - id, companyId, bookingId, professionalId
  - grossAmount, commissionRate, commissionAmount, netAmount (todos Decimal)
  - type (service/extra/bonus/deduction)
  - period (Date — para agrupamento)
  - createdAt

### Funcionalidades
- **Configuracao de comissao:**
  - Individual: regra por profissional (pode sobrescrever grupo)
  - Grupo: regra padrao para todos
  - Por tipo de servico ou global
  - Tipo: % sobre o valor ou valor fixo por job
- **Visao do funcionario:**
  - Filtros: diario / semanal / mensal / periodo customizado
  - Tabela: data, cliente, servico, valor bruto, comissao, valor liquido
  - Total do periodo com breakdown
- **Visao do admin/manager:**
  - Relatorio consolidado por profissional e periodo
  - Exportacao CSV com sanitizacao anti-injection
- **Calculo automatico:**
  - Ao booking ser marcado como "concluido" → FinancialRecord criado automaticamente
  - Regra individual tem prioridade sobre grupo; servico especifico tem prioridade sobre global

### Notas tecnicas
- Prioridade de regras: individual+servico > individual+global > grupo+servico > grupo+global
- `FinancialRecord` imutavel apos criacao: nenhum UPDATE permitido — correcoes via novo registro do tipo `bonus` ou `deduction`
- CSV: cada campo verificado — valores iniciando com `=`, `+`, `-`, `@` recebem prefixo `'` (apostrofe) para neutralizar formula
- Relatorios via queries agregadas com `groupBy + _sum` do Prisma; periodos longos (>3 meses) podem usar view materializada

### Checklist de Pilares
- [ ] **Seguranca:** funcionario ve APENAS seus proprios FinancialRecords (filtro por `professionalId` da sessao); admin/manager ve todos da empresa (filtro por `companyId` da sessao); CSV sanitizado contra injection; `FinancialRecord` sem endpoint de UPDATE
- [ ] **Boas Praticas:** calculo de comissao em funcao pura testavel (`calculateCommission(rule, amount): Decimal`); FinancialRecord criado em transacao com a mudanca de status do Booking; sem magia numerica — taxas e limites em constantes nomeadas
- [ ] **Escalabilidade:** `@@index([companyId, period])`, `@@index([professionalId, period])`; relatorios de periodo longo paginados ou assincronos; exportacao CSV gerada com stream (nao carrega tudo em memoria)
- [ ] **Acessibilidade:** tabela financeira com `<caption>`, `scope="col"` e `scope="row"`; valores monetarios formatados com `Intl.NumberFormat` e unidade legivel; filtros de periodo com labels associados; exportacao CSV com `aria-label="Exportar relatorio em CSV"`
- [ ] **Testes:** prioridade de regras de comissao; `calculateCommission` com todos os tipos (percentage/fixed, individual/group); CSV injection neutralizado; funcionario nao acessa records de outro profissional

---

## Fase 10 — Avaliacoes + Notificacoes em Tempo Real + Admin Dashboard

**Objetivo:** Fechar o ciclo com avaliacoes de qualidade, notificacoes e visao executiva.

### Modelos
- `Review`
  - id, bookingId, companyId, customerId
  - rating (Int 1-5), testimony (Text)
  - status (pending/approved/rejected)
  - moderatedById, moderatedAt
  - createdAt
- `Notification`
  - id, companyId, userId
  - type (booking_created/booking_cancelled/job_completed/review_pending/payment_received/...)
  - title, message, link (nullable)
  - isRead, readAt, createdAt
- `NotificationPreference` — userId, companyId, type, inApp (Boolean), email (Boolean), sms (Boolean)

### Funcionalidades
- **Avaliacoes:**
  - Cliente avalia apos job concluido (1-5 estrelas + testemunho)
  - Status inicial: pending → fila de moderacao
  - Admin/moderador aprova ou rejeita
  - Avaliacoes aprovadas visiveis publicamente no perfil da empresa
- **Notificacoes em tempo real:**
  - Badge no sino com contador de nao lidas
  - Dropdown com lista de notificacoes recentes
  - Marcar como lida individual ou "marcar todas"
  - Implementacao: Server-Sent Events (SSE) via `/api/notifications/stream`
  - Redis Pub/Sub como broker de eventos
- **Admin Dashboard:**
  - KPIs: total de bookings (dia/semana/mes), receita, jobs concluidos, cancelamentos
  - Grafico de bookings por periodo
  - Top servicos por volume
  - Avaliacao media da empresa
  - Notificacoes pendentes de moderacao
  - Jobs em andamento no dia

### Notas tecnicas
- SSE: `Response` com `Content-Type: text/event-stream`; sessao verificada antes de abrir stream; conexao fecha ao deslogar
- Redis Pub/Sub: evento publicado no server action → consumido pelo SSE stream do cliente conectado
- Badge count cacheado no Redis (chave `notif:unread:{userId}:{companyId}`) com TTL de 5min; invalidado ao criar/ler notificacao
- Avaliacao vinculada ao Booking (1 avaliacao por booking); link de avaliacao com token assinado (mesmo padrao da Fase 8)

### Checklist de Pilares
- [ ] **Seguranca:** SSE stream autentica sessao antes de abrir e fecha ao expirar; notificacoes filtradas por `userId` + `companyId` da sessao; link de avaliacao com token assinado e uso unico; moderacao de avaliacao restrita a OWNER/MANAGER; testimony sanitizado (strip HTML) antes de salvar e ao exibir
- [ ] **Boas Praticas:** notificacoes criadas como side effect isolado (nao bloqueia o fluxo principal); falha na notificacao nao falha o booking; Redis Pub/Sub com retry em caso de falha de conexao
- [ ] **Escalabilidade:** `@@index([userId, companyId, isRead])` para contagem rapida de nao lidas; badge count via Redis (sem query a cada request); KPIs do admin com queries pre-calculadas ou cache de 5min; SSE com heartbeat a cada 30s para detectar conexoes mortas
- [ ] **Acessibilidade:** sino de notificacoes com `aria-label="X notificacoes nao lidas"` atualizado via `aria-live="polite"`; dropdown com `role="menu"` e `role="menuitem"`; cada notificacao com tempo relativo acessivel (`<time datetime="...">` + texto legivel); avaliacao com estrelas usando `role="radiogroup"` e `role="radio"` (nao apenas emojis/icones sem texto); graficos do dashboard com alternativa textual (tabela de dados)
- [ ] **Testes:** SSE fecha ao invalidar sessao; notificacao nao vaza entre usuarios de empresas diferentes; avaliacao duplicada rejeitada; badge count sincronizado com banco apos marcar como lida

---

## Configuracoes Transversais (Todas as Fases)

### Security Headers — next.config.ts
Configurar em todas as fases desde o inicio:
```ts
headers: async () => [{
  source: "/(.*)",
  headers: [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    // CSP: definir por fase conforme dominios externos adicionados (Stripe, R2, etc)
  ]
}]
```

### Testes — Ferramentas
- **Vitest:** schemas Zod, funcoes puras (calculateCommission, generateSlots, generateSlug)
- **Supertest / fetch mock:** server actions e route handlers
- **Playwright:** fluxos criticos E2E — onboarding, booking completo, pagamento Stripe (modo test)

### Observabilidade
- **Sentry:** captura de erros em producao (server e client)
- **Logs estruturados:** server actions logam `{ action, userId, companyId, result }` — nunca dados sensiveis
- **Alertas:** webhook Stripe com falha, SSE com reconexoes excessivas

### Ambientes
- `dev` — Docker local, Stripe test mode, Redis local
- `staging` — espelha producao, dados anonimizados, Stripe test mode
- `prod` — Vercel + Neon/Supabase PostgreSQL + Upstash Redis + Stripe live

### Estrategia Mobile

**Decisao:** app nativo apenas para profissionais. Clientes e managers usam web.

| Tipo de usuario | Plataforma | Justificativa |
|---|---|---|
| Cliente | Web responsivo | Booking e esporadico; instalar app e atrito desnecessario |
| Manager / Empresa | Web responsivo | Uso intenso em desktop/tablet; web resolve |
| Profissional | App nativo (Expo) | Campo, offline, push critico para cancelamentos |

**Tecnologia:** Expo (React Native) — nao WebView. Motivos:
- Offline-first nativo com React Query + AsyncStorage
- Push notifications via Expo Push (FCM + APNs) sem gambiarras
- Sem risco de rejeicao na App Store (regra 4.2 — thin wrapper)
- App pequeno e focado: ~4 telas (jobs do dia, detalhe, checklist, perfil)

**Compartilhamento com o web:**
- Tipos TypeScript e schemas Zod em `packages/shared/` (monorepo Turborepo — Fase 11)
- API REST exposta pelo Next.js — o app mobile consome os mesmos endpoints
- Logica de negocio pura reutilizada; UI completamente separada

**Timing:** o app mobile NAO e construido nas fases 1-10. A Fase 11 inicia somente apos a Fase 8 (Employee Dashboard) estar solida no web, pois o app e essencialmente a versao nativa daquele dashboard.

---

## Resumo das Fases

| Fase | Nome | Dependencias | Complexidade | Pilar Critico |
|------|------|-------------|--------------|---------------|
| 1 | Tenant + Plans | — | Media | Seguranca (IDOR) |
| 2 | Catalogo + Profissionais | Fase 1 | Baixa | Seguranca (upload) |
| 3 | Gestao de Agendas | Fases 1, 2 | Alta | Escalabilidade (cache de slots) |
| 4 | Configuracao de Booking | Fases 2, 3 | Media | Boas Praticas (estado) |
| 5 | Manager Schedule (Calendario) | Fases 3, 4 | Alta | Acessibilidade (WAI-ARIA) |
| 6 | Estimate + Calculo de Preco | Fase 4 | Media | Seguranca (preco server-side) |
| 7 | Booking Finalization + Stripe | Fases 5, 6 | Alta | Seguranca (webhook + lock) |
| 8 | Dashboard Funcionario + Jobs | Fase 7 | Media | Seguranca (token confirmacao) |
| 9 | Financeiro + Comissao | Fase 8 | Media | Boas Praticas (imutabilidade) |
| 10 | Avaliacoes + Notificacoes + Dashboard | Todas | Alta | Acessibilidade + Escalabilidade |
| 11 | App Mobile do Profissional (Expo) | Fase 8 solida | Alta | Seguranca + Offline |

---

## Fase 11 — App Mobile do Profissional (Expo)

**Objetivo:** Versao nativa do dashboard do profissional com suporte offline e push notifications confiaveis. Resolve o problema central de profissionais que nao recebem cancelamentos a tempo.

**Pre-requisito:** Fase 8 (Dashboard Funcionario) funcionando e estavel no web. O app e a versao nativa daquele fluxo — nao um projeto paralelo inventado.

### Stack mobile
- **Expo SDK** (versao corrente) + **Expo Router** (file-based, alinhado ao App Router do Next.js)
- **EAS Build** — builds para iOS e Android na nuvem
- **EAS Submit** — publicacao automatizada nas stores
- **Expo Push Notifications** — FCM (Android) + APNs (iOS) via servidor Expo

### Estrutura do repositorio
Monorepo com Turborepo:
```
/
├── apps/
│   ├── web/          # Next.js (atual)
│   └── mobile/       # Expo
└── packages/
    └── shared/       # tipos TS, schemas Zod, utils puros
```

### Funcionalidades (escopo do app)
- **Jobs do dia:** lista com horario, cliente, endereco, tipo de servico e status
- **Detalhe do job:** informacoes completas + acesso ao imovel (descriptografado on-demand)
- **Checklist offline:** marcar itens sem internet; sync automatico ao reconectar
- **Finalizacao do job:** marcar como concluido (dispara notificacao ao cliente)
- **Perfil:** dados do profissional, historico de jobs

### Push notifications criticas (motivacao principal)
Eventos que disparam push obrigatoriamente:
- Booking cancelado pelo cliente
- Booking reagendado
- Novo job atribuido ao profissional
- Lembrete 1h antes do job

### Offline-first
- React Query com `persistQueryClient` + AsyncStorage
- Checklist gravado localmente primeiro, enviado ao servidor ao reconectar
- Conflitos resolvidos pela regra: servidor tem prioridade (profissional nao edita dados do cliente)

### Notas tecnicas
- App consome a API REST do Next.js — os mesmos endpoints usados pelo web
- Autenticacao: token JWT via better-auth (endpoint `/api/auth/token` ou sessao cookie compartilhada)
- `packages/shared` exporta: tipos de Booking, Job, ChecklistItem; schemas Zod de validacao; funcoes puras (formatacao de horario, moeda)
- Acesso ao `accessNote` (localizacao de chave): descriptografado no server, enviado apenas quando profissional abre o job — nao fica em cache local

### Checklist de Pilares
- [ ] **Seguranca:** token de autenticacao armazenado no Keychain (iOS) / Keystore (Android) — nunca AsyncStorage; `accessNote` nao persistido offline; push token registrado por usuario autenticado — sem tokens anonimos
- [ ] **Boas Praticas:** offline state com feedback claro para o usuario ("voce esta offline — alteracoes serao sincronizadas"); sync idempotente (mesmo item checado duas vezes nao duplica)
- [ ] **Escalabilidade:** push via Expo Push Service (nao direto para FCM/APNs) — Expo gerencia os tokens; background sync nao bloqueia UI
- [ ] **Acessibilidade:** Dynamic Type (iOS) e Font Scale (Android) respeitados; todos os elementos tocaveis com area minima de 44x44pt; status com icone + texto, nunca so cor
- [ ] **Testes:** checklist salvo offline e sincronizado corretamente; push recebido com app em background; token invalido redireciona para login
