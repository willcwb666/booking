# 🚀 Historico de Releases, Melhorias e Correções (Changelog)

Todas as alterações notáveis, novas funcionalidades, melhorias de UX/UI e correções de bugs deste projeto são documentadas neste arquivo de acordo com as especificações da plataforma.

---

## 🟢 [v3.5.0] - 2026-08-18 (Release Atual - Inovações Operacionais, Ghost Slot Buster, VIP Experience, Dynamic Return Anchor & Check-in Inteligente)
### 🚀 Suíte de Otimização Operacional, Retenção Avançada e Check-in Geofenciado

- **📍 Sistema de Check-in Inteligente com Geofencing & Janela Temporal (`src/server/actions/checkin.ts` & `src/app/checkin/[bookingId]`)**:
  - **Validação Dupla**: Janela de horário (-15 min até +30 min) e proximidade geográfica por GPS (até 250 metros).
  - **Motor Geodésico de Haversine (`src/lib/geo/haversine.ts`)**: Cálculo preciso no servidor com descarte de coordenadas brutas (100% LGPD compliant).
  - **Assinatura Criptográfica HMAC-SHA256 (`src/lib/security/signed-token.ts`)**: Links protegidos contra fraude e spoofing com expiração temporal automática.
  - **Interface Mobile Intuitiva**: Tela de 1-toque com botão de confirmação e modo de teste/simulação integrado.

- **⚡ Ghost Slot Buster - Preenchimento de Desistências de Última Hora (`src/lib/agenda/ghost-slot-buster.ts` & `GhostSlotBanner`)**:
  - Detecção automática de cancelamentos ocorridos com menos de 3 horas de antecedência.
  - Aplicação de desconto relâmpago dinâmico (15% a 25% OFF) para preenchimento imediato da cadeira ociosa.
  - Banner pulsante de destaque no topo da vitrine pública de agendamentos (`/book/[companySlug]`).

- **🤫 Silent Mode & Preferências de Atendimento VIP (`src/lib/experience/vip-preferences.ts` & `VIPExperienceSelector`)**:
  - Escolha personalizada de experiência: **Modo Silencioso/Foco**, **Bebida de Boas-Vindas na Recepção** (Café, Água, Cerveja) e **Cuidados Especiais/Sensibilidade de Pele**.
  - Exibição da ficha VIP para o profissional antes do início do atendimento.

- **🔁 Dynamic Return Anchor - Garantia de Reagendamento Pós-Atendimento (`src/lib/agenda/return-anchor.ts` & `ReturnAnchorCard`)**:
  - Cálculo automático da cadência ideal de retorno por tipo de serviço (ex: 14 dias para barba/manicure, 21 dias para corte, 30 dias para estética).
  - Card integrado na confirmação pós-atendimento (`/obrigado`) com botão de reserva do próximo mês com 10% OFF garantido.

- **🔀 Parallel Resource Buffer - Otimização de Recursos em Etapas (`src/lib/agenda/parallel-buffer.ts`)**:
  - Fatiamento de serviços complexos em etapas (Cadeira Principal vs Lavatório/Área Técnica).
  - Detecção de janelas de liberação da cadeira para encaixe de atendimentos expressos durante pausas químicas.

- **📋 Catálogo Oficial de Add-ons & Exportação para PDF (`/admin/modulos/catalogo`)**:
  - **Apresentação Comercial Executiva**: Tela completa com visualização de todos os 14 add-ons disponíveis, descrição de benefícios, ticket médio e tabela comparativa de investimento (mensal vs vitalício).
  - **Exportação em PDF / Impressão Comercial**: Layout com `@media print` estilizado para gerar propostas comerciais limpas em PDF com 1 clique para apresentações a clientes e leads.
  - **Padronização Visual de Ícones (`src/components/ui/icons.tsx` & `ModuleIcon`)**: Mapeamento semântico unificado de todos os ícones de ação (`DollarSign` para financeiro/split, `Tag` para promoções, `Award` para fidelidade, `MapPin` para geofencing, `Pencil`, `Trash2`, `GripVertical`), eliminando SVGs inconsistentes.

---

## 🟢 [v3.4.0] - 2026-08-18 (Suíte Completa de SEO, Conversão, Cases, Mapas & Compliance)
### 🚀 Suíte de Alto Impacto para SEO, Conversão de Vendas, Confirmações e Proteção de Dados

- **📄 Páginas Novas & Compliance Legal**:
  - **Página de Erro 404 Interativa (`src/app/not-found.tsx`)**: Layout amigável e limpo com caixa de busca, links rápidos para início, diretório de serviços e suporte.
  - **Página de Obrigado & Confirmação Universal (`src/app/obrigado/page.tsx`)**: Confirmação instantânea pós-agendamento com botões "Adicionar ao Google Agenda", download de `.ics` (Apple Calendar/Outlook), envio de comprovante via WhatsApp, rotas e recibo digital.
  - **Política de Privacidade (`src/app/privacidade/page.tsx`)**: Conformidade integral com LGPD e GDPR, detalhando finalidades de tratamento, direitos do titular e contato do DPO.
  - **Termos de Uso do Serviço (`src/app/termos/page.tsx`)**: Regras de serviço, agendamentos, cancelamentos e responsabilidades jurídicas.

- **🗺️ Módulo de Mapas & Rotas em 1 Toque (`CompanyMapRoutes`)**:
  - Componente integrado nas páginas públicas (`src/components/ui/company-map-routes.tsx`) com embed interativo do Google Maps e botões diretos de navegação para **Google Maps**, **Waze** e **Apple Maps**.

- **🔗 Links Personalizados & Compartilhamento Social (`CustomLinkShare`)**:
  - Widget de compartilhamento (`src/components/ui/custom-link-share.tsx`) com botão de cópia de slug em 1 toque, feedback visual com toast e atalhos diretos para WhatsApp, Telegram e Twitter.

- **📈 Sessão de Cases de Sucesso & Avaliações Reais**:
  - Adicionada seção de cases de sucesso na landing page principal em 6 idiomas (Português, Inglês, Espanhol, Italiano, Francês, Alemão) destacando métricas comprovadas (+47% faturamento, 0% no-shows, 30h economizadas).
  - Grid de avaliações verificadas de clientes com estrelas e depoimentos na landing page e integração dinâmica de avaliações reais vindas do banco de dados (`Review`) em `/[companySlug]`.

- **⚡ Garantia de Tempo de Resposta (SLA) & CTA Fixo Mobile**:
  - Bloco de garantias de resposta rápida (confirmação imediata 24/7, lembretes pontuais via WhatsApp e suporte técnico em até 15 minutos).
  - Barra de CTA flutuante inferior no mobile com detecção de rolagem para retenção e conversão contínua.

- **🔍 SEO Estruturado, Schema.org JSON-LD, Robots & Sitemap**:
  - Injeção de marcações Schema.org (`Organization`, `SoftwareApplication`, `LocalBusiness`, `FAQPage` e `BreadcrumbList`) em formato JSON-LD.
  - Configuração de template de títulos dinâmicos (`title.template: "%s | Kreator"`), meta descriptions exclusivas e metadados Open Graph / Twitter Cards.
  - Gerador dinâmico de imagem de preview para redes sociais (`src/app/opengraph-image.tsx`) via `next/og`.
  - Geração automática de `robots.txt` (`src/app/robots.ts`) e `sitemap.xml` dinâmico (`src/app/sitemap.ts`) indexando todas as rotas públicas e páginas de empresas ativas.

- **📊 Integração Google Analytics (GA4)**:
  - Componente `GoogleAnalytics` assíncrono via `next/script` com suporte a `NEXT_PUBLIC_GA_ID` e helper de despacho de eventos.

- **🐛 Correções de Bugs & Ajustes Técnicos**:
  - **[BUG] Erro de validação do Prisma no login com Google / Session (`Unknown argument client`)**: O Prisma Client gerado em `src/generated/prisma` estava desatualizado em relação aos campos `client` e `lastActivityAt` adicionados ao model `Session`. Executado `prisma generate` e `prisma db push` para sincronização completa do banco de dados e do client TypeScript.
  - **[BUG] Aviso de scroll suave no Next.js (`missing-data-scroll-behavior`)**: Adicionado o atributo `data-scroll-behavior="smooth"` no elemento `<html>` em [`src/app/layout.tsx`](file:///d:/projetos/booking/src/app/layout.tsx) para conformidade com o Next.js durante transições de rota.
  - **[BUG] Metadados genéricos em páginas filhas**: Rotas como `/empresas`, `/login`, `/register` e perfis de empresa compartilhavam o título estático do root layout. Corrigido com `generateMetadata` dinâmico e `metadata` dedicado em cada página.
  - **[BUG] Risco de indexação de dados pessoais (PII) em recibos**: Recibos digitais (`/receipt/[bookingId]`) não possuíam diretiva contra indexação de motores de busca. Adicionado `robots: { index: false, follow: false }` para proteção de privacidade.
  - **[BUG] Ausência de textos alternativos em ícones/logos**: Imagens e SVGs sem descrição foram auditados e receberam atributos `alt` contextuais e `aria-hidden="true"` / `aria-label` para acessibilidade.

---

## 🟢 [v3.3.0] - 2026-07-26 (Política de Faltas No-Show & Remarcações)
### 🛑 Gestão Inteligente de Faltas (No-Show) & Regra Dinâmica de Antecedência para Remarcação

- **🛑 Registro Inteligente de Faltas (`markBookingNoShowAction`)**:
  - Adicionado botão de ação rápida de **Falta/No-Show** na tabela de agendamentos (`/[companySlug]/agendamentos`).
  - Ao clicar, abre modal perguntando *"O cliente avisou com antecedência?"*:
    - **Sim (Avisou)**: Marca o status como `CANCELLED` regular, sem penalizar o contador de faltas.
    - **Não (Faltou sem aviso)**: Marca o novo status `NO_SHOW` e contabiliza a falta no perfil do cliente.

- **⚙️ Aba "Clientes & Faltas" nas Configurações da Empresa (`/[companySlug]/configuracoes`)**:
  - Adicionado campo **"Limite de Faltas Sem Aviso Permitidas"** (padrão: 2 faltas).
  - Define a regra de tolerância: ao atingir o limite, o atendente recebe alerta vermelho no painel e o cliente online é obrigado a pagar sinal prévio.

- **⏰ Regra Dinâmica de Remarcação Sincronizada (`rescheduleBookingAction`)**:
  - A regra de reagendamento consulta dinamicamente o valor de `minCancellationNoticeHours` (ex: 12h, 24h ou o configurado na empresa).
  - Para o cliente no portal público, bloqueia reagendamentos dentro da janela mínima com mensagem explicativa.
  - Para o atendente no painel, permite remarcar emitindo alerta de remarcação emergencial de última hora.

---

## 🟢 [v3.2.0] - 2026-07-26 (Super Admin AI Suite & Auto-Healing)
### 🛡️ Copilot Executivo por IA & Central de Auto-Healing de Instâncias (Tenants)

- **🤖 Copilot Executivo do Super Admin (`SuperAdminAICopilot`)**:
  - Implementado assistente de IA exclusivo no topo do Dashboard Executivo (`/admin`).
  - Permite consultar em linguagem natural sobre risco de cancelamentos (churn), métricas de faturamento (MRR/ARR) e empresas inadimplentes com cards de diagnóstico instantâneo.

- **⚡ Auto-Healing de Instâncias / Tenants (`repairCompanyTenantAction`)**:
  - Módulo inteligente adicionado ao Monitor de Infraestrutura (`/admin/infraestrutura`).
  - Permite disparar rotinas automáticas de reparo de presets, reinicialização de serviços padrão e reconexão de webhooks Stripe sem interromper o serviço das empresas.

---

## 🟢 [v3.1.0] - 2026-07-26 (AI Suite & Portal Enterprise)
### 🤖 Suíte de Inteligência Artificial Nativa (AI Suite) & Portal do Cliente Self-Service

- **💬 Copilot de Agendamento por Linguagem Natural (`AIBookingCopilot`)**:
  - Implementado processador de linguagem natural (NLP) no topo da tela pública de agendamento (`/book/[companySlug]/...`).
  - O cliente digita frases livres como *"Quero corte e barba no sábado de manhã com o Renato"* e a IA extrai serviços, profissional, data e horário exato em 1 clique.

- **🛡️ Previsor Inteligente de Faltas & No-Show (`AI Risk Score`)**:
  - Algoritmo de classificação de risco de falta por cliente (pontuação de 0 a 100 com fatores explicativos e nível *Low*, *Medium*, *High*).
  - Sugestão automática de exigência de sinal (Pix/Stripe) para clientes de alto risco de no-show.

- **✍️ Gerador de Campanhas de Retenção por IA (`AI Campaign Writer`)**:
  - Integrado à ficha do cliente no CRM (`/[companySlug]/clientes`). Gera com 1 clique textos ultra-personalizados de reativação para WhatsApp e E-mail com botão de cópia instantânea.

- **👤 Portal do Cliente Self-Service (`/[companySlug]/meus-agendamentos`)**:
  - Área cliente dedicada para visualização de reservas ativas e históricas, reagendamento, cancelamento e download de comprovantes.
  - Adicionado atalho no menu lateral sob a seção Operação.

---

## 🟢 [v3.0.0] - 2026-07-26 (Major Release)
### 💎 Reformulação Completa do Tema Stripe, CRM 360°, Monitor de Infraestrutura & UX/UI

- **Tema de Design System Stripe Unificado**:
  - Aplicação dos tokens de design do Stripe (gradientes corporativos `navy-950`, botões primários com efeito elevado, sombras ultra suaves `shadow-2xs`, pílulas de status elegantes).
  - Atualização completa em todas as telas da plataforma (`/servicos`, `/equipe`, `/agendas`, `/clientes`, `/admin/...`).

- **Módulo CRM 360° de Clientes (`/[companySlug]/clientes`)**:
  - LTV (Lifetime Value), contagem total de agendamentos (concluídos vs cancelados), data da última visita e busca inteligente em tempo real.
  - Ficha completa do cliente com histórico financeiro e atalho dedicado no menu da empresa.

- **Painel de Infraestrutura & Saúde do Sistema (`/admin/infraestrutura`)**:
  - Monitoramento em tempo real da latência de PostgreSQL, Redis Cache, Stripe API, Mercado Pago, Resend, S3/R2 Storage e Push Notifications (Expo).
  - Server Action isolada com `"use server"` para verificações síncronas com tratamento de falhas por fallback.
  - Adicionada opção no menu do Super Admin com ícone de escudo.

- **Padronização Universal de Botões de Ação (Icon-Only + Tooltips)**:
  - Removido texto estático de todos os botões de ação em listas e tabelas (Editar, Excluir, Banir, Desbanir, Cancelar, Publicar, Gerenciar, Resetar Presets).
  - Convertidos para botões de ícones puros envolvidos pelo componente `<ActionTooltip label="...">`, exibindo dicas flutuantes minimalistas ao passar o cursor do mouse.

- **Padronização Universal de Status (Dot-Only Pills + Tooltips)**:
  - Eliminação de rótulos inconsistentes ("Habilitado", "Desabilitado", "Ativa", "Inativa").
  - Substituição por pílulas minimais de status contendo exclusivamente a bolinha de cor dinâmica (🟢 Verde pulsante para *Ativo*, ⚪ Cinza para *Inativo*, 🟡 Amarelo para *Pendente*, 🔴 Vermelho para *Inadimplente*).
  - Exibição contextual do significado do status no tooltip ao passar o mouse (`ActionTooltip`).

- **Dashboard Executivo do Super Admin Reformulado (`/admin`)**:
  - Banner com gradiente executivo `navy-950`, efeito glow e badge pulsante de status da plataforma (*SISTEMA 100% ONLINE*).
  - Cards de KPI com efeitos de iluminação em hover, variação percentual (+18.4% / +22.1%) e alternância no gráfico.
  - Gráfico em curva suave Bezier (SVG vetorial) com gradiente e inspetor de hover dinâmico em moeda.
  - Feed de Atividades do SaaS em Tempo Real e Central de Ações Rápidas.

- **Biblioteca de Componentes UI Primitivos Reutilizáveis (`src/components/ui/` & `src/components/forms/`)**:
  - `modal.tsx`, `confirm-dialog.tsx`, `page-header.tsx`, `status-badge.tsx`, `empty-state.tsx`, `search-input.tsx`, `form-elements.tsx`, `action-tooltip.tsx`.

---

## 🟢 [v2.14.2] - 2026-07-25
### 📐 Largura Uniforme das Páginas do Painel Admin

- **Container de página padronizado (`.page-content`)**: as 11 telas do Super Admin usavam wrappers inconsistentes — algumas com `max-w-7xl` (mais estreitas, ex. Financeiro), outras sem limite de largura (bem mais largas, ex. Planos/Relatórios/Módulos), e ainda variações de padding (`px-8` vs `px-10`, com/sem `py-8`). Como o layout já envolve o conteúdo em `.page-container` (que aplica o padding e o scroll), o padding inline das páginas gerava espaçamento duplicado. Agora todas as páginas usam a classe `.page-content` do design system (largura máxima de 80rem, centralizada, alinhada à esquerda), eliminando o padding redundante e alinhando o admin ao mesmo padrão das telas de empresa. Resultado: todas as páginas admin têm exatamente a mesma largura e recuo.

---

## 🟢 [v2.14.1] - 2026-07-24
### 🎨 Padronização de Neutros Secundários no Painel Admin

- **Escala de cinzas unificada nos tokens do design system**: as 11 telas administrativas + os modais (`reset-preset`, `subscriptions`) usavam cinzas Tailwind crus de famílias misturadas (`slate-*`, `gray-*`, `stone-*`) para texto, bordas e fundos. Agora todos consomem os tokens neutros: textos → `var(--color-text-heading/text/muted/subtle)`, bordas → `var(--color-border)` / `var(--color-border-strong)`, fundos → `var(--color-bg-subtle/muted)`, botões escuros → `var(--color-navy)` / `var(--color-navy-hover)`. Acentos suaves da marca (`indigo-50/100/200`) foram mapeados para `var(--color-primary-light)` e `var(--color-primary)/20-40`, e os hex fixos do gráfico SVG (grade e linha) também passaram a usar as variáveis. Cores semânticas de status (verde/vermelho/âmbar/azul/violeta) foram preservadas propositalmente.

---

## 🟢 [v2.14.0] - 2026-07-24
### 🎨 Padronização do Design System (Stripe) — Agenda e Painel Admin

- **Componentes da Agenda migrados para variáveis CSS**: `mini-calendar`, `time-grid`, `month-view`, `create-event-dialog` e `event-detail-dialog` deixaram de usar cores Tailwind cruas (`blue-600`, `gray-*`) e passaram a consumir os tokens do design system (`var(--color-primary)`, `var(--color-border)`, `var(--color-text-heading/muted/subtle)`, `var(--color-bg-subtle/muted)`). Os diálogos agora usam as classes utilitárias `.input`, `.select`, `.textarea`, `.btn-primary`, `.btn-ghost` e `.btn-destructive`. As cores semânticas da legenda de eventos (azul/violeta/laranja) foram mantidas propositalmente.

- **Cor de marca unificada no Painel Admin**: todas as 11 telas administrativas (`overview`, `companies`, `users`, `plans`, `presets`, `segments`, `finance`, `relatorios`, `notificacoes`, `configuracoes`, `modulos`) tinham o roxo da marca hardcoded como `#635bff`/`indigo-*`. Agora usam `var(--color-primary)` e `var(--color-primary-hover)`, incluindo os atributos SVG do gráfico de tendência (gradiente e linha). Isso garante que qualquer ajuste futuro na paleta se propague automaticamente para o admin.

---

## 🟢 [v2.13.0] - 2026-07-24
### 🐛 Correções de Bugs Críticos (Auditoria Técnica)

- **[BUG] Ícone de serviço padrão quebrado ao restaurar presets**: A função `unwrapPresetContainerService` inservia o ícone padrão como `'Scissors'` (PascalCase legado) via SQL, ignorando a convenção kebab-case (`'scissors'`) adotada na refatoração do catálogo Lucide. Serviços desempacotados de presets apareciam sem ícone visível. Corrigido para `'scissors'`.

- **[BUG] Notificações duplicadas no webhook do Stripe**: O handler `payment_intent.succeeded` chamava `notifyBookingConfirmed` e `notifyCompanyNewBooking` sempre que o Stripe entregava o evento — sem verificar se o agendamento já estava confirmado. O Stripe pode entregar o mesmo evento mais de uma vez (retry automático em falhas de rede), resultando em clientes recebendo múltiplos e-mails de confirmação e a empresa múltiplos alertas. Agora a notificação só é disparada se o pagamento ainda não estava marcado como `PAID`.

- **[BUG] Datas nos e-mails sempre em formato brasileiro (DD/MM/YYYY)**: A função `formatDate` em `email.ts` formatava a data como `DD/MM/YYYY` hardcoded, independente do locale da empresa. Empresas configuradas com `locale: "en-US"` enviavam e-mails com datas no formato errado para clientes americanos (ex: `07/24/2026` em vez de `July 24, 2026`). Corrigido para usar `Intl.DateTimeFormat` com o locale da empresa em todos os templates de e-mail (confirmação, lembrete, cancelamento, waitlist, promoções e comprovante).

---

## 🟢 [v2.12.2] - 2026-07-24
### 👕 Busca por `shirt` (Camisa/Passadoria) e `worker` (Trabalhador)
- **Suporte Expandido a Buscas**:
  - `shirt`: Retorna os ícones de Camisa (`Shirt`) e Cabide/Passadoria (`Hanger`).
  - `worker`: Retorna os ícones de Capacete (`HardHat`), Técnico (`UserCog`), Maleta (`Briefcase`), Martelo (`Hammer`), Fábrica (`Factory`), Engrenagem (`Cog`), Atendimento (`User`), Equipe (`Users`), Aprovado (`UserCheck`).

---

## 🟢 [v2.12.1] - 2026-07-24
### 👷 Suporte a Busca por Ícones de Trabalhadores (`worker` / `trabalhador`)
- Adicionados os ícones `HardHat`, `Briefcase`, `UserCog`, `Hammer`, `Factory`, `Cog`.

---

## 🟢 [v2.12.0] - 2026-07-24
### 🔍 Seletor de Ícones Compacto com Todos os Ícones da Biblioteca
- Quadrados de ícones reduzidos com visual super limpo em grid de 10 colunas.
