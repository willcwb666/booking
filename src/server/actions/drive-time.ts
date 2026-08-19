"use server";

import { db } from "@/lib/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { canAccessCompany } from "@/lib/admin-guard";
import { logAuditEvent } from "@/lib/audit-log";
import { refreshTravelBlocks } from "@/lib/geo/travel-blocks";

/**
 * Configuração do buffer de deslocamento.
 *
 * Três campos só. A tentação aqui é pedir velocidade média, horário de pico,
 * tempo de estacionamento e margem de segurança — e cada campo a mais é uma
 * chance a mais de o dono desistir na metade e o recurso ficar meio
 * configurado, que é pior que desligado.
 */

const settingsSchema = z.object({
  enabled: z.boolean(),
  minutesPerKm: z.coerce
    .number()
    // Zero desligaria o cálculo por um caminho diferente do botão de ligar, e
    // duas formas de desligar a mesma coisa é como se descobre um recurso
    // "quebrado" que na verdade está zerado.
    .min(0.5, "Mínimo de 0,5 minuto por quilômetro")
    // 30 min/km em linha reta é 2 km/h — mais lento que caminhar. Passar disso
    // é erro de digitação, e um erro de digitação aqui apaga a agenda.
    .max(30, "Máximo de 30 minutos por quilômetro"),
  maxMinutes: z.coerce
    .number()
    .int()
    .min(5, "O teto precisa ser de ao menos 5 minutos")
    .max(480, "Máximo de 8 horas"),
});

export type DriveTimeInput = z.input<typeof settingsSchema>;
type Result = { success: true } | { success: false; error: string };

export async function saveDriveTimeSettingsAction(
  companySlug: string,
  input: DriveTimeInput
): Promise<Result> {
  const access = await canAccessCompany(companySlug);
  if (!access.ok) return { success: false, error: access.error };

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  await db.company.update({
    where: { id: access.companyId },
    data: {
      driveTimeEnabled: parsed.data.enabled,
      driveTimeMinutesPerKm: parsed.data.minutesPerKm,
      driveTimeMaxMinutes: parsed.data.maxMinutes,
    },
  });

  /**
   * Recalcula de hoje em diante.
   *
   * Sem isto, mudar o minutos-por-km só teria efeito nos agendamentos futuros,
   * e o dono veria os blocos antigos com os números velhos ao lado dos novos
   * com os novos — o estado em que ninguém confia na tela. Desligar o recurso
   * também precisa passar por aqui: é o que limpa os bloqueios que ele deixou.
   *
   * O passado fica como está. Bloco de deslocamento de um dia que já
   * aconteceu não protege horário nenhum, e reescrever histórico para nada
   * custaria um percurso completo da agenda a cada salvamento.
   */
  const today = new Date().toISOString().split("T")[0];
  const upcoming = await db.booking.findMany({
    where: {
      companyId: access.companyId,
      scheduledDate: { gte: today },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      professionalId: { not: null },
    },
    select: { professionalId: true, scheduledDate: true },
    distinct: ["professionalId", "scheduledDate"],
  });

  for (const day of upcoming) {
    try {
      await refreshTravelBlocks(access.companyId, day.professionalId, day.scheduledDate);
    } catch (err) {
      console.error("[drive-time] falha ao recalcular", day, err);
    }
  }

  await logAuditEvent({
    companyId: access.companyId,
    action: parsed.data.enabled ? "DRIVE_TIME_ENABLED" : "DRIVE_TIME_DISABLED",
    entity: "Company",
    details: {
      minutesPerKm: parsed.data.minutesPerKm,
      maxMinutes: parsed.data.maxMinutes,
      recalculatedDays: upcoming.length,
    },
  });

  revalidatePath(`/${companySlug}/tempo-de-deslocamento`);
  revalidatePath(`/${companySlug}/schedule`);
  return { success: true };
}
