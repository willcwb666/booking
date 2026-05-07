import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "Agendei <noreply@agendei.app>";

type BookingEmailData = {
  to: string;
  customerName: string;
  companyName: string;
  serviceName: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string;
  address: string;
};

function formatDate(date: string) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

export async function sendBookingConfirmationEmail(data: BookingEmailData) {
  try {
    await resend.emails.send({
      from: FROM,
      to: data.to,
      subject: `✅ Agendamento confirmado — ${data.companyName}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <h2 style="color:#1d4ed8;margin-bottom:4px">Agendamento confirmado!</h2>
          <p style="color:#6b7280;margin-top:0">Olá, ${data.customerName}!</p>

          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:20px;margin:24px 0">
            <p style="margin:0 0 8px 0"><strong>Serviço:</strong> ${data.serviceName}</p>
            <p style="margin:0 0 8px 0"><strong>Empresa:</strong> ${data.companyName}</p>
            <p style="margin:0 0 8px 0"><strong>Data:</strong> ${formatDate(data.date)}</p>
            <p style="margin:0 0 8px 0"><strong>Horário:</strong> ${data.startTime} – ${data.endTime}</p>
            <p style="margin:0"><strong>Endereço:</strong> ${data.address}</p>
          </div>

          <p style="color:#374151">Você receberá um lembrete no dia anterior. Em caso de dúvidas, entre em contato com a empresa.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Agendei · Agendamentos online</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] confirmation failed:", err);
  }
}

export async function sendBookingReminderEmail(data: BookingEmailData) {
  try {
    await resend.emails.send({
      from: FROM,
      to: data.to,
      subject: `🔔 Lembrete: ${data.serviceName} amanhã — ${data.companyName}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <h2 style="color:#d97706;margin-bottom:4px">Lembrete de agendamento</h2>
          <p style="color:#6b7280;margin-top:0">Olá, ${data.customerName}! Só um lembrete:</p>

          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:20px;margin:24px 0">
            <p style="margin:0 0 8px 0"><strong>Serviço:</strong> ${data.serviceName}</p>
            <p style="margin:0 0 8px 0"><strong>Empresa:</strong> ${data.companyName}</p>
            <p style="margin:0 0 8px 0"><strong>Data:</strong> ${formatDate(data.date)} <strong>amanhã</strong></p>
            <p style="margin:0 0 8px 0"><strong>Horário:</strong> ${data.startTime} – ${data.endTime}</p>
            <p style="margin:0"><strong>Endereço:</strong> ${data.address}</p>
          </div>

          <p style="color:#374151">Esteja pronto! Em caso de imprevisto, cancele com antecedência.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Agendei · Agendamentos online</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] reminder failed:", err);
  }
}

export async function sendBookingCancelledEmail({
  to,
  customerName,
  companyName,
  date,
  startTime,
}: Pick<BookingEmailData, "to" | "customerName" | "companyName" | "date" | "startTime">) {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `❌ Agendamento cancelado — ${companyName}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <h2 style="color:#dc2626;margin-bottom:4px">Agendamento cancelado</h2>
          <p style="color:#6b7280;margin-top:0">Olá, ${customerName}.</p>
          <p style="color:#374151">
            Seu agendamento em <strong>${companyName}</strong> no dia
            <strong>${formatDate(date)}</strong> às <strong>${startTime}</strong> foi cancelado.
          </p>
          <p style="color:#374151">Se precisar reagendar, acesse o app ou o link de agendamento.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Agendei · Agendamentos online</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] cancellation failed:", err);
  }
}
