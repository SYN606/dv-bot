import type { Context, Next } from "hono";
import { CONFIG } from "../../config.js";

// Regex detecting Discord tokens in raw text
const DISCORD_TOKEN_REGEX = /(?:mfa\.[\w-]{84}|[\w-]{24,26}\.[\w-]{6}\.[\w-]{27,38})/g;

// Keys that must NEVER be exposed in JSON responses to clients
const BLOCKED_KEYS = new Set<string>([
  "token",
  "bot_token",
  "discord_token",
  "client_secret",
  "session_secret",
  "access_token",
  "refresh_token",
  "lavalink_password",
  "db_pass",
]);

function sanitizeValue(val: any): any {
  if (val === null || val === undefined) return val;

  if (typeof val === "string") {
    // Redact bot token if present in string
    if (CONFIG.TOKEN && val.includes(CONFIG.TOKEN)) {
      val = val.replaceAll(CONFIG.TOKEN, "[REDACTED_BOT_TOKEN]");
    }
    if (CONFIG.CLIENT_SECRET && val.includes(CONFIG.CLIENT_SECRET)) {
      val = val.replaceAll(CONFIG.CLIENT_SECRET, "[REDACTED_SECRET]");
    }
    if (CONFIG.SESSION_SECRET && val.includes(CONFIG.SESSION_SECRET)) {
      val = val.replaceAll(CONFIG.SESSION_SECRET, "[REDACTED_SESSION_SECRET]");
    }
    // Check general Discord token regex
    if (DISCORD_TOKEN_REGEX.test(val)) {
      val = val.replaceAll(DISCORD_TOKEN_REGEX, "[REDACTED_TOKEN]");
    }
    return val;
  }

  if (Array.isArray(val)) {
    return val.map((item) => sanitizeValue(item));
  }

  if (typeof val === "object") {
    const sanitized: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (BLOCKED_KEYS.has(k.toLowerCase())) {
        continue; // Strip blocked key entirely
      }
      sanitized[k] = sanitizeValue(v);
    }
    return sanitized;
  }

  return val;
}

/**
 * Token Leak Sanitizer Middleware
 * Prevents internal credentials, OAuth access tokens, bot secrets, and DB passwords
 * from accidentally leaking to the frontend in API payloads or error responses.
 */
export function tokenSanitizer() {
  return async (c: Context, next: Next) => {
    await next();

    // Only sanitize JSON API responses
    const contentType = c.res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        const cloned = c.res.clone();
        const json = await cloned.json();
        const clean = sanitizeValue(json);

        // Reconstruct response with sanitized payload
        c.res = new Response(JSON.stringify(clean), {
          status: c.res.status,
          statusText: c.res.statusText,
          headers: c.res.headers,
        });
      } catch {
        // If body is empty or non-JSON, let it proceed
      }
    }
  };
}
