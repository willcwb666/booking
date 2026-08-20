"use server";

import { db } from "@/lib/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { canAccessModule } from "@/lib/module-guard";
import { geocodeAddress } from "@/lib/geo/geocode";
import { logAuditEvent } from "@/lib/audit-log";
import { CHECKIN_MODULE } from "@/lib/checkin-geofence";

/**
 * Configuração da cerca de check-in.
 *
 * ─── Por que isto não existia ────────────────────────────────────────────────
 *
 * `Company.latitude`, `longitude` e `checkinRadiusMeters` estavam no schema e
 * eram lidos por `performSmartCheckinAction` — mas NENHUMA tela jamais os
 * gravava. Sem coordenadas, o código pulava a verificação em silêncio. O módulo
 * era vendido e a cerca nunca rodou em empresa nenhuma.
 *
 * ─── O que uma cerca de GPS é, e o que não é ─────────────────────────────────
 *
 * A posição vem do navegador do cliente, e navegador se falsifica. Isto é
 * atrito honesto contra o check-in feito do sofá, não prova de presença. Quem
 * quiser burlar, burla — e é por isso que o check-in confirma a chegada, não
 * libera pagamento nem desconto.
 */

type Result = { success: true } | { success: false; error: string };

const geofenceSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90).nullable(),
  longitude: z.coerce.number().min(-180).max(180).nullable(),
  radiusMeters: z.coerce
    .number()
    .int()
    // Abaixo de 50 m a própria imprecisão do GPS de celular reprova quem está
    // na porta — e o cliente reprovado liga para a recepção, que é exatamente
    // o trabalho que o recurso deveria eliminar.
    .min(50, "O raio mínimo é 50 metros — abaixo disso o erro do GPS reprova quem chegou")
    .max(5000, "O raio máximo é 5 km"),
});

export type GeofenceInput = z.input<typeof geofenceSchema>;

export async function saveCheckinGeofenceAction(
  companySlug: string,
  input: GeofenceInput
): Promise<Result> {
  const access = await canAccessModule(companySlug, CHECKIN_MODULE);
  if (!access.ok) return { success: false, error: access.error };

  const parsed = geofenceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  // Uma coordenada sem a outra não localiza nada. Ou as duas, ou nenhuma.
  const hasOne = parsed.data.latitude !== null || parsed.data.longitude !== null;
  const hasBoth = parsed.data.latitude !== null && parsed.data.longitude !== null;
  if (hasOne && !hasBoth) {
    return { success: false, error: "Informe latitude e longitude, ou deixe as duas em branco." };
  }

  await db.company.update({
    where: { id: access.companyId },
    data: {
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      checkinRadiusMeters: parsed.data.radiusMeters,
    },
  });

  /**
   * Ligar e desligar a cerca fica no log.
   *
   * Passar a exigir presença muda o que acontece com um cliente que chega e não
   * consegue confirmar; desligar remove uma verificação. As duas são decisões
   * que alguém vai querer rastrear depois de uma reclamação.
   */
  await logAuditEvent({
    companyId: access.companyId,
    action: hasBoth ? "CHECKIN_GEOFENCE_ENABLED" : "CHECKIN_GEOFENCE_DISABLED",
    entity: "Company",
    details: { radiusMeters: parsed.data.radiusMeters },
  });

  revalidatePath(`/${companySlug}/check-in`);
  return { success: true };
}

type LocateResult =
  | { success: true; latitude: number; longitude: number }
  | { success: false; error: string };

/**
 * Localiza a empresa pelo endereço já cadastrado.
 *
 * Digitar latitude e longitude à mão é pedir para o dono abrir um mapa, achar o
 * ponto, copiar dois números com seis casas decimais e não trocar a ordem. Ele
 * não vai fazer isso — e um recurso que depende de alguém não fazer isso fica
 * desligado para sempre, que é como este chegou até aqui.
 *
 * Devolve as coordenadas em vez de gravá-las: quem clicou vê o número, confere
 * no mapa e salva. Gravar direto tornaria um erro de geocodificação — o
 * centroide da cidade errada — uma cerca que reprova todo mundo sem ninguém
 * entender por quê.
 */
export async function locateCompanyByAddressAction(companySlug: string): Promise<LocateResult> {
  const access = await canAccessModule(companySlug, CHECKIN_MODULE);
  if (!access.ok) return { success: false, error: access.error };

  const company = await db.company.findUnique({
    where: { id: access.companyId },
    select: { address: true },
  });

  if (!company?.address || company.address.trim().length < 5) {
    return {
      success: false,
      error: "Cadastre o endereço da empresa em Configurações antes de localizar no mapa.",
    };
  }

  const coords = await geocodeAddress({ address: company.address });
  if (!coords) {
    return {
      success: false,
      error: "Não foi possível localizar este endereço. Confira o cadastro ou informe as coordenadas à mão.",
    };
  }

  return { success: true, latitude: coords.latitude, longitude: coords.longitude };
}
