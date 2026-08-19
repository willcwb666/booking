import "server-only";
import { db } from "@/lib/db";
import { sendWaitlistNotificationEmail } from "@/lib/email";

/**
 * Avisa a fila de espera quando abre vaga numa data.
 *
 * Vive aqui, e nao em `server/actions`, de proposito: em arquivo
 * `"use server"` todo export vira endpoint publico, e esta funcao dispara
 * e-mail e marca entradas como NOTIFIED a partir de parametros livres. So o
 * fluxo interno de cancelamento de agendamento deve aciona-la.
 */
export async function notifyWaitlistForDate(
  agendaId: string,
  date: string,
  companyId: string
): Promise<void> {
  // Called when a booking is cancelled — notify waiting customers
  const entries = await db.waitlistEntry.findMany({
    where: { agendaId, preferredDate: date, status: "WAITING" },
    take: 3, // notify first 3
  });

  if (entries.length === 0) return;

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { name: true, locale: true },
  });

  await Promise.allSettled(
    entries.map(async (entry) => {
      await sendWaitlistNotificationEmail({
        to: entry.customerEmail,
        customerName: entry.customerName,
        companyName: company?.name ?? "empresa",
        date: entry.preferredDate,
        locale: company?.locale ?? "pt-BR",
      });

      await db.waitlistEntry.update({
        where: { id: entry.id },
        data: { status: "NOTIFIED", notifiedAt: new Date() },
      });
    })
  );
}
