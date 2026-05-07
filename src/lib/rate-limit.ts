import "server-only";
import { redis } from "./redis";

type RateLimitResult = { allowed: boolean; remaining: number; resetInSeconds: number };

/**
 * Sliding-window rate limiter using Redis.
 * @param key   - unique identifier (e.g. IP or userId)
 * @param limit - max requests in the window
 * @param windowSeconds - window duration in seconds
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const redisKey = `rl:${key}`;
    const current = await redis.incr(redisKey);

    if (current === 1) {
      await redis.expire(redisKey, windowSeconds);
    }

    const ttl = await redis.ttl(redisKey);

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetInSeconds: ttl > 0 ? ttl : windowSeconds,
    };
  } catch {
    // If Redis is down, allow the request (fail open)
    console.error("[rate-limit] Redis unavailable, failing open");
    return { allowed: true, remaining: limit, resetInSeconds: windowSeconds };
  }
}

/** Helper to get client IP from request */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
