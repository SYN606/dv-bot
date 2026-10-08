// ============================================================================
// API Transport Layer — Digital Vigital
// ============================================================================
// Responsibilities:
//   - fetch with credentials + JSON
//   - GET caching (15s TTL)
//   - In-flight GET deduplication (concurrent requests share one Promise)
//   - Targeted cache invalidation helpers
//   - Consistent body serialization (callers always pass plain objects)
// ============================================================================

const CACHE_TTL = 15000; // 15 seconds

// Simple TTL cache: url → { data, expires }
const CACHE = new Map();

// In-flight deduplication: url → Promise
const INFLIGHT = new Map();

// ──────────────────────────────────────────────────────────────────────────────
// Cache Invalidation Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Invalidate a single exact cache key.
 */
export function invalidate(url) {
  const key = url.startsWith("/") ? url : "/api/" + url;
  CACHE.delete(key);
}

/**
 * Invalidate all cache entries whose key starts with the given prefix.
 */
export function invalidatePrefix(prefix) {
  for (const key of CACHE.keys()) {
    if (key.startsWith(prefix)) {
      CACHE.delete(key);
    }
  }
}

/**
 * Convenience: invalidate all cache entries for a specific guild + domain.
 * Pass the full URL prefix, e.g. `/api/guilds/123456/verification`
 */
export function invalidatePath(urlPath) {
  invalidatePrefix(urlPath);
}

/**
 * Clear the entire frontend cache. Use only for auth events (login/logout).
 */
export function clearCache() {
  CACHE.clear();
  INFLIGHT.clear();
}

// ──────────────────────────────────────────────────────────────────────────────
// Core Fetch
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Core transport. All API calls go through here.
 *
 * Body normalization:
 *   - Pass plain JS objects as `options.body` — this function serializes them.
 *   - Do NOT pre-stringify bodies before passing to fetchApi.
 */
export async function fetchApi(endpoint, options = {}) {
  const url = endpoint.startsWith("/") ? endpoint : "/api/" + endpoint;
  const isGet = !options.method || options.method === "GET";

  // ── GET Cache Hit ──
  if (isGet && CACHE.has(url)) {
    const cached = CACHE.get(url);
    if (Date.now() < cached.expires) return cached.data;
    CACHE.delete(url);
  }

  // ── In-Flight Deduplication for GETs ──
  if (isGet && INFLIGHT.has(url)) {
    return INFLIGHT.get(url);
  }

  // ── Build Request Config ──
  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include",
  };

  // Serialize object bodies consistently — callers should pass plain objects
  if (options.body !== undefined && options.body !== null) {
    if (typeof options.body === "object") {
      config.body = JSON.stringify(options.body);
    } else {
      // Already a string or primitive — pass through (handles edge cases)
      config.body = options.body;
    }
  }

  // ── Execute Request ──
  const requestPromise = fetch(url, config)
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const err = new Error(data.error || "Request failed with status " + response.status);
        err.status = response.status;
        err.data = data;
        throw err;
      }
      return data;
    })
    .then((data) => {
      if (isGet) {
        CACHE.set(url, { data, expires: Date.now() + CACHE_TTL });
        INFLIGHT.delete(url);
      }
      return data;
    })
    .catch((err) => {
      if (isGet) INFLIGHT.delete(url);
      throw err;
    });

  if (isGet) {
    INFLIGHT.set(url, requestPromise);
  }

  return requestPromise;
}

// Auth & Bot

export async function getAuthSession() {
  return fetchApi("/api/me");
}

export async function syncAuthSession() {
  // Auth sync does not touch guild-level cache
  return fetchApi("/api/me/sync", { method: "POST" });
}

export async function getBotInfo() {
  return fetchApi("/api/bot");
}

// Guild Metadata

export async function getGuildMeta(guildId) {
  return fetchApi(`/api/guilds/${guildId}/meta`);
}

export async function getGuildMembers(guildId, query = "") {
  const q = query ? `?q=${encodeURIComponent(query)}` : "";
  return fetchApi(`/api/guilds/${guildId}/members${q}`);
}

// Verification

export async function getVerification(guildId) {
  return fetchApi(`/api/guilds/${guildId}/verification`);
}

export async function saveVerification(guildId, payload) {
  const result = await fetchApi(`/api/guilds/${guildId}/verification`, {
    method: "POST",
    body: payload,
  });
  invalidatePath(`/api/guilds/${guildId}/verification`);
  return result;
}

export async function postVerificationButton(guildId, payload = {}) {
  // Does not change verification config data, only triggers a Discord action
  return fetchApi(`/api/guilds/${guildId}/verification/post_button`, {
    method: "POST",
    body: payload,
  });
}

export async function resetVerification(guildId) {
  const result = await fetchApi(`/api/guilds/${guildId}/verification/reset`, {
    method: "POST",
  });
  invalidatePath(`/api/guilds/${guildId}/verification`);
  return result;
}

// Staff Admin Roles & Users

export async function getAdminRoles(guildId) {
  return fetchApi(`/api/guilds/${guildId}/admin_roles`);
}

export async function addAdminRole(guildId, roleId) {
  const result = await fetchApi(`/api/guilds/${guildId}/admin_roles`, {
    method: "POST",
    body: { roleId },
  });
  invalidatePath(`/api/guilds/${guildId}/admin_roles`);
  return result;
}

export async function deleteAdminRole(guildId, roleId) {
  const result = await fetchApi(`/api/guilds/${guildId}/admin_roles/${roleId}`, {
    method: "DELETE",
  });
  invalidatePath(`/api/guilds/${guildId}/admin_roles`);
  return result;
}

export async function addAdminUser(guildId, userId) {
  const result = await fetchApi(`/api/guilds/${guildId}/admin_users`, {
    method: "POST",
    body: { userId },
  });
  invalidatePath(`/api/guilds/${guildId}/admin_roles`); // admin_roles endpoint returns both roles+users
  return result;
}

export async function deleteAdminUser(guildId, userId) {
  const result = await fetchApi(`/api/guilds/${guildId}/admin_users/${userId}`, {
    method: "DELETE",
  });
  invalidatePath(`/api/guilds/${guildId}/admin_roles`);
  return result;
}

// Media Only Channels

export async function getMediaOnly(guildId) {
  return fetchApi(`/api/guilds/${guildId}/media_only`);
}

export async function addMediaOnly(guildId, payload) {
  const result = await fetchApi(`/api/guilds/${guildId}/media_only`, {
    method: "POST",
    body: payload,
  });
  invalidatePath(`/api/guilds/${guildId}/media_only`);
  return result;
}

export async function deleteMediaOnly(guildId, channelId) {
  const result = await fetchApi(`/api/guilds/${guildId}/media_only/${channelId}`, {
    method: "DELETE",
  });
  invalidatePath(`/api/guilds/${guildId}/media_only`);
  return result;
}

// Command Restrictions

export async function getCommands(guildId, channelId) {
  const query = channelId ? `?channel_id=${encodeURIComponent(channelId)}` : "";
  return fetchApi(`/api/guilds/${guildId}/commands${query}`);
}

export async function toggleCommand(guildId, payload) {
  const result = await fetchApi(`/api/guilds/${guildId}/commands/toggle`, {
    method: "POST",
    body: payload,
  });
  invalidatePath(`/api/guilds/${guildId}/commands`);
  return result;
}

export async function toggleCommandModule(guildId, payload) {
  const result = await fetchApi(`/api/guilds/${guildId}/commands/module_toggle`, {
    method: "POST",
    body: payload,
  });
  invalidatePath(`/api/guilds/${guildId}/commands`);
  return result;
}

// Sticky Messages

export async function getSticky(guildId) {
  return fetchApi(`/api/guilds/${guildId}/sticky`);
}

export async function saveSticky(guildId, payload) {
  const result = await fetchApi(`/api/guilds/${guildId}/sticky`, {
    method: "POST",
    body: payload,
  });
  invalidatePath(`/api/guilds/${guildId}/sticky`);
  return result;
}

export async function deleteSticky(guildId, channelId) {
  const result = await fetchApi(`/api/guilds/${guildId}/sticky/${channelId}`, {
    method: "DELETE",
  });
  invalidatePath(`/api/guilds/${guildId}/sticky`);
  return result;
}

// Autoresponder

export async function getAutoresponders(guildId) {
  return fetchApi(`/api/guilds/${guildId}/autoresponder`);
}

export async function saveAutoresponder(guildId, payload) {
  let result;
  if (payload.id) {
    result = await fetchApi(`/api/guilds/${guildId}/autoresponder/${payload.id}`, {
      method: "PUT",
      body: payload,
    });
  } else {
    result = await fetchApi(`/api/guilds/${guildId}/autoresponder`, {
      method: "POST",
      body: payload,
    });
  }
  invalidatePath(`/api/guilds/${guildId}/autoresponder`);
  return result;
}

export async function toggleAutoresponder(guildId, ruleId) {
  const result = await fetchApi(`/api/guilds/${guildId}/autoresponder/${ruleId}/toggle`, {
    method: "POST",
  });
  invalidatePath(`/api/guilds/${guildId}/autoresponder`);
  return result;
}

export async function deleteAutoresponder(guildId, ruleId) {
  const result = await fetchApi(`/api/guilds/${guildId}/autoresponder/${ruleId}`, {
    method: "DELETE",
  });
  invalidatePath(`/api/guilds/${guildId}/autoresponder`);
  return result;
}

// Server Emojis

export async function getGuildEmojis(guildId) {
  return fetchApi(`/api/guilds/${guildId}/emojis`);
}

// General Server Config

export async function getConfig(guildId) {
  return fetchApi(`/api/guilds/${guildId}/config`);
}

export async function saveConfig(guildId, payload) {
  const result = await fetchApi(`/api/guilds/${guildId}/config`, {
    method: "POST",
    body: payload,
  });
  invalidatePath(`/api/guilds/${guildId}/config`);
  return result;
}

// Tempban Role Config

export async function getTempban(guildId) {
  return fetchApi(`/api/guilds/${guildId}/tempban`);
}

export async function saveTempban(guildId, roleId) {
  const result = await fetchApi(`/api/guilds/${guildId}/tempban`, {
    method: "POST",
    body: { roleId },
  });
  invalidatePath(`/api/guilds/${guildId}/tempban`);
  return result;
}

// Analytics

export async function getAnalytics(guildId, days = 7, refresh = false) {
  const url = `/api/guilds/${guildId}/analytics?days=${days}${refresh ? "&refresh=true" : ""}`;
  return fetchApi(url);
}

// Public Documentation & Commands

export async function getPublicCommands() {
  return fetchApi("/api/commands");
}

// Supporter Rewards

export async function getSupporterConfig(guildId) {
  return fetchApi(`/api/guilds/${guildId}/supporter`);
}

export async function setSupporterConfig(guildId, data) {
  // Pass plain object — fetchApi handles serialization
  const result = await fetchApi(`/api/guilds/${guildId}/supporter`, {
    method: "PUT",
    body: data,
  });
  invalidatePath(`/api/guilds/${guildId}/supporter`);
  return result;
}

// AutoRole Rewards

export async function getAutoRoleConfig(guildId) {
  return fetchApi(`/api/guilds/${guildId}/autorole`);
}

export async function setAutoRoleConfig(guildId, payload) {
  // Pass plain object — fetchApi handles serialization
  const result = await fetchApi(`/api/guilds/${guildId}/autorole`, {
    method: "PUT",
    body: payload,
  });
  invalidatePath(`/api/guilds/${guildId}/autorole`);
  return result;
}

// Warning Punishments

export async function getWarningPunishments(guildId) {
  return fetchApi(`/api/guilds/${guildId}/warning_punishments`);
}

export async function addWarningPunishment(guildId, payload) {
  const result = await fetchApi(`/api/guilds/${guildId}/warning_punishments`, {
    method: "POST",
    body: payload,
  });
  invalidatePath(`/api/guilds/${guildId}/warning_punishments`);
  return result;
}

export async function removeWarningPunishment(guildId, warnCount) {
  const result = await fetchApi(`/api/guilds/${guildId}/warning_punishments/${warnCount}`, {
    method: "DELETE",
  });
  invalidatePath(`/api/guilds/${guildId}/warning_punishments`);
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Message Studio API
// ─────────────────────────────────────────────────────────────────────────────

export async function getMessageStudioChannels(guildId) {
  return fetchApi(`/api/guilds/${guildId}/message-studio/channels`);
}

export async function getMessageStudioDrafts(guildId) {
  return fetchApi(`/api/guilds/${guildId}/message-studio/drafts`);
}

export async function getMessageStudioDraft(guildId, draftId) {
  return fetchApi(`/api/guilds/${guildId}/message-studio/drafts/${draftId}`);
}

export async function saveMessageStudioDraft(guildId, payload) {
  const result = await fetchApi(`/api/guilds/${guildId}/message-studio/drafts`, {
    method: "POST",
    body: payload,
  });
  invalidatePath(`/api/guilds/${guildId}/message-studio/drafts`);
  return result;
}

export async function deleteMessageStudioDraft(guildId, draftId) {
  const result = await fetchApi(`/api/guilds/${guildId}/message-studio/drafts/${draftId}`, {
    method: "DELETE",
  });
  invalidatePath(`/api/guilds/${guildId}/message-studio/drafts`);
  return result;
}

export async function getMessageStudioTemplates(guildId, { category, search } = {}) {
  const params = new URLSearchParams();
  if (category && category !== "All") params.append("category", category);
  if (search) params.append("search", search);
  const q = params.toString() ? `?${params.toString()}` : "";
  return fetchApi(`/api/guilds/${guildId}/message-studio/templates${q}`);
}

export async function getMessageStudioTemplate(guildId, templateId) {
  return fetchApi(`/api/guilds/${guildId}/message-studio/templates/${templateId}`);
}

export async function createMessageStudioTemplate(guildId, payload) {
  const result = await fetchApi(`/api/guilds/${guildId}/message-studio/templates`, {
    method: "POST",
    body: payload,
  });
  invalidatePath(`/api/guilds/${guildId}/message-studio/templates`);
  return result;
}

export async function updateMessageStudioTemplate(guildId, templateId, payload) {
  const result = await fetchApi(`/api/guilds/${guildId}/message-studio/templates/${templateId}`, {
    method: "PUT",
    body: payload,
  });
  invalidatePath(`/api/guilds/${guildId}/message-studio/templates`);
  return result;
}

export async function duplicateMessageStudioTemplate(guildId, templateId) {
  const result = await fetchApi(`/api/guilds/${guildId}/message-studio/templates/${templateId}/duplicate`, {
    method: "POST",
  });
  invalidatePath(`/api/guilds/${guildId}/message-studio/templates`);
  return result;
}

export async function deleteMessageStudioTemplate(guildId, templateId) {
  const result = await fetchApi(`/api/guilds/${guildId}/message-studio/templates/${templateId}`, {
    method: "DELETE",
  });
  invalidatePath(`/api/guilds/${guildId}/message-studio/templates`);
  return result;
}

export async function validateMessageStudioMessage(guildId, payload) {
  return fetchApi(`/api/guilds/${guildId}/message-studio/validate`, {
    method: "POST",
    body: payload,
  });
}

export async function validateMessageStudioReply(guildId, urlOrConfig) {
  return fetchApi(`/api/guilds/${guildId}/message-studio/validate-reply`, {
    method: "POST",
    body: typeof urlOrConfig === "string" ? { url: urlOrConfig } : urlOrConfig,
  });
}

export async function publishMessageStudioMessage(guildId, payload) {
  const result = await fetchApi(`/api/guilds/${guildId}/message-studio/publish`, {
    method: "POST",
    body: payload,
  });
  invalidatePath(`/api/guilds/${guildId}/message-studio/history`);
  return result;
}

export async function getMessageStudioHistory(guildId, { limit = 50, offset = 0 } = {}) {
  return fetchApi(`/api/guilds/${guildId}/message-studio/history?limit=${limit}&offset=${offset}`);
}

export async function editMessageStudioPublishedMessage(guildId, messageId, payload) {
  const result = await fetchApi(`/api/guilds/${guildId}/message-studio/messages/${messageId}`, {
    method: "PUT",
    body: payload,
  });
  invalidatePath(`/api/guilds/${guildId}/message-studio/history`);
  return result;
}

export async function deleteMessageStudioPublishedMessage(guildId, messageId, channelId) {
  const result = await fetchApi(`/api/guilds/${guildId}/message-studio/messages/${messageId}?channel_id=${channelId}`, {
    method: "DELETE",
  });
  invalidatePath(`/api/guilds/${guildId}/message-studio/history`);
  return result;
}
