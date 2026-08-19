# Kreator — Funcionalidades da Plataforma

O **Kreator** é uma plataforma SaaS completa de agendamentos online, gestão de serviços, orçamentos e relacionamento com clientes desenvolvida especialmente para prestadores de serviços, oficinas mecânicas, barbearias, clínicas, diaristas, pet shops e estabelecimentos comerciais.

---

## 👤 Para o Cliente (Quem Agenda)

### 🌐 Web & Experiência Pública
- **Diretório de Empresas (`/empresas`):** Busca em tempo real por nome do negócio ou filtro por segmento (oficinas, barbearias, pet shops, limpeza, estética, etc.).
- **Página Personalizada da Empresa (`/[companySlug]`):** Perfil branded com logo, fotos, endereço, horários de funcionamento, catálogo de serviços e avaliações reais de outros clientes.
- **Compartilhamento de Link Exclusivo:** Widget para cópia em 1 clique do link da empresa com QR Code e atalhos para WhatsApp, Telegram e redes sociais.
- **Rotas e Mapas Integrados:** Visualização de mapa e botões de navegação direta ("Como Chegar") para Google Maps, Waze e Apple Maps.
- **Catálogo de Serviços & Upsell:** Seleção de serviços principais com adicionais (serviços extras) e promoções temporárias com contagem de urgência.
- **Frequência de Atendimento:** Agendamento avulso (único) ou recorrente (semanal, quinzenal, mensal).
- **Copilot de Agendamento por IA (NLP):** O cliente pode digitar frases em linguagem natural (ex.: *"Quero corte e barba no sábado de manhã"*) e a IA pré-seleciona serviço, profissional e horário automaticamente.
- **Calendário Interativo:** Escolha de data e horário disponível em tempo real, sem conflito de agenda.
- **Checkout Seguro:** Pagamento com cartão (Stripe), Pix (Mercado Pago) ou pagamento presencial (dinheiro/balcão).
- **Página de Confirmação & Obrigado (`/obrigado`):**
  - Resumo completo da reserva com código identificador;
  - 1 clique para adicionar ao **Google Agenda**, **Apple Calendar (.ics)** e **Outlook**;
  - Envio de comprovante e confirmação no **WhatsApp** do estabelecimento;
  - Acesso ao **Recibo Digital** para conferência de itens e valores;
  - Linha do tempo explicativa: *"O que acontece agora?"*.
- **Portal do Cliente Self-Service (`/[companySlug]/meus-agendamentos`):** Visualização de agendamentos ativos, histórico de visitas, remarcação e cancelamento com antecedência.
- **Avaliações com Estrelas:** Envio de nota (1 a 5 estrelas) e depoimento após a conclusão do atendimento.
- **Páginas de Transparência & Legalidade:** Política de Privacidade (`/privacidade`) em conformidade com a LGPD/GDPR e Termos de Uso (`/termos`).
- **Página de Erro 404 Interativa (`/not-found`):** Recuperação com busca integrada e atalhos rápidos.

### 📱 App Mobile (iOS e Android via Expo)
- Login e cadastro simplificado;
- Busca de empresas por slug ou geolocalização;
- Fluxo nativo completo de agendamento (serviços → data/hora → dados → checkout);
- Lista de agendamentos com atualização de status em tempo real;
- Detalhes do atendimento com rotas e histórico de avaliações;
- Notificações push nativas para confirmação, lembretes e conclusão de serviço;
- Perfil do usuário e preferências de notificação.

---

## 🏢 Para a Empresa (Painel Administrativo)

### 📊 Dashboard & Métricas
- Indicadores em tempo real: Agendamentos hoje, pendentes, receita do mês, taxa de ocupação da semana e avaliação média dos clientes;
- Gráficos de evolução financeira e comparativos semanais;
- Atividades recentes da equipe e novos agendamentos em tempo real.

### 🛠️ Gestão de Serviços & Upsell
- Cadastro estruturado de categorias de serviço;
- Tipos de serviços com definição de preço, duração estimada (minutos) e ordenação visual;
- Cadastro de **Serviços Extras (Upsell)** vinculados para aumento do ticket médio;
- Ativação, desativação e reordenação instantânea no catálogo.

### 👥 Equipe & Profissionais
- Cadastro de profissionais com nome, e-mail, telefone, foto e biografia;
- Vinculação com usuários do sistema;
- Controle de membros com papéis: **Dono (Owner)**, **Gerente (Manager)** e **Funcionário (Employee)**;
- Gestão de comissões por profissional.

### 📅 Agendas & Grade de Horários
- Criação de múltiplas agendas por profissional ou espaço físico;
- Configuração de dias de atendimento, horários de início/fim e intervalo (gap) entre slots;
- Definição de exceções de calendário (bloqueios de feriados, férias, folgas ou horários especiais);
- Status de ciclo de vida: *Rascunho → Ativa → Cancelada*.

### 📦 Booking Configs (Pacotes Publicáveis)
- Combinação de agenda + serviços permitidos + extras em pacotes publicáveis;
- Geração automática do link público personalizado para divulgação no Instagram e WhatsApp;
- Modo de serviço parcial (cliente escolhe os serviços) ou pacote fixo obrigatório.

### 🗓️ Calendário Operacional (Schedule View)
- Mini calendário com navegação rápida mensal e diária;
- Grade de horários (time grid) com eventos, status e dados do cliente em tempo real;
- Criação rápida de eventos manuais e bloqueios de emergência;
- Feed de sincronização externa com **Google Calendar** e **Apple iCal (.ics)**.

### 📋 Gestão de Agendamentos & No-Show
- Tabela com filtros avançados por status, data, profissional e busca textual;
- Detalhe completo: dados do cliente, endereço, profissional responsável e comprovante financeiro;
- Transição de status: *Confirmado → Em Andamento → Concluído → Cancelado*;
- **Gestão Inteligente de Faltas (No-Show):**
  - Registro de faltas com/sem aviso prévio;
  - Penalização automática de clientes com histórico de no-show recorrente;
  - Regra dinâmica de cancelamento/remarcação com janela mínima de antecedência configurável;
- Cancelamento com estorno automático via gateway (Stripe) quando aplicável.

### 👥 CRM 360° de Clientes
- Ficha detalhada do cliente com histórico de agendamentos (concluídos vs cancelados);
- Cálculo de LTV (Lifetime Value) e data da última visita;
- **AI Risk Score:** Predição inteligente de risco de falta/no-show por cliente;
- **AI Campaign Writer:** Gerador automático de mensagens de retenção e reativação via WhatsApp.

### ⭐ Gestão de Avaliações & Reputação
- Listagem de todas as avaliações recebidas com nota (estrelas), comentários e data;
- Exibição de média geral de reputação da empresa;
- Publicação automática de depoimentos aprovados no perfil público da empresa.

### ⚙️ Configurações & Personalização
- Customização de identidade visual: Cor primária da marca, logotipo e imagem de capa;
- Personalização de textos de boas-vindas (Hero Title e Subtitle);
- Configurações de moeda (BRL, USD, EUR), fuso horário e idioma;
- Integração de canais de contato: WhatsApp comercial, Instagram e telefone;
- Cadastro de chave Pix e métodos de pagamento manuais.

---

## 🛡️ Para o Super Admin (Gestão da Plataforma)

- **Dashboard Executivo:** Métricas globais de MRR/ARR, total de empresas, usuários cadastrados e volume de agendamentos;
- **Copilot Executivo por IA (`SuperAdminAICopilot`):** Consultas em linguagem natural sobre churn, faturamento e alertas do sistema;
- **Central de Auto-Healing (`/admin/infraestrutura`):** Diagnóstico em tempo real da saúde dos serviços (Postgres, Redis, Stripe, Mercado Pago, Resend, S3/R2) e reparo automático de instâncias;
- **Gestão de Empresas:** Ativação, suspensão e customização de planos;
- **Gestão de Planos & Assinaturas:** Criação de planos recorrentes (mensal/anual), limites de recursos e sincronização com Stripe Billing;
- **Auditoria de Usuários:** Moderação, banimento com revogação instantânea de sessões e concessão de privilégios administrativos.

---

## 🚀 SEO, Conversão & Marketing da Plataforma

- **Landing Page de Alta Conversão:**
  - Seletor de idiomas nativo com suporte a 6 línguas (**Português, Inglês, Espanhol, Italiano, Francês, Alemão**);
  - **Sessão de Cases de Sucesso:** Histórias reais de negócios (+47% faturamento, 0% no-shows, 30h economizadas);
  - **Avaliações Reais dos Clientes:** Grid de depoimentos verificados com estrelas e fotos;
  - **Garantia de Tempo de Resposta & SLA:** Selos de confirmação imediata 24/7, lembretes WhatsApp e suporte em até 15 min;
  - **CTA Fixo Mobile:** Barra flutuante inferior em smartphones para conversão contínua;
  - **FAQ com 5 Perguntas:** Accordion interativo com injeção de Schema.org `FAQPage`;
  - CTAs com garantias de fricção zero (*"Sem cartão"*, *"Cancele quando quiser"*).
- **Marcação Estruturada Schema.org (JSON-LD):**
  - `Organization` e `SoftwareApplication` para a plataforma;
  - `LocalBusiness` para todas as empresas cadastradas com endereço, telefone e avaliações;
  - `BreadcrumbList` em todas as páginas para navegação e indexação do Google;
  - `FAQPage` para Rich Snippets nos resultados de busca.
- **Indexação & Rastreamento:**
  - `robots.txt` automatizado via `src/app/robots.ts`;
  - `sitemap.xml` dinâmico cobrindo todas as rotas públicas e páginas de empresas via `src/app/sitemap.ts`;
  - `opengraph-image.tsx` dinâmico via `next/og` para prévias no WhatsApp, Twitter e redes sociais;
  - Títulos únicos dinâmicos (`title.template: "%s | Kreator"`) e meta descriptions em todas as rotas.
- **Google Analytics (GA4):**
  - Componente assíncrono integrado ao layout raiz com suporte a `NEXT_PUBLIC_GA_ID` e rastreamento de eventos.

---

## 🔔 Notificações & Canais

| Evento | E-mail (Resend) | WhatsApp | Push (App Expo) |
|---|:---:|:---:|:---:|
| Agendamento confirmado | ✅ | ✅ | ✅ |
| Lembrete 24h antes | ✅ | ✅ | ✅ |
| Lembrete 2h antes | ✅ | ✅ | ✅ |
| Agendamento cancelado / reagendado | ✅ | ✅ | ✅ |
| Serviço concluído & Solicitação de avaliação | ✅ | ✅ | ✅ |
| Alerta de novo agendamento (para a empresa) | ✅ | ✅ | ✅ |

---

## 💳 Pagamentos & Faturamento

- **Cartão de Crédito/Débito:** Processado de ponta a ponta via **Stripe** com webhook de confirmação automática;
- **Pix Automático:** Integração nativa com **Mercado Pago** com liberação instantânea;
- **Pagamento Presencial:** Dinheiro, máquina de cartão ou Pix direto com confirmação manual no painel;
- **Reembolso Automático:** Estorno instantâneo ao cancelar agendamentos pagos com cartão;
- **Stripe Billing:** Assinaturas recorrentes de planos da plataforma com gestão de dunning e períodos de teste.

---

## 🔒 Segurança & Infraestrutura

- **Autenticação Segura:** Sessões gerenciadas via `better-auth` com plugin administrativo;
- **Isolamento de Tenants:** Separação estrita de dados por empresa (`companyId`);
- **Criptografia Forte:** Dados sensíveis e credenciais protegidos com AES-256-GCM;
- **Proteção de Rotas:** Middleware e proxy reverso para proteção de endpoints administrativos e privados;
- **Proteção Anti-Abuso:** Rate limiting com Redis em rotas públicas e formulários;
- **Proteção de Dados Pessoais (LGPD/GDPR):** Termos e políticas claras com proteção de PII e noindex em recibos digitais.
