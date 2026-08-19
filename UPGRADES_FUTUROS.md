# 🚀 Roadmap de Upgrades Futuros & Inovações Estratégicas (Kreator SaaS)

Este documento centraliza a arquitetura, conceitos e especificações técnicas para os próximos upgrades de alto impacto da plataforma Kreator.

---

## 🌐 1. Sistema de Internacionalização Autônoma & Precificação Global

### 🎯 O Desafio
Traduções de arquivos fixos (`.json`) cobrem apenas menus e botões estáticos, mas **não traduzem o conteúdo dinâmico criado pelos estabelecimentos** (nomes de serviços customizados, descrições de pacotes, observações). Além disso, conversão cambial direta gera preços quebrados e oscilações indesejadas.

### 🏗️ Arquitetura em 2 Frentes

#### 🧠 Frente 1: Tradução Dinâmica por IA com Cache Persistente (*Translation Memory*)
- **Detecção Inicial**: Quando um visitante acessa a vitrine pública (`/book/[companySlug]`), o sistema detecta o idioma preferencial através do `Accept-Language` e geolocalização do IP.
- **Cache Permanente no Banco de Dados (`translation_cache`)**:
  - Para cada texto dinâmico (ex: *"Corte Degradê Navalhado + Barboterapia"*), o sistema gera um hash SHA-256 e busca no banco:
    ```sql
    SELECT "translatedText" FROM "translation_cache" 
    WHERE "sourceHash" = $1 AND "targetLocale" = $2;
    ```
  - **Se existir**: Retorna em **0ms** com custo zero de API.
  - **Se for o primeiro acesso estrangeiro**: O sistema aciona o Google Gemini 2.0 Flash em segundo plano, grava a tradução no banco e nunca mais consome tokens para aquela frase (*Write-Once, Read-Forever*).

#### 📞 Frente 2: Inferência Determinística por DDI Telefônico (+55, +1, +351, +34)
- O código de discagem internacional (DDI) é a âncora cadastral mais segura do mercado.
- Ao cadastrar o telefone da empresa ou do cliente, o sistema infere e preenche automaticamente todas as configurações regionais:

| DDI Identificado | País / Mercado | Moeda Nativa | Idioma Base | Fuso Horário Padrão | Máscara de Telefone |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **`+55`** | 🇧🇷 Brasil | **BRL (R$)** | `pt-BR` | `America/Sao_Paulo` | `(99) 99999-9999` |
| **`+1`** | 🇺🇸 EUA / Canadá | **USD ($)** | `en` | `America/Denver` / `New_York` | `(999) 999-9999` |
| **`+351`** | 🇵🇹 Portugal | **EUR (€)** | `pt-PT` | `Europe/Lisbon` | `999 999 999` |
| **`+34`** | 🇪🇸 Espanha | **EUR (€)** | `es` | `Europe/Madrid` | `999 99 99 99` |
| **`+44`** | 🇬🇧 Reino Unido | **GBP (£)** | `en-GB` | `Europe/London` | `9999 999999` |

---

## 👤 2. Arquitetura de Identidade de Clientes & "Kreator Global Passport"

### 🔍 Como Funciona Hoje (Rotina Atual no Código):
1. **Identidade de Autenticação (`User` - BetterAuth)**:
   - A conta de login é **global** (`User.email`). Se o cliente criar um login no Kreator, ele tem uma única conta e senha para toda a plataforma.
2. **Dados do Cliente no Estabelecimento (`Customer`)**:
   - Cada empresa possui sua própria ficha isolada do cliente (`@@unique([companyId, email])`).
   - **Por que isso é necessário?**
     - **Privacidade & LGPD/GDPR**: A barbearia não pode ver o histórico financeiro ou notas que a clínica médica ou pet shop fez sobre aquele mesmo cliente.
     - **Métricas Independentes**: O cliente pode ser VIP com 20 visitas na barbearia e ter 0 faltas, mas ser um cliente novo na oficina mecânica.
3. **Experiência de Checkout Atual**:
   - Quando o cliente já tem agendamento anterior ou está logado, os campos do checkout (Nome, Telefone, Email, Endereço) são **auto-preenchidos automaticamente** pelo navegador/sessão.

---

### 🚀 Upgrade Futuro: "Kreator Global Passport" (1-Click Checkout Estilo Shop Pay / Apple Pay)
- **Conceito**: Quando o cliente digitar seu número de WhatsApp/Telefone em **qualquer estabelecimento da rede Kreator**:
  1. O sistema reconhece o número e envia um código de 6 dígitos via WhatsApp/SMS ou verifica se ele já está autenticado no dispositivo.
  2. **1-Click Checkout**: Todos os dados cadastrais (nome, preferências, histórico de faturamento e cartões salvos no Stripe) são preenchidos instantaneamente.
  3. O cliente agenda na barbearia, na oficina ou no pet shop **em menos de 5 segundos**, sem preencher formulários repetitivos.

---

## ⚡ 3. Ghost Slot Buster 2.0 (Push Inteligente & Leilão Relâmpago)
- **Notificação Instantânea por WhatsApp**: Disparo automático para os clientes da lista de espera com maior propensão de compra quando uma desistência ocorrer a menos de 2h do horário.
- **Leilão Dinâmico de Desconto**: O desconto aumenta progressivamente à medida que o horário da vaga se aproxima (ex: 2h antes = 15% OFF, 45 min antes = 30% OFF), garantindo que a cadeira nunca fique ociosa.

---

## 📍 4. Smart Geofenced Check-in 2.0 (Recepção Autônoma & Totem)
- **Notificação Automática na Recepção/TV**: Ao cruzar o raio de 250 metros da empresa, o painel do profissional/recepção acende com alerta sonoro discreto: *"Cliente João da Silva chegou (Check-in via GPS Confirmado)"*.
- **Modo Totem / Tablet**: QR Code dinâmico no balcão para check-in instantâneo sem necessidade de interação verbal.
