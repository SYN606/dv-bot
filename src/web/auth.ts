import crypto from "node:crypto";
import { CONFIG } from "../config.js";

const DISCORD_API = "https://discord.com/api/v10";

// Ensure no trailing slashes disrupt Discord's strict redirect_uri matching
function getCallbackUrl() {
  const base = (CONFIG.DASHBOARD_URL || "").replace(/\/+$/, "");
  return `${base}/auth/callback`;
}

export function getOAuthUrl(state = null) {
  const params = new URLSearchParams({
    client_id: CONFIG.CLIENT_ID,
    redirect_uri: getCallbackUrl(),
    response_type: "code",
    scope: "identify guilds",
  });
  if (state) {
    params.set("state", state);
  }
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCode(code) {
  const body = new URLSearchParams({
    client_id: CONFIG.CLIENT_ID,
    client_secret: CONFIG.CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: getCallbackUrl(),
  });

  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to exchange code: ${res.status} ${errorText}`);
  }

  return await res.json();
}

export async function fetchDiscordUser(accessToken) {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err: any = new Error(`Failed to fetch Discord user (Status: ${res.status})`);
    err.status = res.status;
    throw err;
  }
  return await res.json();
}

export async function fetchDiscordGuilds(accessToken) {
  const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const retryAfter = res.headers.get("retry-after") || res.headers.get("x-ratelimit-reset-after");
    const err: any = new Error(`Failed to fetch Discord guilds (Status: ${res.status}${retryAfter ? `, Retry-After: ${retryAfter}s` : ""})`);
    err.status = res.status;
    err.retryAfter = retryAfter ? parseFloat(retryAfter) : null;
    throw err;
  }
  return await res.json();
}

// Derive 32-byte AES-256 encryption key from SESSION_SECRET
function getEncryptionKey(): Buffer {
  return crypto.createHash("sha256").update(CONFIG.SESSION_SECRET || "dv-bot-default-secret-salt").digest();
}

/**
 * Creates an AES-256-GCM encrypted session token.
 * Prevents token grabbing, inspection, or tampering.
 */
export function createSessionToken(data: any): string {
  // Add 7-day expiration timestamp
  const payloadData = { ...data, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const jsonStr = JSON.stringify(payloadData);
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(jsonStr, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `gcm.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

/**
 * Decrypts and verifies an AES-256-GCM session token.
 * Includes legacy HMAC fallback so existing sessions aren't disrupted.
 */
export function verifySessionToken(token: string): any {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;

  // 1. AES-256-GCM Encrypted Token Format
  if (token.startsWith("gcm.")) {
    const parts = token.split(".");
    if (parts.length !== 4) return null;
    const [, ivStr, tagStr, cipherStr] = parts;

    try {
      const key = getEncryptionKey();
      const iv = Buffer.from(ivStr, "base64url");
      const tag = Buffer.from(tagStr, "base64url");
      const encrypted = Buffer.from(cipherStr, "base64url");

      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");

      const data = JSON.parse(decrypted);
      if (data.exp && Date.now() > data.exp) {
        return null; // Expired
      }
      return data;
    } catch {
      return null;
    }
  }

  // 2. Legacy HMAC Token Format Fallback
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;

  const expectedSig = crypto
    .createHmac("sha256", CONFIG.SESSION_SECRET || "")
    .update(payload)
    .digest("base64url");

  const sigBuf = Buffer.from(signature, "utf-8");
  const expectedBuf = Buffer.from(expectedSig, "utf-8");

  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const decoded = Buffer.from(payload, "base64url").toString("utf-8");
    const data = JSON.parse(decoded);
    if (data.exp && Date.now() > data.exp) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
