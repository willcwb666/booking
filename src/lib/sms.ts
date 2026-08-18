import "server-only";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;
const SMS_API_URL = process.env.SMS_API_URL; // Ex: gateway HTTP gratuito ou endpoint próprio
const SMS_API_KEY = process.env.SMS_API_KEY;

/**
 * Normaliza o número de telefone para o padrão internacional E.164.
 * - Se já possui DDI (+1, +55, etc.), apenas remove caracteres não numéricos e preserva o +.
 * - Se tem 10 ou 11 dígitos e começa com padrão US (ex: área 720, 303 no Colorado ou 10 dígitos), adiciona +1.
 * - Se tem 10 ou 11 dígitos e parece brasileiro (DDIs 11-99), adiciona +55 caso não especificado.
 */
export function formatPhoneE164(phone: string, defaultCountry = "US"): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) {
    const digits = trimmed.replace(/\D/g, "");
    return `+${digits}`;
  }

  const digits = trimmed.replace(/\D/g, "");

  if (defaultCountry === "US" || defaultCountry === "en") {
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    if (digits.length === 11 && digits.startsWith("1")) {
      return `+${digits}`;
    }
  }

  // Fallback padrão BR
  if (digits.startsWith("55")) {
    return `+${digits}`;
  }
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }

  return `+${digits}`;
}

/**
 * Envia um SMS através do provider configurado.
 * Ordem de prioridade:
 * 1. Gateway HTTP gratuito / local (caso `SMS_API_URL` esteja configurado)
 * 2. Twilio REST API oficial (utilizando créditos gratuitos ou conta padrão)
 * 3. Dev Mock no console para testes locais sem custo
 */
export async function sendSmsMessage({
  to,
  message,
  defaultCountry = "US",
}: {
  to: string;
  message: string;
  defaultCountry?: string;
}): Promise<void> {
  const formattedPhone = formatPhoneE164(to, defaultCountry);

  // 1. Gateway HTTP Gratuito / Custom Webhook (Evolution API, SMS Gateway app Android, etc.)
  if (SMS_API_URL) {
    try {
      const res = await fetch(SMS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SMS_API_KEY ? { Authorization: `Bearer ${SMS_API_KEY}`, apikey: SMS_API_KEY } : {}),
        },
        body: JSON.stringify({
          to: formattedPhone,
          phone: formattedPhone,
          message,
          text: message,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("[sms-gateway] Falha ao enviar via SMS Gateway:", err);
      } else {
        console.log(`[sms-gateway] SMS enviado com sucesso para ${formattedPhone}`);
      }
      return;
    } catch (err) {
      console.error("[sms-gateway] Erro ao conectar com SMS Gateway:", err);
      return;
    }
  }

  // 2. Twilio REST API Oficial
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && (TWILIO_FROM_NUMBER || TWILIO_MESSAGING_SERVICE_SID)) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
      const basicAuth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");

      const params = new URLSearchParams();
      params.append("To", formattedPhone);
      params.append("Body", message);

      if (TWILIO_MESSAGING_SERVICE_SID) {
        params.append("MessagingServiceSid", TWILIO_MESSAGING_SERVICE_SID);
      } else if (TWILIO_FROM_NUMBER) {
        params.append("From", TWILIO_FROM_NUMBER);
      }

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("[twilio-sms] Falha no envio Twilio:", err);
      } else {
        console.log(`[twilio-sms] SMS enviado via Twilio para ${formattedPhone}`);
      }
      return;
    } catch (err) {
      console.error("[twilio-sms] Erro de conexão com a Twilio:", err);
      return;
    }
  }

  // 3. Dev Mock Gratuito para Desenvolvimento Local
  console.log(`\n================== [SMS DEV MOCK] ==================`);
  console.log(`📱 Destinatário: ${formattedPhone}`);
  console.log(`💬 Mensagem: \n"${message}"`);
  console.log(`💡 Para disparo real: configure TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN ou SMS_API_URL no .env`);
  console.log(`====================================================\n`);
}

/* =========================================================================
   TEMPLATES DE NOTIFICAÇÃO POR SMS (SUPORTE EN / PT)
   ========================================================================= */

type BookingSmsParams = {
  phone: string;
  customerName: string;
  companyName: string;
  serviceName: string;
  date: string;
  startTime: string;
  locale?: string;
};

export async function sendBookingConfirmedSms({
  phone,
  customerName,
  companyName,
  serviceName,
  date,
  startTime,
  locale = "en-US",
}: BookingSmsParams): Promise<void> {
  const isEn = locale.startsWith("en");

  const message = isEn
    ? `[${companyName}] Hi ${customerName}, your appointment for ${serviceName} is confirmed for ${date} at ${startTime}. Reply HELP for info or STOP to cancel.`
    : `[${companyName}] Olá ${customerName}, seu agendamento de ${serviceName} está confirmado para ${date} às ${startTime}. Dúvidas ou alterações, entre em contato conosco.`;

  await sendSmsMessage({
    to: phone,
    message,
    defaultCountry: isEn ? "US" : "BR",
  });
}

export async function sendBookingReminderSms({
  phone,
  customerName,
  companyName,
  serviceName,
  date,
  startTime,
  locale = "en-US",
}: BookingSmsParams): Promise<void> {
  const isEn = locale.startsWith("en");

  const message = isEn
    ? `[${companyName}] Reminder: You have an appointment tomorrow at ${startTime} for ${serviceName}. See you soon! Reply STOP to opt out.`
    : `[${companyName}] Lembrete: Você tem um agendamento amanhã às ${startTime} (${serviceName}). Até breve!`;

  await sendSmsMessage({
    to: phone,
    message,
    defaultCountry: isEn ? "US" : "BR",
  });
}

export async function sendBookingCancelledSms({
  phone,
  customerName,
  companyName,
  date,
  startTime,
  locale = "en-US",
}: Omit<BookingSmsParams, "serviceName">): Promise<void> {
  const isEn = locale.startsWith("en");

  const message = isEn
    ? `[${companyName}] Hi ${customerName}, your appointment on ${date} at ${startTime} has been cancelled. Reply STOP to opt out.`
    : `[${companyName}] Olá ${customerName}, seu agendamento para ${date} às ${startTime} foi cancelado.`;

  await sendSmsMessage({
    to: phone,
    message,
    defaultCountry: isEn ? "US" : "BR",
  });
}
