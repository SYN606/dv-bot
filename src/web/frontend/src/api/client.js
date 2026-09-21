// Centralized API Client with automatic JSON parsing and credential inclusion

export async function fetchApi(endpoint, options = {}) {
  const url = endpoint.startsWith("/") ? endpoint : `/api/${endpoint}`;
  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include",
  };

  if (options.body && typeof options.body === "object") {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

// User & Auth State
export async function getAuthSession() {
  return fetchApi("/api/me");
}

export async function getBotInfo() {
  return fetchApi("/api/bot");
}

// Guild Metadata
export async function getGuildMeta(guildId) {
  return fetchApi(`/api/guilds/${guildId}/meta`);
}

// Verification Gate
export async function getVerification(guildId) {
  return fetchApi(`/api/guilds/${guildId}/verification`);
}

export async function saveVerification(guildId, payload) {
  return fetchApi(`/api/guilds/${guildId}/verification`, {
    method: "POST",
    body: payload,
  });
}

export async function postVerificationButton(guildId) {
  return fetchApi(`/api/guilds/${guildId}/verification/post_button`, {
    method: "POST",
  });
}

// Staff Admin Roles
export async function getAdminRoles(guildId) {
  return fetchApi(`/api/guilds/${guildId}/admin_roles`);
}

export async function addAdminRole(guildId, roleId) {
  return fetchApi(`/api/guilds/${guildId}/admin_roles`, {
    method: "POST",
    body: { roleId },
  });
}

export async function deleteAdminRole(guildId, roleId) {
  return fetchApi(`/api/guilds/${guildId}/admin_roles/${roleId}`, {
    method: "DELETE",
  });
}

// Media Only Channels
export async function getMediaOnly(guildId) {
  return fetchApi(`/api/guilds/${guildId}/media_only`);
}

export async function addMediaOnly(guildId, payload) {
  return fetchApi(`/api/guilds/${guildId}/media_only`, {
    method: "POST",
    body: payload,
  });
}

export async function deleteMediaOnly(guildId, channelId) {
  return fetchApi(`/api/guilds/${guildId}/media_only/${channelId}`, {
    method: "DELETE",
  });
}

// Command Restrictions
export async function getCommands(guildId) {
  return fetchApi(`/api/guilds/${guildId}/commands`);
}

export async function toggleCommand(guildId, payload) {
  return fetchApi(`/api/guilds/${guildId}/commands/toggle`, {
    method: "POST",
    body: payload,
  });
}

// Sticky Message
export async function getSticky(guildId) {
  return fetchApi(`/api/guilds/${guildId}/sticky`);
}

export async function saveSticky(guildId, payload) {
  return fetchApi(`/api/guilds/${guildId}/sticky`, {
    method: "POST",
    body: payload,
  });
}

export async function deleteSticky(guildId, channelId) {
  return fetchApi(`/api/guilds/${guildId}/sticky/${channelId}`, {
    method: "DELETE",
  });
}

// Autoresponder
export async function getAutoresponders(guildId) {
  return fetchApi(`/api/guilds/${guildId}/autoresponder`);
}

export async function saveAutoresponder(guildId, payload) {
  return fetchApi(`/api/guilds/${guildId}/autoresponder`, {
    method: "POST",
    body: payload,
  });
}

export async function deleteAutoresponder(guildId, ruleId) {
  return fetchApi(`/api/guilds/${guildId}/autoresponder/${ruleId}`, {
    method: "DELETE",
  });
}

// General Server Config
export async function getConfig(guildId) {
  return fetchApi(`/api/guilds/${guildId}/config`);
}

export async function saveConfig(guildId, payload) {
  return fetchApi(`/api/guilds/${guildId}/config`, {
    method: "POST",
    body: payload,
  });
}

// Analytics
export async function getAnalytics(guildId) {
  return fetchApi(`/api/guilds/${guildId}/analytics`);
}
