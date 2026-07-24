import "server-only";

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const LOCAL_API_URL = process.env.WHATSAPP_API_URL; // Ex: http://localhost:8080/message/sendText/default
const LOCAL_API_KEY = process.env.WHATSAPP_API_KEY; // Ex: secret_key_local
const API_VERSION = "v18.0";

function formatPhone(phone: string): string {
  const hasCountryCode = phone.trim().startsWith("+");
  const digits = phone.replace(/\D/g, "");
  if (hasCountryCode) return digits;
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

/**
 * Envia uma mensagem via WhatsApp.
 * Prioridade:
 * 1. Gateway Localhost / Gratuito (Evolution API / Baileys) se WHATSAPP_API_URL estiver setado.
 * 2. Meta Cloud API oficial se WHATSAPP_PHONE_NUMBER_ID e TOKEN estiverem setados.
 * 3. Log de desenvolvimento em modo local se nenhuma chave estiver configurada.
 */
async function sendWhatsAppMessage({
  to,
  messageText,
  templateName,
  components,
}: {
  to: string;
  messageText: string;
  templateName: string;
  components: object[];
}): Promise<void> {
  const formattedPhone = formatPhone(to);

  // 1. Gateway Gratuito / Localhost (Evolution API, Baileys, UltraMsg, Z-API...)
  if (LOCAL_API_URL) {
    try {
      const res = await fetch(LOCAL_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(LOCAL_API_KEY ? { apikey: LOCAL_API_KEY, Authorization: `Bearer ${LOCAL_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          number: formattedPhone,
          phone: formattedPhone,
          text: messageText,
          message: messageText,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("[whatsapp-local] Falha ao enviar via API local:", err);
      } else {
        console.log(`[whatsapp-local] Mensagem enviada com sucesso para ${formattedPhone} via ${LOCAL_API_URL}`);
      }
      return;
    } catch (err) {
      console.error("[whatsapp-local] Erro de conexão com API local:", err);
      return;
    }
  }

  // 2. Meta Cloud API Oficial
  if (PHONE_NUMBER_ID && ACCESS_TOKEN) {
    try {
      const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;
      const body = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "template",
        template: { name: templateName, language: { code: "pt_BR" }, components },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error(`[whatsapp-meta] Falha ao enviar template ${templateName}:`, err);
      }
      return;
    } catch (err) {
      console.error("[whatsapp-meta] Erro de conexão com a Meta Cloud API:", err);
      return;
    }
  }

  // 3. Fallback Local Dev (Console Log formatado)
  console.log(`\n================ [WHATSAPP DEV MOCK] ================`);
  console.log(`📱 Para: +${formattedPhone}`);
  console.log(`💬 Mensagem:\n${messageText}`);
  console.log(`=====================================================\n`);
}

export async function sendBookingConfirmedWhatsapp(params: {
  phone: string;
  customerName: string;
  companyName: string;
  serviceName: string;
  date: string;
  startTime: string;
}): Promise<void> {
  const dateFormatted = params.date.split("-").reverse().join("/");
  const text = `Olá, *${params.customerName}*!\n\nSeu agendamento em *${params.companyName}* foi *CONFIRMADO* com sucesso! ✅\n\n📌 *Serviço:* ${params.serviceName}\n📅 *Data:* ${dateFormatted}\n⏰ *Horário:* ${params.startTime}\n\nObrigado por escolher nossos serviços!`;

  await sendWhatsAppMessage({
    to: params.phone,
    messageText: text,
    templateName: "agendamento_confirmado",
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: params.customerName },
          { type: "text", text: params.companyName },
          { type: "text", text: params.serviceName },
          { type: "text", text: dateFormatted },
          { type: "text", text: params.startTime },
        ],
      },
    ],
  });
}

export async function sendBookingReminderWhatsapp(params: {
  phone: string;
  customerName: string;
  companyName: string;
  serviceName: string;
  date: string;
  startTime: string;
}): Promise<void> {
  const dateFormatted = params.date.split("-").reverse().join("/");
  const text = `Olá, *${params.customerName}*!\n\nPassando para lembrar do seu agendamento em *${params.companyName}*! 🔔\n\n📌 *Serviço:* ${params.serviceName}\n📅 *Data:* ${dateFormatted}\n⏰ *Horário:* ${params.startTime}\n\nNos vemos em breve!`;

  await sendWhatsAppMessage({
    to: params.phone,
    messageText: text,
    templateName: "agendamento_lembrete",
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: params.customerName },
          { type: "text", text: params.companyName },
          { type: "text", text: params.serviceName },
          { type: "text", text: dateFormatted },
          { type: "text", text: params.startTime },
        ],
      },
    ],
  });
}

export async function sendBookingCancelledWhatsapp(params: {
  phone: string;
  customerName: string;
  companyName: string;
  date: string;
}): Promise<void> {
  const dateFormatted = params.date.split("-").reverse().join("/");
  const text = `Olá, *${params.customerName}*.\n\nSeu agendamento em *${params.companyName}* marcado para *${dateFormatted}* foi *CANCELADO*. ❌\n\nCaso queira reagendar um novo horário, acesse nosso link de agendamento online.`;

  await sendWhatsAppMessage({
    to: params.phone,
    messageText: text,
    templateName: "agendamento_cancelado",
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: params.customerName },
          { type: "text", text: params.companyName },
          { type: "text", text: dateFormatted },
        ],
      },
    ],
  });
}
