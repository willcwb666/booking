import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "Kreator <noreply@kreator.com.br>";

/** Escapes user-controlled values interpolated into email HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendVerificationEmail({
  to,
  userName,
  url,
}: {
  to: string;
  userName: string;
  url: string;
}) {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Confirme seu e-mail — Kreator",
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <h2 style="color:#1d4ed8;margin-bottom:4px">Confirme seu e-mail</h2>
          <p style="color:#6b7280;margin-top:0">Olá, ${escapeHtml(userName)}!</p>
          <p style="color:#374151">
            Clique no botão abaixo para confirmar que este e-mail é seu.
            Isso libera todas as funcionalidades da sua conta.
          </p>
          <p style="margin:24px 0">
            <a href="${url}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
              Confirmar e-mail
            </a>
          </p>
          <p style="color:#9ca3af;font-size:12px">Se você não criou uma conta no Kreator, ignore este e-mail.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Kreator · Agendamentos online</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] verification failed:", err);
  }
}

export async function sendPasswordResetEmail({
  to,
  userName,
  url,
}: {
  to: string;
  userName: string;
  url: string;
}) {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Redefinir sua senha — Kreator",
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <h2 style="color:#1d4ed8;margin-bottom:4px">Redefinir sua senha</h2>
          <p style="color:#6b7280;margin-top:0">Olá, ${escapeHtml(userName)}.</p>
          <p style="color:#374151">
            Recebemos um pedido para redefinir a senha da sua conta.
            O link abaixo vale por 1 hora e só pode ser usado uma vez.
          </p>
          <p style="margin:24px 0">
            <a href="${url}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
              Criar nova senha
            </a>
          </p>
          <p style="color:#9ca3af;font-size:12px">
            Se você não pediu isso, ignore este e-mail — sua senha atual continua valendo.
          </p>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Kreator · Agendamentos online</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] password reset failed:", err);
  }
}

/**
 * Código de verificação em duas etapas.
 *
 * Diferente dos demais e-mails do sistema, uma falha aqui trava o login de
 * alguém — mas ainda assim não relança: quem chama é o plugin de auth, e uma
 * exceção ali vira erro de login sem explicação. O usuário tem TOTP e códigos
 * de recuperação como caminhos alternativos.
 */
export async function sendTwoFactorOtpEmail({
  to,
  userName,
  code,
}: {
  to: string;
  userName: string;
  code: string;
}) {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `${code} é o seu código de acesso — Kreator`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <h2 style="color:#1d4ed8;margin-bottom:4px">Código de verificação</h2>
          <p style="color:#6b7280;margin-top:0">Olá, ${escapeHtml(userName)}.</p>
          <p style="color:#374151">
            Use o código abaixo para concluir seu login. Ele vale por poucos
            minutos e só pode ser usado uma vez.
          </p>
          <p style="margin:24px 0">
            <span style="display:inline-block;background:#f3f4f6;color:#111827;padding:16px 28px;border-radius:8px;font-size:28px;font-weight:bold;letter-spacing:6px;font-family:monospace">
              ${escapeHtml(code)}
            </span>
          </p>
          <p style="color:#9ca3af;font-size:12px">
            Se não foi você que tentou entrar, alguém tem a sua senha.
            Troque-a agora — o código sozinho não dá acesso a nada.
          </p>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Kreator · Agendamentos online</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] 2fa otp failed:", err);
  }
}

/**
 * Aviso de que alguém pediu a remoção da verificação em duas etapas da conta.
 *
 * Este e-mail é o freio inteiro da funcionalidade: é ele que transforma um
 * reset silencioso em algo que o dono tem 24 horas para barrar. Por isso o
 * texto assume que o destinatário pode ser a vítima, e não o solicitante.
 */
export async function sendTwoFactorResetNoticeEmail({
  to,
  userName,
  reason,
  executeAfter,
}: {
  to: string;
  userName: string;
  reason: string;
  executeAfter: Date;
}) {
  const when = executeAfter.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Pediram para remover a verificação em duas etapas da sua conta",
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <h2 style="color:#b45309;margin-bottom:4px">Pedido de remoção da verificação em duas etapas</h2>
          <p style="color:#6b7280;margin-top:0">Olá, ${escapeHtml(userName)}.</p>
          <p style="color:#374151">
            Um administrador da plataforma pediu para remover a verificação em
            duas etapas da sua conta. O motivo informado foi:
          </p>
          <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #d1d5db;color:#374151;background:#f9fafb">
            ${escapeHtml(reason)}
          </blockquote>
          <p style="color:#374151">
            <strong>Nada acontece antes de ${escapeHtml(when)}.</strong>
            Se foi você que pediu, não precisa fazer nada.
          </p>
          <p style="color:#b45309;font-weight:bold">
            Se não foi você, entre na sua conta e cancele o pedido em
            Perfil → Segurança. Enquanto você conseguir entrar, o reset não
            deveria acontecer.
          </p>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Kreator · Agendamentos online</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] 2fa reset notice failed:", err);
  }
}

type BookingEmailData = {
  to: string;
  customerName: string;
  companyName: string;
  serviceName: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string;
  address: string;
  locale?: string; // e.g. "pt-BR", "en-US" — defaults to "pt-BR"
};

function formatDate(date: string, locale = "pt-BR") {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
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
          <p style="color:#6b7280;margin-top:0">Olá, ${escapeHtml(data.customerName)}!</p>

          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:20px;margin:24px 0">
            <p style="margin:0 0 8px 0"><strong>Serviço:</strong> ${escapeHtml(data.serviceName)}</p>
            <p style="margin:0 0 8px 0"><strong>Empresa:</strong> ${escapeHtml(data.companyName)}</p>
            <p style="margin:0 0 8px 0"><strong>Data:</strong> ${formatDate(data.date, data.locale)}</p>
            <p style="margin:0 0 8px 0"><strong>Horário:</strong> ${data.startTime} – ${data.endTime}</p>
            <p style="margin:0"><strong>Endereço:</strong> ${escapeHtml(data.address)}</p>
          </div>

          <p style="color:#374151">Você receberá um lembrete no dia anterior. Em caso de dúvidas, entre em contato com a empresa.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Kreator · Agendamentos online</p>
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
          <p style="color:#6b7280;margin-top:0">Olá, ${escapeHtml(data.customerName)}! Só um lembrete:</p>

          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:20px;margin:24px 0">
            <p style="margin:0 0 8px 0"><strong>Serviço:</strong> ${escapeHtml(data.serviceName)}</p>
            <p style="margin:0 0 8px 0"><strong>Empresa:</strong> ${escapeHtml(data.companyName)}</p>
            <p style="margin:0 0 8px 0"><strong>Data:</strong> ${formatDate(data.date, data.locale)} <strong>amanhã</strong></p>
            <p style="margin:0 0 8px 0"><strong>Horário:</strong> ${data.startTime} – ${data.endTime}</p>
            <p style="margin:0"><strong>Endereço:</strong> ${escapeHtml(data.address)}</p>
          </div>

          <p style="color:#374151">Esteja pronto! Em caso de imprevisto, cancele com antecedência.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Kreator · Agendamentos online</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] reminder failed:", err);
  }
}

export async function sendWaitlistNotificationEmail({
  to,
  customerName,
  companyName,
  date,
  locale,
}: Pick<BookingEmailData, "to" | "customerName" | "companyName" | "date" | "locale">) {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Vaga disponível — ${companyName}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <h2 style="color:#2563eb;margin-bottom:4px">Vaga disponível!</h2>
          <p style="color:#6b7280;margin-top:0">Olá, ${escapeHtml(customerName)}!</p>
          <p style="color:#374151">
            Uma vaga abriu em <strong>${escapeHtml(companyName)}</strong> no dia
            <strong>${formatDate(date, locale)}</strong>.
          </p>
          <p style="color:#374151">Acesse o link de agendamento para reservar o horário antes que outra pessoa pegue!</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Kreator · Agendamentos online</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] waitlist notification failed:", err);
  }
}

type PromoItem = {
  serviceName: string;
  originalPrice: string; // já formatado (ex.: "R$ 120,00")
  promoPrice: string;
  endDate: string; // "YYYY-MM-DD"
};

type PromotionEmailData = {
  to: string;
  customerName: string;
  companyName: string;
  companySlug: string;
  companyLogoUrl: string | null;
  title: string; // título criado pelo gestor
  description: string; // texto criado pelo gestor
  items: PromoItem[];
  validUntil: string; // "YYYY-MM-DD" — maior endDate entre as promoções
  locale?: string;
};

/**
 * E-mail de promoções: logo à esquerda no cabeçalho, título centralizado,
 * texto do gestor, lista de serviços em promoção e validade no rodapé.
 */
export async function sendPromotionEmail(data: PromotionEmailData) {
  const appUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

  const itemsHtml = data.items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #d1fae5">
            <p style="margin:0;font-size:15px;font-weight:bold;color:#111827">${escapeHtml(item.serviceName)}</p>
            <p style="margin:4px 0 0 0">
              <s style="color:#9ca3af;font-size:13px">${escapeHtml(item.originalPrice)}</s>
              <strong style="color:#059669;font-size:16px;margin-left:8px">${escapeHtml(item.promoPrice)}</strong>
            </p>
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid #d1fae5;text-align:right;vertical-align:middle">
            <span style="color:#6b7280;font-size:12px;white-space:nowrap">até ${formatDate(item.endDate, data.locale)}</span>
          </td>
        </tr>`
    )
    .join("");

  await resend.emails.send({
    from: FROM,
    to: data.to,
    subject: `🏷️ ${data.title} — ${data.companyName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <!-- Cabeçalho: logo à esquerda -->
        <table role="presentation" width="100%" style="border-bottom:1px solid #e5e7eb;padding-bottom:16px;margin-bottom:24px">
          <tr>
            ${
              data.companyLogoUrl
                ? `<td width="56" style="vertical-align:middle"><img src="${data.companyLogoUrl}" alt="" width="48" height="48" style="border-radius:10px;display:block;object-fit:cover" /></td>`
                : ""
            }
            <td style="vertical-align:middle">
              <p style="margin:0;font-size:16px;font-weight:bold;color:#111827">${escapeHtml(data.companyName)}</p>
            </td>
          </tr>
        </table>

        <!-- Título centralizado -->
        <h1 style="text-align:center;color:#059669;font-size:22px;margin:0 0 16px 0">${escapeHtml(data.title)}</h1>

        <!-- Texto do gestor -->
        <p style="color:#374151;margin:0 0 8px 0">Olá, ${escapeHtml(data.customerName)}!</p>
        <p style="color:#374151;margin:0 0 24px 0;white-space:pre-line">${escapeHtml(data.description)}</p>

        <!-- Serviços em promoção -->
        <table role="presentation" width="100%" style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;border-collapse:separate;overflow:hidden;margin-bottom:24px">
          ${itemsHtml}
        </table>

        <p style="margin:0 0 24px 0;text-align:center">
          <a href="${appUrl}/${encodeURIComponent(data.companySlug)}" style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
            Aproveitar ofertas
          </a>
        </p>

        <!-- Validade no fim -->
        <p style="text-align:center;color:#6b7280;font-size:13px;margin:0 0 24px 0">
          Promoções válidas até <strong>${formatDate(data.validUntil, data.locale)}</strong>.
        </p>

        <p style="color:#9ca3af;font-size:12px">
          Você recebeu este e-mail porque aceitou receber ofertas.
          Para não receber mais, desative "Ofertas e promoções" nas preferências do seu perfil.
        </p>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px">Kreator · Agendamentos online</p>
      </div>
    `,
  });
}

export async function sendBookingCancelledEmail({
  to,
  customerName,
  companyName,
  date,
  startTime,
  locale,
}: Pick<BookingEmailData, "to" | "customerName" | "companyName" | "date" | "startTime" | "locale">) {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `❌ Agendamento cancelado — ${companyName}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <h2 style="color:#dc2626;margin-bottom:4px">Agendamento cancelado</h2>
          <p style="color:#6b7280;margin-top:0">Olá, ${escapeHtml(customerName)}.</p>
          <p style="color:#374151">
            Seu agendamento em <strong>${escapeHtml(companyName)}</strong> no dia
            <strong>${formatDate(date, locale)}</strong> às <strong>${startTime}</strong> foi cancelado.
          </p>
          <p style="color:#374151">Se precisar reagendar, acesse o app ou o link de agendamento.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Kreator · Agendamentos online</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] cancellation failed:", err);
  }
}

export type CompletedInvoiceEmailData = {
  to: string;
  customerName: string;
  companyName: string;
  companyPhone?: string | null;
  serviceName: string;
  bookingId: string;
  date: string;
  startTime: string;
  endTime: string;
  address: string;
  currency: string;
  basePrice: number;
  additionalItems: Array<{ description: string; amount: number }>;
  discountAmount: number;
  finalTotal: number;
  locale?: string;
};

export async function sendBookingCompletedInvoiceEmail(data: CompletedInvoiceEmailData) {
  const appUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const receiptUrl = `${appUrl}/receipt/${data.bookingId}`;

  const additionalsHtml = data.additionalItems.length > 0
    ? data.additionalItems.map(
        (item) => `
          <tr>
            <td style="padding:8px 0;color:#374151;font-size:14px">+ ${escapeHtml(item.description)}</td>
            <td style="padding:8px 0;text-align:right;color:#059669;font-weight:bold;font-size:14px">+ ${data.currency} ${item.amount.toFixed(2)}</td>
          </tr>`
      ).join("")
    : "";

  const discountHtml = data.discountAmount > 0
    ? `
      <tr>
        <td style="padding:8px 0;color:#dc2626;font-size:14px">- Desconto Aplicado</td>
        <td style="padding:8px 0;text-align:right;color:#dc2626;font-weight:bold;font-size:14px">- ${data.currency} ${data.discountAmount.toFixed(2)}</td>
      </tr>`
    : "";

  try {
    await resend.emails.send({
      from: FROM,
      to: data.to,
      subject: `🧾 Comprovante de Atendimento Concluído — ${data.companyName}`,
      html: `
        <div style="font-family:sans-serif;max-width:580px;margin:0 auto;padding:24px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px">
          <!-- Logo & Header -->
          <div style="border-bottom:2px solid #f3f4f6;padding-bottom:16px;margin-bottom:20px flex items-center justify-between">
            <h2 style="color:#111827;margin:0;font-size:20px font-weight:bold">COMPROVANTE DE SERVIÇO</h2>
            <p style="color:#6b7280;font-size:13px;margin:4px 0 0 0">${escapeHtml(data.companyName)} · Agendamento #${escapeHtml(data.bookingId.slice(-8))}</p>
          </div>

          <p style="color:#374151;font-size:15px">Olá, <strong>${escapeHtml(data.customerName)}</strong>!</p>
          <p style="color:#4b5563;font-size:14px;line-height:1.5;margin-top:0">
            Seu atendimento foi concluído com sucesso. Abaixo está o discriminativo detalhado dos serviços prestados e do acerto final:
          </p>

          <!-- Tabela do Recibo -->
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:20px 0">
            <table role="presentation" width="100%" style="border-collapse:collapse">
              <thead>
                <tr style="border-bottom:1px solid #e5e7eb text-align:left">
                  <th style="padding-bottom:8px;color:#6b7280;font-size:12px;text-transform:uppercase">Descrição do Serviço</th>
                  <th style="padding-bottom:8px;text-align:right;color:#6b7280;font-size:12px;text-transform:uppercase">Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding:10px 0;color:#111827;font-weight:bold;font-size:14px">${escapeHtml(data.serviceName)} (Base)</td>
                  <td style="padding:10px 0;text-align:right;color:#111827;font-weight:bold;font-size:14px">${data.currency} ${data.basePrice.toFixed(2)}</td>
                </tr>
                ${additionalsHtml}
                ${discountHtml}
              </tbody>
            </table>

            <div style="border-top:2px dashed #d1d5db;margin-top:16px;padding-top:16px;display:flex;justify-content:space-between">
              <table role="presentation" width="100%">
                <tr>
                  <td style="font-size:16px;font-weight:bold;color:#111827">TOTAL FINAL PAGO:</td>
                  <td style="text-align:right;font-size:18px;font-weight:extrabold;color:#059669">${data.currency} ${data.finalTotal.toFixed(2)}</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- Informações de Data e Local -->
          <div style="color:#6b7280;font-size:13px;line-height:1.6;margin-bottom:24px">
            <p style="margin:2px 0">📅 <strong>Data:</strong> ${formatDate(data.date, data.locale)} (${data.startTime} às ${data.endTime})</p>
            <p style="margin:2px 0">📍 <strong>Endereço:</strong> ${escapeHtml(data.address)}</p>
            ${data.companyPhone ? `<p style="margin:2px 0">📞 <strong>Contato da Empresa:</strong> ${escapeHtml(data.companyPhone)}</p>` : ""}
          </div>

          <!-- Botão de Download PDF / Visualização Digital -->
          <div style="text-align:center;margin:28px 0">
            <a href="${receiptUrl}" target="_blank" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px">
              📄 Baixar Comprovante em PDF / Imprimir
            </a>
          </div>

          <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:32px">
            Kreator · Plataforma Completa de Agendamentos e Serviços
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] invoice email failed:", err);
  }
}

export type PlatformBroadcastEmailData = {
  to: string;
  recipientName: string;
  companyName: string;
  title: string;
  description: string;
};

/**
 * Anúncio de novidades da plataforma para o responsável por uma empresa.
 *
 * Existe porque a tela de configurações do super admin oferecia um canal
 * "E-mail" marcado por padrão, registrava no log de auditoria que o e-mail
 * fora usado, e relatava "disparado com sucesso" — mas a action só criava a
 * notificação do sino. Nenhum e-mail saía.
 */
export async function sendPlatformBroadcastEmail(data: PlatformBroadcastEmailData) {
  const appUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

  return resend.emails.send({
    from: FROM,
    to: data.to,
    subject: data.title,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111827">
        <p style="margin:0 0 4px 0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280">
          Novidades da plataforma
        </p>
        <h1 style="margin:0 0 20px 0;font-size:22px;line-height:1.3;color:#111827">
          ${escapeHtml(data.title)}
        </h1>

        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#374151">
          Olá, ${escapeHtml(data.recipientName)}.
        </p>

        <div style="font-size:15px;line-height:1.6;color:#374151;white-space:pre-wrap;border-left:3px solid #e5e7eb;padding-left:16px;margin:0 0 24px 0">
${escapeHtml(data.description)}
        </div>

        <p style="margin:0 0 32px 0">
          <a href="${appUrl}"
             style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px;font-size:14px;font-weight:600">
            Abrir o painel
          </a>
        </p>

        <p style="color:#9ca3af;font-size:12px;margin:0">
          Enviado para a conta responsável por ${escapeHtml(data.companyName)}.
        </p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">Kreator · Agendamentos online</p>
      </div>
    `,
  });
}

/**
 * E-mail de resgate de cliente inativo.
 *
 * O texto é do dono, não do sistema: assunto, corpo e incentivo chegam prontos.
 * O template só dá a moldura e o botão de agendar. Gerar a mensagem
 * automaticamente produziria e-mail de robô para o cliente mais valioso da
 * empresa — o que já frequentava e parou.
 */
export async function sendWinBackEmail({
  to,
  customerName,
  companyName,
  companySlug,
  companyLogoUrl,
  subject,
  message,
  offer,
}: {
  to: string;
  customerName: string;
  companyName: string;
  companySlug: string;
  companyLogoUrl: string | null;
  subject: string;
  message: string;
  offer: string | null;
}) {
  const appUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const bookUrl = `${appUrl}/${companySlug}`;

  await resend.emails.send({
    from: FROM,
    to,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        ${
          companyLogoUrl
            ? `<img src="${escapeHtml(companyLogoUrl)}" alt="${escapeHtml(companyName)}" style="max-height:48px;margin-bottom:16px">`
            : `<h3 style="color:#111827;margin:0 0 16px 0">${escapeHtml(companyName)}</h3>`
        }
        <p style="color:#6b7280;margin-top:0">Olá, ${escapeHtml(customerName)}.</p>
        <div style="color:#374151;line-height:1.6;white-space:pre-line">${escapeHtml(message)}</div>
        ${
          offer
            ? `<p style="margin:20px 0;padding:14px 18px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;color:#065f46;font-weight:bold">${escapeHtml(offer)}</p>`
            : ""
        }
        <p style="margin:24px 0">
          <a href="${bookUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
            Agendar horário
          </a>
        </p>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px">
          Você recebeu este e-mail porque já foi atendido na ${escapeHtml(companyName)}.
        </p>
      </div>
    `,
  });
}
