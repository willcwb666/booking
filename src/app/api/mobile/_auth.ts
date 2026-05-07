import { db } from "@/lib/db";
import { NextRequest } from "next/server";

// Verifies a bearer token from mobile requests.
// Mobile app sends: Authorization: Bearer <session-token>
// We look up the session directly in the database.
export async function getMobileSession(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { select: { id: true, name: true, email: true, role: true, banned: true } } },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) return null;
  if (session.user.banned) return null;

  return {
    user: session.user,
    session: { id: session.id, token: session.token, expiresAt: session.expiresAt },
  };
}
