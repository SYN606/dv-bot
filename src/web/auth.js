import crypto from "node:crypto";
import { CONFIG } from "../config.js";

const DISCORD_API = "https://discord.com/api/v10";

// Ensure no trailing slashes disrupt Discord's strict redirect_uri matching
function getCallbackUrl() {
  const base = (CONFIG.DASHBOARD_URL || "").replace(/\/+$/, "");
  return `${base}/auth/callback`;
}

export function getOAuthUrl() {
  const params = new URLSearchParams({
    client_id: CONFIG.CLIENT_ID,
    redirect_uri: getCallbackUrl(),
    response_type: "code",
    scope: "identify guilds",
  });
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
  if (!res.ok) throw new Error("Failed to fetch Discord user");
  return await res.json();
}

export async function fetchDiscordGuilds(accessToken) {
  const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch Discord guilds");
  return await res.json();
}

// Session Token Helper (HMAC Signed payload)
export function createSessionToken(data) {
  // Add 7-day expiration timestamp
  const payloadData = { ...data, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const payload = Buffer.from(JSON.stringify(payloadData)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", CONFIG.SESSION_SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [payload, signature] = token.split(".");
  const expectedSig = crypto
    .createHmac("sha256", CONFIG.SESSION_SECRET)
    .update(payload)
    .digest("base64url");

  if (signature !== expectedSig) return null;

  try {
    const decoded = Buffer.from(payload, "base64url").toString("utf-8");
    const data = JSON.parse(decoded);
    
    // Check expiration if it exists
    if (data.exp && Date.now() > data.exp) {
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}
