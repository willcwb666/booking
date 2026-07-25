# 🚀 Historico de Releases, Melhorias e Correções (Changelog)

Todas as alterações notáveis, novas funcionalidades, melhorias de UX/UI e correções de bugs deste projeto são documentadas neste arquivo de acordo com as especificações da plataforma.

---

## 🟢 [v2.14.0] - 2026-07-24 (Release Atual)
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
