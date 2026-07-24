import { getSystemNotificationsAction } from "@/server/actions/notifications-system";
import { AdminNotificacoesClient } from "./notificacoes-client";

export default async function AdminNotificacoesPage() {
  const { notifications } = await getSystemNotificationsAction();

  return <AdminNotificacoesClient initialNotifications={notifications} />;
}
