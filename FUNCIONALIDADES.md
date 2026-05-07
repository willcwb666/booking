# Agendei — Funcionalidades

## Para o cliente (quem agenda)

### Web
- Busca empresa pelo link ou slug
- Visualiza serviços disponíveis com preços e duração
- Seleciona serviços, extras e frequência (única, semanal, quinzenal, mensal)
- Escolhe data e horário disponível no calendário
- Preenche dados pessoais e endereço
- Paga com cartão (Stripe) ou dinheiro no dia
- Recebe confirmação por e-mail
- Recebe lembrete 24h e 2h antes por e-mail
- Avalia o serviço após conclusão (1 a 5 estrelas + comentário)

### App mobile (iOS e Android via Expo)
- Login e cadastro
- Busca empresa por slug
- Fluxo completo de agendamento (serviços → data/hora → dados → confirmação)
- Lista de agendamentos com status em tempo real
- Detalhes do agendamento com dados do cliente e avaliação
- Notificações push (confirmação, lembrete, cancelamento)
- Perfil com logout

---

## Para a empresa (painel administrativo)

### Dashboard
- Total de agendamentos hoje
- Agendamentos pendentes
- Receita do mês
- Agendamentos da próxima semana
- Avaliação média dos clientes

### Serviços
- Cadastro de categorias de serviço
- Tipos de serviço com preço, duração e ordenação
- Serviços extras opcionais
- Ativar/desativar serviços

### Profissionais
- Cadastro de profissionais com nome, e-mail, telefone e bio
- Vinculação com usuário do sistema (opcional)
- Ativar/desativar

### Agendas
- Criação de agendas com dias da semana, horário e intervalo entre slots
- Data de início e fim configuráveis
- Vinculação de profissionais à agenda
- Status: Rascunho → Ativa → Cancelada

### Booking Configs (Configurações de agendamento)
- Combina agenda + serviços + extras em um pacote publicável
- Status: Rascunho → Publicado
- Link público gerado automaticamente para compartilhar com clientes
- Permite serviço parcial (cliente escolhe quais quer) ou completo

### Calendário / Schedule
- Mini calendário com navegação por mês
- Grade de horários (time grid) com eventos do dia
- Visualização mensal
- Criação de eventos manuais (compromissos, bloqueios)

### Agendamentos
- Lista com filtros por status, data e busca textual
- Detalhe com dados do cliente, endereço, acesso e pagamento
- Transição de status: Confirmado → Em andamento → Concluído
- Cancelamento com motivo e reembolso automático (Stripe)
- Banner para avaliação quando concluído

### Avaliações
- Lista de avaliações recebidas com estrelas e comentários
- Média geral em destaque
- Vinculadas ao agendamento (1 avaliação por booking)

### Equipe
- Convite de membros por e-mail
- Papéis: Dono, Gerente, Funcionário
- Troca de papel e remoção de membros
- Lista de membros ativos e inativos

### Configurações da empresa
- Edição de nome, telefone e endereço
- Link de agendamento copiável

### Perfil do usuário
- Edição de nome, bio e localização
- Alteração de senha

---

## Para o super admin

- Métricas globais (empresas, usuários, agendamentos, receita total)
- Lista de empresas com busca + ativar/desativar
- Lista de usuários com busca + banir/desbanir + promover a admin
- Banimento invalida todas as sessões imediatamente

---

## Notificações

| Evento | E-mail | Push (app) |
|--------|--------|------------|
| Agendamento confirmado | ✅ | ✅ |
| Lembrete 24h antes | ✅ | ✅ |
| Lembrete 2h antes | ✅ | ✅ |
| Agendamento cancelado | ✅ | ✅ |
| Serviço concluído | — | ✅ |
| Novo agendamento (para empresa) | — | ✅ |

---

## Pagamentos

- Cartão de crédito/débito via Stripe
- Dinheiro/cheque no dia do serviço
- Reembolso automático ao cancelar (cartão)
- Slot liberado automaticamente se pagamento falhar

---

## Segurança

- Autenticação com sessões (better-auth)
- Proteção de rotas (proxy.ts) — públicas, autenticadas e admin
- Rate limiting com Redis em ações públicas
- Dados sensíveis criptografados (AES-256-GCM)
- Verificação de ownership em avaliações e bookings
- Sessões invalidadas ao banir usuário
- Cron autenticado por header (não query string)

---

## Tecnologias

- **Web:** Next.js 16, React 19, Tailwind CSS, TypeScript
- **Mobile:** Expo (React Native), Expo Router
- **Banco:** PostgreSQL 15 (Prisma v7)
- **Pagamento:** Stripe
- **E-mail:** Resend
- **Push:** Expo Push API
- **Cache/Rate limit:** Redis
- **Auth:** better-auth com admin plugin
