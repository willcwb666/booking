import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { checkAndTouchSession } from "@/lib/session-policy";

// Verifies a bearer token from mobile requests.
// Mobile app sends: Authorization: Bearer <session-token>
// We look up the session directly in the database.
export async function getMobileSession(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: {
      user: {
        select: { id: true, name: true, email: true, emailVerified: true, role: true, banned: true },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) return null;
  if (session.user.banned) return null;

  // Política de inatividade — para sessões MOBILE vem do campo próprio do
  // super admin (desligado por padrão), então na prática isto só registra o
  // acesso. Se a sessão foi criada pelo navegador (`client: "WEB"`), vale a
  // regra do painel: um bearer token de painel não vira acesso perpétuo.
  const activity = await checkAndTouchSession({
    sessionId: session.id,
    userId: session.userId,
    role: session.user.role,
    client: session.client,
    lastActivityAt: session.lastActivityAt,
  });
  if (!activity.ok) return null;

  return {
    user: session.user,
    session: { id: session.id, token: session.token, expiresAt: session.expiresAt },
  };
}
