import type { Context, Next } from "hono";

/**
 * Enterprise Security Headers Middleware
 * Protects against XSS, clickjacking, token exfiltration, MIME confusion, and referrer leaks.
 */
export function securityHeaders() {
  return async (c: Context, next: Next) => {
    await next();

    // Prevent framing / clickjacking (so attackers cannot frame dashboard to grab clicks/tokens)
    c.header("X-Frame-Options", "DENY");

    // Prevent browsers from sniffing MIME types away from the declared Content-Type
    c.header("X-Content-Type-Options", "nosniff");

    // Modern standard: disable buggy legacy browser XSS filters that introduced new vulnerabilities
    c.header("X-XSS-Protection", "0");

    // Ensure referrers do not leak tokens or private query parameters across origins
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");

    // Disable unwanted browser sensors & features that malicious scripts might query
    c.header(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"
    );

    // Cross-Origin policies
    c.header("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    c.header("Cross-Origin-Resource-Policy", "same-origin");

    // Content-Security-Policy (CSP)
    // Disallows untrusted script execution, restricts connections, and locks frame-ancestors
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://unpkg.com https://fonts.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://discord.com https://*.discordapp.com wss: ws:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://discord.com",
      "object-src 'none'",
    ].join("; ");

    c.header("Content-Security-Policy", csp);
  };
}
