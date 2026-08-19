import "server-only";
import { db } from "@/lib/db";

/**
 * Configurações globais da plataforma (tabela `system_setting`).
 *
 * Este módulo é a ÚNICA fonte de leitura/escrita dessas chaves. Antes cada
 * caller montava o `CREATE TABLE IF NOT EXISTS` + SQL bruto na mão; agora a
 * tabela é um model Prisma versionado por migration.
 */
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

  // ─── Política de sessão ───
  /** Minutos de inatividade até deslogar quem opera o painel. 0 = desligado. */
  sessionIdleStaffMinutes: number;
  /** Minutos de inatividade para o cliente final logado. 0 = desligado. */
  sessionIdleCustomerMinutes: number;
  /** Minutos de inatividade para sessões do app mobile. 0 = desligado. */
  sessionIdleMobileMinutes: number;
  /** Um login ativo por vez no navegador — o novo derruba o anterior. */
  singleWebSessionEnabled: boolean;
};

export const PLATFORM_SETTINGS_DEFAULTS: PlatformSettingsData = {
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
  maintenanceMessage:
    "Estamos realizando uma manutenção programada para melhorar nossos servidores.",
  sessionIdleStaffMinutes: 5,
  sessionIdleCustomerMinutes: 60,
  sessionIdleMobileMinutes: 0,
  singleWebSessionEnabled: true,
};

/** Mapa campo ↔ chave persistida, para não repetir strings soltas nos callers. */
const KEYS = {
  presetResetFee: "preset_reset_fee",
  trialDays: "trial_days",
  gracePeriodDays: "grace_period_days",
  platformName: "platform_name",
  supportEmail: "support_email",
  selfRegistrationEnabled: "self_registration_enabled",
  maintenanceEnabled: "maintenance_enabled",
  maintenanceStart: "maintenance_start",
  maintenanceEnd: "maintenance_end",
  maintenanceImpact: "maintenance_impact",
  maintenanceMessage: "maintenance_message",
  sessionIdleStaffMinutes: "session_idle_staff_minutes",
  sessionIdleCustomerMinutes: "session_idle_customer_minutes",
  sessionIdleMobileMinutes: "session_idle_mobile_minutes",
  singleWebSessionEnabled: "single_web_session_enabled",
} as const satisfies Record<keyof PlatformSettingsData, string>;

function int(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = parseInt(raw ?? "", 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function float(raw: string | undefined, fallback: number): number {
  const n = parseFloat(raw ?? "");
  return Number.isNaN(n) ? fallback : Math.max(0, n);
}

function parse(kv: Record<string, string>): PlatformSettingsData {
  const d = PLATFORM_SETTINGS_DEFAULTS;
  return {
    presetResetFee: float(kv[KEYS.presetResetFee], d.presetResetFee),
    trialDays: int(kv[KEYS.trialDays], d.trialDays, 0, 365),
    gracePeriodDays: int(kv[KEYS.gracePeriodDays], d.gracePeriodDays, 0, 365),
    platformName: kv[KEYS.platformName] || d.platformName,
    supportEmail: kv[KEYS.supportEmail] || d.supportEmail,
    selfRegistrationEnabled: kv[KEYS.selfRegistrationEnabled] !== "false",
    maintenanceEnabled: kv[KEYS.maintenanceEnabled] === "true",
    maintenanceStart: kv[KEYS.maintenanceStart] || "",
    maintenanceEnd: kv[KEYS.maintenanceEnd] || "",
    maintenanceImpact: kv[KEYS.maintenanceImpact] === "SLOW" ? "SLOW" : "UNAVAILABLE",
    maintenanceMessage: kv[KEYS.maintenanceMessage] || d.maintenanceMessage,
    // Teto de 1440 min (24 h) — acima disso o timeout perde o sentido
    sessionIdleStaffMinutes: int(kv[KEYS.sessionIdleStaffMinutes], d.sessionIdleStaffMinutes, 0, 1440),
    sessionIdleCustomerMinutes: int(kv[KEYS.sessionIdleCustomerMinutes], d.sessionIdleCustomerMinutes, 0, 1440),
    sessionIdleMobileMinutes: int(kv[KEYS.sessionIdleMobileMinutes], d.sessionIdleMobileMinutes, 0, 10080),
    singleWebSessionEnabled: kv[KEYS.singleWebSessionEnabled] !== "false",
  };
}

// Cache de processo: as configurações são lidas em TODA requisição autenticada
// (política de sessão), então uma query por request seria desperdício puro.
// TTL curto para o super admin ver o efeito quase imediatamente.
const CACHE_TTL_MS = 15_000;
let cache: { data: PlatformSettingsData; at: number } | null = null;

export function invalidatePlatformSettingsCache(): void {
  cache = null;
}

export async function getPlatformSettings(): Promise<PlatformSettingsData> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  try {
    const rows = await db.systemSetting.findMany({ select: { key: true, value: true } });
    const kv: Record<string, string> = {};
    for (const r of rows) kv[r.key] = r.value;

    const data = parse(kv);
    cache = { data, at: Date.now() };
    return data;
  } catch (err) {
    // Banco fora: serve os defaults em vez de derrubar a request. Não cacheia,
    // para voltar ao valor real assim que o banco responder.
    console.error("[platform-settings] falha ao ler system_setting:", err);
    return cache?.data ?? PLATFORM_SETTINGS_DEFAULTS;
  }
}

export async function savePlatformSettings(patch: Partial<PlatformSettingsData>): Promise<void> {
  const entries: Array<{ key: string; value: string }> = [];

  for (const [field, key] of Object.entries(KEYS) as Array<[keyof PlatformSettingsData, string]>) {
    const value = patch[field];
    if (value === undefined) continue;
    entries.push({ key, value: String(value) });
  }
  if (entries.length === 0) return;

  await db.$transaction(
    entries.map((e) =>
      db.systemSetting.upsert({
        where: { key: e.key },
        create: { key: e.key, value: e.value },
        update: { value: e.value },
      })
    )
  );

  invalidatePlatformSettingsCache();
}
