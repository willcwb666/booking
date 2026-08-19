import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { PerfilClient } from "./perfil-client";

export default async function PerfilPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = await db.user.findUnique({
    where: { id: session!.user.id },
    select: {
      name: true,
      email: true,
      bio: true,
      location: true,
      role: true,
      twoFactorEnabled: true,
      notificationPrefs: true,
      companyUsers: { where: { isActive: true }, select: { role: true } },
    },
  });
  if (!user) notFound();

  const prefs = user.notificationPrefs;

  // Pedido de reset em curso contra esta conta. Carregado sempre, não só quando
  // o 2FA está ligado: o aviso precisa aparecer justamente no intervalo em que
  // a remoção ainda não aconteceu.
  const pendingReset = await db.twoFactorResetRequest.findFirst({
    where: { targetUserId: session!.user.id, status: "PENDING" },
    select: { id: true, reason: true, executeAfter: true },
    orderBy: { createdAt: "desc" },
  });

  /**
   * Quem administra empresa não escolhe se usa verificação em duas etapas.
   *
   * A conta de OWNER/MANAGER alcança token de gateway de pagamento, a agenda
   * inteira do negócio e a carteira de clientes; a de super admin alcança tudo
   * isso em todos os tenants. Deixar opcional para esses papéis é o mesmo que
   * não ter.
   */
  const twoFactorRequired =
    user.role === "admin" ||
    user.companyUsers.some((m) => m.role === "OWNER" || m.role === "MANAGER");

  return (
    <PerfilClient
      name={user.name}
      email={user.email}
      bio={user.bio ?? ""}
      location={user.location ?? ""}
      twoFactorEnabled={user.twoFactorEnabled ?? false}
      twoFactorRequired={twoFactorRequired}
      pendingReset={
        pendingReset
          ? {
              id: pendingReset.id,
              reason: pendingReset.reason,
              executeAfter: pendingReset.executeAfter.toISOString(),
            }
          : null
      }
      notifPrefs={{
        enableEmail:     prefs?.enableEmail     ?? true,
        enablePush:      prefs?.enablePush      ?? true,
        enableWhatsApp:  prefs?.enableWhatsApp  ?? false,
        enableSms:       prefs?.enableSms       ?? false,
        enableMarketing: prefs?.enableMarketing ?? false,
        whatsappPhone:   prefs?.whatsappPhone   ?? "",
        smsPhone:        prefs?.smsPhone        ?? "",
      }}
    />
  );
}
