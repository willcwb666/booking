"use server";

import { db } from "@/lib/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { canAccessCompany } from "@/lib/admin-guard";
import { isValidWindow } from "@/lib/off-peak";
import { logAuditEvent } from "@/lib/audit-log";

/**
 * Janelas de desconto em horário ocioso.
 *
 * Só desconto. Não existe action para acréscimo no pico, e a ausência é
 * deliberada — ver a nota em `src/lib/off-peak.ts`.
 */

const TIME_RE = /^\d{2}:\d{2}$/;

const windowSchema = z.object({
  label: z.string().trim().min(2, "Dê um nome à janela").max(60, "Máximo 60 caracteres"),
  weekday: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(TIME_RE, "Horário inicial inválido"),
  endTime: z.string().regex(TIME_RE, "Horário final inválido"),
  discountPercentage: z.coerce
    .number()
    .min(1, "O desconto precisa ser de ao menos 1%")
    // Teto de 90%: cem por cento seria serviço grátis, que existe como
    // cortesia e não como janela recorrente — e um zero a mais no campo
    // zeraria a receita do horário sem ninguém perceber.
    .max(90, "Máximo de 90% de desconto"),
});

export type OffPeakInput = z.input<typeof windowSchema>;
type Result = { success: true } | { success: false; error: string };

export async function upsertOffPeakWindowAction(
  companySlug: string,
  input: OffPeakInput,
  windowId?: string
): Promise<Result> {
  const access = await canAccessCompany(companySlug);
  if (!access.ok) return { success: false, error: access.error };

  const parsed = windowSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  // A mesma validação que o cálculo usa. Sem isso daria para gravar uma janela
  // que a tela mostra e o motor de preço ignora em silêncio — o pior estado
  // possível para algo que o dono anuncia ao cliente.
  if (!isValidWindow(parsed.data)) {
    return { success: false, error: "O horário final precisa ser depois do inicial." };
  }

  const data = {
    label: parsed.data.label,
    weekday: parsed.data.weekday,
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime,
    discountPercentage: parsed.data.discountPercentage,
  };

  if (windowId) {
    // `updateMany` com companyId: um id de outra empresa atualiza zero linhas
    // em vez de escrever no tenant errado.
    const updated = await db.offPeakWindow.updateMany({
      where: { id: windowId, companyId: access.companyId },
      data,
    });
    if (updated.count === 0) {
      return { success: false, error: "Janela não encontrada nesta empresa" };
    }
  } else {
    await db.offPeakWindow.create({
      data: { ...data, companyId: access.companyId },
    });
  }

  await logAuditEvent({
    companyId: access.companyId,
    action: windowId ? "OFF_PEAK_WINDOW_UPDATED" : "OFF_PEAK_WINDOW_CREATED",
    entity: "OffPeakWindow",
    details: { windowId: windowId ?? null, ...data },
  });

  revalidatePath(`/${companySlug}/horarios-ociosos`);
  return { success: true };
}

export async function setOffPeakWindowActiveAction(
  companySlug: string,
  windowId: string,
  isActive: boolean
): Promise<Result> {
  const access = await canAccessCompany(companySlug);
  if (!access.ok) return { success: false, error: access.error };

  const updated = await db.offPeakWindow.updateMany({
    where: { id: windowId, companyId: access.companyId },
    data: { isActive },
  });
  if (updated.count === 0) {
    return { success: false, error: "Janela não encontrada nesta empresa" };
  }

  revalidatePath(`/${companySlug}/horarios-ociosos`);
  return { success: true };
}

export async function deleteOffPeakWindowAction(
  companySlug: string,
  windowId: string
): Promise<Result> {
  const access = await canAccessCompany(companySlug);
  if (!access.ok) return { success: false, error: access.error };

  const deleted = await db.offPeakWindow.deleteMany({
    where: { id: windowId, companyId: access.companyId },
  });
  if (deleted.count === 0) {
    return { success: false, error: "Janela não encontrada nesta empresa" };
  }

  await logAuditEvent({
    companyId: access.companyId,
    action: "OFF_PEAK_WINDOW_DELETED",
    entity: "OffPeakWindow",
    details: { windowId },
  });

  revalidatePath(`/${companySlug}/horarios-ociosos`);
  return { success: true };
}
