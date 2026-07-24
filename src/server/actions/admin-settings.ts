"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type PlatformSettingsData = {
  presetResetFee: number;
  trialDays: number;
  gracePeriodDays: number;
  platformName: string;
  supportEmail: string;
  selfRegistrationEnabled: boolean;
  maintenanceEnabled: boolean;
  maintenanceStart: string;
  maintenanceEnd: string;
  maintenanceImpact: "SLOW" | "UNAVAILABLE";
  maintenanceMessage: string;
};

export async function getPlatformSettingsAction(): Promise<{
  success: boolean;
  settings: PlatformSettingsData;
  presetResetFee: number;
}> {
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "system_setting" (
        "key" TEXT PRIMARY KEY,
        "value" TEXT NOT NULL,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    const rows = await db.$queryRawUnsafe<Array<{ key: string; value: string }>>(
      `SELECT * FROM "system_setting"`
    );

    const kv: Record<string, string> = {};
    for (const r of rows) {
      kv[r.key] = r.value;
    }

    const settings: PlatformSettingsData = {
      presetResetFee: parseFloat(kv["preset_reset_fee"] || "49.90") || 0,
      trialDays: parseInt(kv["trial_days"] || "14", 10) || 14,
      gracePeriodDays: parseInt(kv["grace_period_days"] || "5", 10) || 5,
      platformName: kv["platform_name"] || "Kreator Booking",
      supportEmail: kv["support_email"] || "suporte@kreator.com",
      selfRegistrationEnabled: kv["self_registration_enabled"] !== "false",
      maintenanceEnabled: kv["maintenance_enabled"] === "true",
      maintenanceStart: kv["maintenance_start"] || "",
      maintenanceEnd: kv["maintenance_end"] || "",
      maintenanceImpact: (kv["maintenance_impact"] as any) || "UNAVAILABLE",
      maintenanceMessage:
        kv["maintenance_message"] ||
        "Estamos realizando uma manutenção programada para melhorar nossos servidores.",
    };

    return { success: true, settings, presetResetFee: settings.presetResetFee };
  } catch (err) {
    console.error("Erro ao buscar configurações da plataforma:", err);
    const fallback: PlatformSettingsData = {
      presetResetFee: 49.9,
      trialDays: 14,
      gracePeriodDays: 5,
      platformName: "Kreator Booking",
      supportEmail: "suporte@kreator.com",
      selfRegistrationEnabled: true,
      maintenanceEnabled: false,
      maintenanceStart: "",
      maintenanceEnd: "",
      maintenanceImpact: "UNAVAILABLE",
      maintenanceMessage: "Estamos realizando uma manutenção programada.",
    };
    return { success: true, settings: fallback, presetResetFee: 49.9 };
  }
}

export async function updatePlatformSettingsAction(data: Partial<PlatformSettingsData>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return { success: false, error: "Acesso negado — Apenas Super Admin da Plataforma" };
  }

  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "system_setting" (
        "key" TEXT PRIMARY KEY,
        "value" TEXT NOT NULL,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    const entries: [string, string][] = [];

    if (data.presetResetFee !== undefined) entries.push(["preset_reset_fee", String(data.presetResetFee)]);
    if (data.trialDays !== undefined) entries.push(["trial_days", String(data.trialDays)]);
    if (data.gracePeriodDays !== undefined) entries.push(["grace_period_days", String(data.gracePeriodDays)]);
    if (data.platformName !== undefined) entries.push(["platform_name", data.platformName]);
    if (data.supportEmail !== undefined) entries.push(["support_email", data.supportEmail]);
    if (data.selfRegistrationEnabled !== undefined) entries.push(["self_registration_enabled", String(data.selfRegistrationEnabled)]);
    if (data.maintenanceEnabled !== undefined) entries.push(["maintenance_enabled", String(data.maintenanceEnabled)]);
    if (data.maintenanceStart !== undefined) entries.push(["maintenance_start", data.maintenanceStart]);
    if (data.maintenanceEnd !== undefined) entries.push(["maintenance_end", data.maintenanceEnd]);
    if (data.maintenanceImpact !== undefined) entries.push(["maintenance_impact", data.maintenanceImpact]);
    if (data.maintenanceMessage !== undefined) entries.push(["maintenance_message", data.maintenanceMessage]);

    for (const [k, v] of entries) {
      await db.$executeRawUnsafe(
        `
        INSERT INTO "system_setting" ("key", "value", "updatedAt")
        VALUES ($1, $2, NOW())
        ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW()
      `,
        k,
        v
      );
    }

    revalidatePath("/admin/configuracoes");
    revalidatePath("/dashboard");
    return { success: true, message: "Configurações globais salvas com sucesso!" };
  } catch (err) {
    console.error("Erro ao atualizar configurações da plataforma:", err);
    return { success: false, error: "Falha ao salvar configurações." };
  }
}
