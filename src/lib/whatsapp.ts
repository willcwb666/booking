import "server-only";

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const API_VERSION = "v18.0";

function formatPhone(phone: string): string {
  // Números com "+" já trazem o DDI (qualquer país) — só remove a formatação.
  // Sem "+", assume legado brasileiro e prefixa 55.
  const hasCountryCode = phone.trim().startsWith("+");
  const digits = phone.replace(/\D/g, "");
  if (hasCountryCode) return digits;
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

async function sendTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  components: object[]
): Promise<void> {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.warn("[whatsapp] WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN not set — skipping");
    return;
  }

  const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to: formatPhone(to),
    type: "template",
    template: { name: templateName, language: { code: languageCode }, components },
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
    console.error(`[whatsapp] Failed to send template ${templateName}:`, err);
  }
}

export async function sendBookingConfirmedWhatsapp(params: {
  phone: string;
  customerName: string;
  companyName: string;
  serviceName: string;
  date: string;
  startTime: string;
}): Promise<void> {
  // Template: agendamento_confirmado
  // Variables: {{1}} = nome, {{2}} = empresa, {{3}} = serviço, {{4}} = data, {{5}} = hora
  await sendTemplate(params.phone, "agendamento_confirmado", "pt_BR", [
    {
      type: "body",
      parameters: [
        { type: "text", text: params.customerName },
        { type: "text", text: params.companyName },
        { type: "text", text: params.serviceName },
        { type: "text", text: params.date.split("-").reverse().join("/") },
        { type: "text", text: params.startTime },
      ],
    },
  ]);
}

export async function sendBookingReminderWhatsapp(params: {
  phone: string;
  customerName: string;
  companyName: string;
  serviceName: string;
  date: string;
  startTime: string;
}): Promise<void> {
  // Template: agendamento_lembrete
  await sendTemplate(params.phone, "agendamento_lembrete", "pt_BR", [
    {
      type: "body",
      parameters: [
        { type: "text", text: params.customerName },
        { type: "text", text: params.companyName },
        { type: "text", text: params.serviceName },
        { type: "text", text: params.date.split("-").reverse().join("/") },
        { type: "text", text: params.startTime },
      ],
    },
  ]);
}

export async function sendBookingCancelledWhatsapp(params: {
  phone: string;
  customerName: string;
  companyName: string;
  date: string;
}): Promise<void> {
  // Template: agendamento_cancelado
  await sendTemplate(params.phone, "agendamento_cancelado", "pt_BR", [
    {
      type: "body",
      parameters: [
        { type: "text", text: params.customerName },
        { type: "text", text: params.companyName },
        { type: "text", text: params.date.split("-").reverse().join("/") },
      ],
    },
  ]);
}
