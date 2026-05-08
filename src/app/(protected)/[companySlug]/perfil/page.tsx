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
      notificationPrefs: true,
    },
  });
  if (!user) notFound();

  const prefs = user.notificationPrefs;

  return (
    <PerfilClient
      name={user.name}
      email={user.email}
      bio={user.bio ?? ""}
      location={user.location ?? ""}
      notifPrefs={{
        enableEmail:    prefs?.enableEmail    ?? true,
        enablePush:     prefs?.enablePush     ?? true,
        enableWhatsApp: prefs?.enableWhatsApp ?? false,
        enableSms:      prefs?.enableSms      ?? false,
        whatsappPhone:  prefs?.whatsappPhone  ?? "",
        smsPhone:       prefs?.smsPhone       ?? "",
      }}
    />
  );
}
