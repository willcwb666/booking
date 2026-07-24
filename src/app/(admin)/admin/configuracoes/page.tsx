import { getPlatformSettingsAction } from "@/server/actions/admin-settings";
import { AdminConfiguracoesClient } from "./configuracoes-client";

export default async function AdminConfiguracoesPage() {
  const { settings } = await getPlatformSettingsAction();

  return <AdminConfiguracoesClient initialSettings={settings} />;
}
