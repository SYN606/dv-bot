/**
 * Simple Sliding-Window Rate Limiter Middleware for Hono API
 * Protects endpoints from DoS and brute-force attacks.
 */
export function rateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute
  const maxRequests = options.maxRequests || 100; // Max requests per IP per window

  // ip -> { count, startTime }
  const store = new Map();

  // Prune expired records to prevent memory leak
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of store.entries()) {
      if (now - data.startTime > windowMs) {
        store.delete(ip);
      }
    }
  }, windowMs);

  return async (c, next) => {
    // Get IP from Cloudflare header or default remote address
    const ip =
      c.req.header("cf-connecting-ip") ||
      c.req.header("x-forwarded-for") ||
      "127.0.0.1";

    const now = Date.now();
    let record = store.get(ip);

    if (!record) {
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
