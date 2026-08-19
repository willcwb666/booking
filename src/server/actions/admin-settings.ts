"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  PLATFORM_SETTINGS_DEFAULTS,
  getPlatformSettings,
  savePlatformSettings,
  type PlatformSettingsData,
} from "@/lib/platform-settings";

// O tipo NÃO é re-exportado daqui: um módulo "use server" só pode exportar
// funções async, e o re-export de tipo quebra o grafo de server actions do
// Turbopack. Importe de "@/lib/platform-settings".

/**
 * Campos que só o super admin pode ler. A action é chamada de componentes
 * cliente (banner de manutenção, taxa de reset), então o payload de quem não é
 * admin volta com os defaults no lugar da política real de sessão — saber que
 * a plataforma desloga em 5 min e derruba sessão concorrente é informação de
 * segurança, não de produto.
 */
function redactForNonAdmin(settings: PlatformSettingsData): PlatformSettingsData {
  return {
    ...settings,
    sessionIdleStaffMinutes: PLATFORM_SETTINGS_DEFAULTS.sessionIdleStaffMinutes,
    sessionIdleCustomerMinutes: PLATFORM_SETTINGS_DEFAULTS.sessionIdleCustomerMinutes,
    sessionIdleMobileMinutes: PLATFORM_SETTINGS_DEFAULTS.sessionIdleMobileMinutes,
    singleWebSessionEnabled: PLATFORM_SETTINGS_DEFAULTS.singleWebSessionEnabled,
  };
}

export async function getPlatformSettingsAction(): Promise<{
  success: boolean;
  settings: PlatformSettingsData;
  presetResetFee: number;
}> {
  // Server actions são endpoints POST alcançáveis por qualquer um — exigir
  // sessão evita expor parâmetros operacionais da plataforma publicamente.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return {
      success: false,
      settings: PLATFORM_SETTINGS_DEFAULTS,
      presetResetFee: PLATFORM_SETTINGS_DEFAULTS.presetResetFee,
    };
  }

  const settings = await getPlatformSettings();
  const visible = session.user.role === "admin" ? settings : redactForNonAdmin(settings);

  return { success: true, settings: visible, presetResetFee: visible.presetResetFee };
}

export async function updatePlatformSettingsAction(data: Partial<PlatformSettingsData>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return { success: false, error: "Acesso negado — Apenas Super Admin da Plataforma" };
  }

  try {
    await savePlatformSettings(data);

    revalidatePath("/admin/configuracoes");
    revalidatePath("/dashboard");
    return { success: true, message: "Configurações globais salvas com sucesso!" };
  } catch (err) {
    console.error("Erro ao atualizar configurações da plataforma:", err);
    return { success: false, error: "Falha ao salvar configurações." };
  }
}
