import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { checkAuthRateLimit } from "@/lib/auth-rate-limit";
import type { NextRequest } from "next/server";

const handlers = toNextJsHandler(auth);

// Endpoints que validam credenciais — alvos de brute-force. O rate limit
// precisa ficar AQUI (e não no proxy), pois o matcher do proxy exclui /api.
const RATE_LIMITED_PATHS = [
  "/sign-in",
  "/sign-up",
  "/forget-password",
  "/request-password-reset",
  "/reset-password",
];

export const GET = handlers.GET;

export async function POST(req: NextRequest): Promise<Response> {
  const { pathname } = new URL(req.url);
  if (RATE_LIMITED_PATHS.some((p) => pathname.includes(p))) {
    const limited = await checkAuthRateLimit(req);
    if (limited) return limited;
  }
  return handlers.POST(req);
}
