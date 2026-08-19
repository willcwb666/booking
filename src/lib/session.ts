import "server-only";
import { headers as nextHeaders } from "next/headers";
import { auth } from "@/lib/auth";
import { checkAndTouchSession, getIdleLimitMinutes } from "@/lib/session-policy";

type BetterAuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

/**
 * Sessão autenticada COM a política de inatividade aplicada.
 *
 * O proxy já cobre a navegação de painel, mas rotas `/api` ficam fora do
 * matcher do middleware — então toda leitura de sessão fora do proxy deve
 * passar por aqui, e não por `auth.api.getSession` direto. Sessão estourada é
 * revogada no banco e devolve `null`.
 */
export async function getActiveSession(reqHeaders?: Headers): Promise<BetterAuthSession> {
  const hdrs = reqHeaders ?? (await nextHeaders());
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session) return null;

  const activity = await checkAndTouchSession({
    sessionId: session.session.id,
    userId: session.user.id,
    role: session.user.role,
    client: (session.session as { client?: string }).client,
    lastActivityAt: (session.session as { lastActivityAt?: Date }).lastActivityAt,
  });

  return activity.ok ? session : null;
}

/**
 * Parâmetros do contador de inatividade para o cliente (painel).
 * `idleSeconds <= 0` significa política desligada — o guard não faz nada.
 */
export async function getSessionTimeoutConfig(session: NonNullable<BetterAuthSession>): Promise<{
  idleSeconds: number;
}> {
  const minutes = await getIdleLimitMinutes({
    userId: session.user.id,
    role: session.user.role,
    client: (session.session as { client?: string }).client,
  });
  return { idleSeconds: minutes * 60 };
}
