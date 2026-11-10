import type { Context, Next } from "hono";
import { CONFIG } from "../../config.js";

/**
 * Origin & CSRF Defense Middleware
 * Protects state-changing endpoints (POST, PUT, PATCH, DELETE) from unauthorized Cross-Site Request Forgery.
 */
export function csrfProtection() {
  const allowedOrigins = new Set<string>();

  // Add dashboard URLs to trusted origins
  if (CONFIG.DASHBOARD_URL) {
    try {
      const url = new URL(CONFIG.DASHBOARD_URL);
      allowedOrigins.add(url.origin.toLowerCase());
    } catch { }
  }
  if (CONFIG.DASHBOARD_URL_DEV) {
    try {
      const url = new URL(CONFIG.DASHBOARD_URL_DEV);
      allowedOrigins.add(url.origin.toLowerCase());
    } catch { }
  }

  // Common local development origins
  allowedOrigins.add("http://localhost:3000");
  allowedOrigins.add("http://127.0.0.1:3000");
  allowedOrigins.add("http://localhost:5173"); // Vite dev server
  allowedOrigins.add("http://127.0.0.1:5173");

  return async (c: Context, next: Next) => {
    const method = c.req.method.toUpperCase();

    // Safe read-only HTTP methods do not require origin check
    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
      return await next();
    }

    // Exclude OAuth authentication redirects
    if (c.req.path.startsWith("/auth/")) {
      return await next();
    }

    const origin = c.req.header("origin");
    const referer = c.req.header("referer");

    let sourceOrigin: string | null = null;
    if (origin) {
      try {
        sourceOrigin = new URL(origin).origin.toLowerCase();
      } catch { }
    } else if (referer) {
      try {
        sourceOrigin = new URL(referer).origin.toLowerCase();
      } catch { }
    }

    // If an Origin or Referer header was sent by the browser, verify it
    if (sourceOrigin) {
      // Also match current host
      const host = c.req.header("host");
      const isLocalHost = host && sourceOrigin.includes(host.toLowerCase());

      if (!allowedOrigins.has(sourceOrigin) && !isLocalHost) {
        return c.json(
          {
            error: "Forbidden: Cross-origin request rejected (CSRF protection).",
            code: "CSRF_BLOCKED",
          },
          403
        );
      }
    }

    await next();
  };
}
