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
- **Múltiplas agendas** por profissional ou espaço físico, com dias de atendimento, horário de início/fim e intervalo entre slots (30 ou 60 min);
- **Ciclo de vida:** *Rascunho → Ativa → Cancelada*. Publicar uma agenda checa conflito com outra já ativa — mesma faixa de horário no mesmo dia da semana;
- **Exceções de calendário** (`/agendas/[id]/excecoes`): feriado, férias, folga ou horário especial para uma data;
- **Datas no fuso da empresa.** "Hoje" é o dia do salão, não o do servidor: sem isso, um dono no Colorado às 18h era recusado ao criar uma agenda começando hoje, porque em UTC já era amanhã;
- **Agenda em uso continua editável.** Manter a data de início já gravada vale mesmo que ela seja passada — só *mover* o início para trás é proibido. Alterar o horário de funcionamento de uma agenda ativa não pode ser barrado por um campo que ninguém está mexendo;
- **Serviço longo ocupa todos os slots que precisa.** A disponibilidade é calculada por *intervalo*, não pelo horário de início: um serviço de 90 minutos numa grade de 30 reserva os três slots seguidos, e só é oferecido quando a sequência inteira está livre. Sem isso a agenda vendia por cima de si mesma;
- **Bloqueio da empresa inteira.** Evento sem profissional definido bloqueia a agenda de todos, e não só a de quem não tem profissional.

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

### 💰 Comissões & Fechamento Financeiro

- **Comissão por profissional, em duas taxas:** uma para serviços prestados e outra para produtos vendidos no balcão. Sem taxa de produto configurada, a comissão de produto é **zero** — vender uma pomada não paga como cortar cabelo por engano.
- **Comissão carimbada na conclusão:** o valor é congelado no instante em que o atendimento é concluído, junto com a taxa vigente naquele momento. Sem isso o extrato recalculava com a taxa **atual** toda vez que alguém abria a tela, e mudar a taxa de alguém reescrevia o que ele já tinha ganhado — o fechamento da quinzena passada mudava de valor sozinho, depois de pago.
- **Fechamento com ajustes (`Concluir atendimento`):** permite acrescentar itens (produtos, taxas extras) e aplicar desconto fixo ou percentual. O total do orçamento é reescrito, e é sobre o total **final** que a comissão incide.
- **Devolução automática da diferença:** se o fechamento sair mais barato do que já foi cobrado no cartão, a diferença é estornada — limitada ao que o Stripe efetivamente recebeu, porque a parte paga com vale-presente ou plano não tem o que estornar no cartão. A gravação vem primeiro; o estorno, depois. Se o estorno falhar, o atendimento fica concluído e quem fechou recebe o aviso de que a devolução ficou pendente.
- **Extrato por período:** receita e comissão por profissional, separando serviços de produtos, com os agendamentos anteriores ao carimbo calculados pela taxa atual e sinalizados como tal.
- **Split de comissões:** repasse por atendimento (módulo licenciado).

### 🎯 Metas & Painel do Profissional (`/meu-painel`)

- Meta diária de faturamento por profissional, com percentual sem teto (superar a meta aparece como superação, não como 100%);
- Ranking da equipe, opcional por empresa (`showTeamRanking`), com empates dividindo a mesma posição;
- Projeção de fechamento do dia calculada sobre os minutos já decorridos **no fuso da empresa**, não no do servidor.

### 🧾 Comanda Rápida / PDV (`/pos`)

- Venda de balcão sem agendamento, com ou sem profissional vinculado;
- Itens de serviço e de produto na mesma comanda, com comissão congelada no ato da venda;
- Baixa automática de estoque e sugestão de **reposição pelo giro real** (`/reposicao`), sem exigir ficha técnica.

### 🚗 Tempo de Deslocamento (`/tempo-de-deslocamento`)

Para negócios que atendem no endereço do cliente. Reserva o tempo de viagem como bloqueio na agenda **nas duas pontas** do intervalo, calculado por distância geográfica entre os endereços. O bloqueio é limitado por um teto configurável, para que um erro de geocodificação não apague o dia inteiro; distância zero não gera bloqueio nenhum.

### ⏰ Horários Ociosos (`/horarios-ociosos`)

Desconto automático em faixas de baixa ocupação, definidas pelo dono. Aplica-se apenas no sentido de **reduzir** o preço — nunca há acréscimo em horário de pico.

### 📻 Radar de Resgate (`/resgate`)

Lista clientes que deixaram de voltar, com o intervalo típico de retorno de cada um como referência. Serve de base para campanha de reativação por e-mail.

---

## 🔐 Módulos Licenciados

Parte das funcionalidades é vendida como módulo contratável, e não vem incluída no plano. A licença é registrada por empresa (`company_module_license`) e concedida pelo Super Admin em `/admin/modulos`.

**A licença guarda a porta, não só o menu.** Página e server action conferem a licença: quem digitar a URL de um módulo não contratado recebe 404, e a action recusa. Licença cancelada ou **vencida** vale como não contratada.

| Módulo | O que entrega |
|---|---|
| **Vales-presente** | Emissão, validação pelo código no checkout e abatimento no valor a pagar |
| **Fidelidade** | Pontos por valor gasto, com prêmio ao atingir a faixa configurada |
| **Promoções** | Campanhas e cupons por período, com disparo de e-mail marketing |
| **Lista de espera** | Fila pública para horário disputado, com aviso quando abre vaga |
| **Clube de assinaturas** | Planos mensais com saldo de sessões, abatidos no agendamento |
| **Check-in por geofencing** | Confirmação de presença validada por distância do endereço da empresa |
| **Cofre de fotos do cliente** | Histórico visual do atendimento, com consentimento registrado e prazo de retenção |
| **Split de pagamentos** | Divisão da comissão por atendimento |
| **Relatórios avançados, Rebooking IA, Concierge IA, Ghost Slot Buster, Ficha VIP, Dynamic Return** | Catálogo do Super Admin |

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

### Fila de saída (como a entrega funciona)

Nenhuma notificação é enviada no meio da requisição que a origina. O que acontece é:

1. **A intenção é gravada** numa fila (`notification_outbox`), de preferência dentro da mesma transação do agendamento — ou os dois existem, ou nenhum dos dois. Assim não há "agendamento salvo, cliente não avisado".
2. **Um worker entrega depois**, acionado pela rota de cron. Ele reserva cada linha com uma escrita condicional (`PENDING` → `SENDING`), de modo que dois workers simultâneos nunca mandam o mesmo e-mail duas vezes.
3. **Falha não perde a mensagem.** A linha volta para `PENDING` com espera crescente — 1 min, 5 min, 15 min, 1 h, 6 h — até 6 tentativas. Esgotadas, vira `FAILED` com o erro registrado.
4. **Worker que morre no meio não trava a fila.** Linha parada em `SENDING` há mais de 15 minutos é devolvida para `PENDING` automaticamente na passada seguinte.

**Lembretes não se repetem.** O agendamento guarda a marca de que o lembrete já foi enfileirado, uma para a janela de 24 h e outra para a de 2 h. A marca é gravada por escrita condicional *antes* de enfileirar — sem ela, cada passada do cron reenfileirava todos os agendamentos do dia seguinte.

### Canais por evento

| Evento | E-mail (Resend) | WhatsApp | SMS | Push (App Expo) |
|---|:---:|:---:|:---:|:---:|
| Agendamento confirmado | ✅ | ✅ | ✅ | ✅ |
| Lembrete 24 h antes | ✅ | ✅ | ✅ | ✅ |
| Lembrete 2 h antes | ✅ | ✅ | ✅ | ✅ |
| Agendamento cancelado / reagendado | ✅ | ✅ | ✅ | ✅ |
| Serviço concluído (com fatura) | ✅ | ✅ | ✅ | ✅ |
| Pedido de avaliação | ✅ | ✅ | ✅ | ✅ |
| Alerta de novo agendamento (para a empresa) | ✅ | ✅ | ✅ | ✅ |

Cada canal só é acionado se as credenciais dele estiverem configuradas no ambiente (`RESEND_API_KEY`, `WHATSAPP_ACCESS_TOKEN`, provedor de SMS, Expo). O **e-mail é o canal de referência** da fila: é a falha dele que dispara nova tentativa. WhatsApp, SMS e push são disparados em paralelo e não reprocessam sozinhos — reenviar por causa deles duplicaria o e-mail.

O cliente escolhe seus canais em **Perfil → Notificações** (`UserNotificationPreference`), e cada agendamento respeita o `sendReminders` informado no checkout.

---

## 💳 Pagamentos & Faturamento

- **Cartão de crédito/débito (Stripe):** cobrança criada no momento do agendamento, confirmada por webhook assinado. O valor do evento vem do próprio PaymentIntent que a plataforma criou, então não há como divergir do combinado.
- **Pix (Mercado Pago):** QR Code gerado no checkout e confirmado por webhook com assinatura HMAC, reverificado contra a API do Mercado Pago. **O valor recebido é conferido contra o valor devido**, gravado no agendamento quando a cobrança é aberta: pagamento aprovado por menos do que era devido não confirma o agendamento, que fica pendente para alguém decidir — há dinheiro real do lado do cliente, e marcar como falha dispararia estorno e cancelamento sobre um pagamento que existe.
- **Pagamento presencial:** dinheiro, máquina de cartão, Pix por chave, Zelle, Venmo ou Cash App, com confirmação manual de recebimento no painel e registro de quem confirmou.
- **Sinal (depósito):** percentual configurável cobrado na reserva, com o restante no atendimento. Pode ser fixo ou variar pela faixa de confiança do cliente.
- **Vale-presente e plano:** abatidos antes da cobrança online; se cobrirem o total, o agendamento é confirmado sem cobrança nenhuma.
- **Estorno no cancelamento:** calculado sobre o que o gateway **efetivamente recebeu**, não sobre o total do orçamento, e com a taxa de cancelamento tardio descontada quando aplicável. Cancelar devolve também saldo de vale-presente e crédito de sessão de plano.
- **Stripe Billing:** assinatura recorrente dos planos da plataforma, com cobrança por inadimplência em dois estágios (aviso e bloqueio) e período de tolerância global configurável.
- **Exportação CSV** de agendamentos por status e período, com BOM UTF-8 para abrir direto no Excel.

---

## 🔒 Segurança & Infraestrutura

- **Autenticação:** sessões via `better-auth`, com verificação em duas etapas (TOTP, OTP por e-mail e códigos de recuperação) e política de inatividade configurável por tipo de cliente (web e mobile têm regras próprias).
- **Isolamento entre empresas:** toda página e toda server action que recebe o identificador de uma empresa confere se o usuário pertence a ela. Server action é endpoint HTTP e **não herda a proteção do layout** da página que a chama — "ter sessão" nunca é tratado como "ter permissão".
- **Papel mínimo por operação:** configuração que muda a vitrine pública ou o meio de recebimento exige gerente ou dono; emitir vale-presente e mexer em plano de assinatura, idem.
- **Criptografia AES-256-GCM** para credenciais de gateway e tokens de calendário guardados no banco.
- **Rate limiting com Redis** em toda rota pública e em todo formulário aberto.
- **Webhooks assinados** na entrada (Stripe, Mercado Pago) e na saída (HMAC-SHA256, com proteção contra SSRF no destino informado pela empresa).
- **Esquema do banco só muda por migration.** Nenhum caminho de requisição executa DDL: toda tabela nasce em `prisma/migrations`, e isso é verificado por teste.
- **Auditoria** de ações sensíveis, incluindo início de personificação por super admin.
- **LGPD/GDPR:** consentimento registrado para o cofre de fotos, prazo de retenção com expurgo automático, consentimento de marketing coletado no checkout e recibos com `noindex`.

### Garantias de teste

- **466 testes automatizados**, incluindo integração contra um PostgreSQL real;
- **Toda correção é verificada nas duas direções:** o teste é escrito, a correção é desarmada, e só vale se o teste **falhar** sem ela. Três testes desta base já passavam com o furo aberto antes de a prática ser adotada;
- **Guardas estáticas** que impedem o retorno de padrões inteiros: server action sem verificação de acesso, action sem vínculo com a empresa, DDL em tempo de execução, chave de tradução faltando em um idioma e `window.location` dentro de componente renderizado no servidor;
- `tsc` limpo e **zero erros de lint**, com o lint bloqueando o CI e rodando em hook de pre-commit.
