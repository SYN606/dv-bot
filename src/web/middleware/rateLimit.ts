import type { Context, Next } from "hono";

export interface RateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
}

interface RateLimitRecord {
  count: number;
  startTime: number;
}

/**
 * Simple Sliding-Window Rate Limiter Middleware for Hono API
 * Protects endpoints from DoS and brute-force attacks.
 */
export function rateLimiter(options: RateLimiterOptions = {}) {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute
  const maxRequests = options.maxRequests || 100; // Max requests per IP per window
  const MAX_IPS = 5000;

  // ip -> { count, startTime }
  const store = new Map<string, RateLimitRecord>();

  // Prune expired records to prevent memory leak
  const pruneTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of store.entries()) {
      if (now - data.startTime > windowMs) {
        store.delete(ip);
      }
    }
  }, windowMs);
  if (pruneTimer.unref) pruneTimer.unref();

  return async (c: Context, next: Next) => {
    // Get IP safely: if x-forwarded-for has multiple, grab the first client IP
    const rawForwarded = c.req.header("x-forwarded-for");
    const forwardedIp = rawForwarded ? rawForwarded.split(",")[0].trim() : null;
    const ip = c.req.header("cf-connecting-ip") || forwardedIp || "127.0.0.1";

    const now = Date.now();
    let record = store.get(ip);

    if (!record) {
      if (store.size >= MAX_IPS) {
        const oldest = store.keys().next().value;
        if (oldest) store.delete(oldest);
      }
      record = { count: 1, startTime: now };
      store.set(ip, record);
    } else {
      if (now - record.startTime > windowMs) {
        // Reset window
        record.count = 1;
        record.startTime = now;
      } else {
        record.count++;
      }
    }

    if (record.count > maxRequests) {
      // Return 429 Too Many Requests
      return c.json(
        { error: "Too many requests. Please try again later." },
        429
      );
    }

    await next();
  };
}
