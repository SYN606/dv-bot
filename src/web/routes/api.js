import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { Op } from "sequelize";
import { requireAuth, requireGuildAdmin } from "../middleware/auth.js";
import { verifySessionToken, fetchDiscordGuilds, createSessionToken } from "../auth.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { PROTECTED_COMMANDS } from "../../core/permissions.js";
import { ensureGuild } from "../../db/helpers/common.js";
import {
  VerificationConfig,
  ModerationLogConfig,
  VCRoleConfig,
  DailyActivitySnapshot,
} from "../../db/models/index.js";
import {
  getAdminRoles,
  addAdminRole,
  removeAdminRole,
} from "../../db/helpers/adminRoles.js";
import { getLeaderboard } from "../../db/helpers/analytics.js";
import {
  getMediaOnlyChannels,
  setMediaOnlyChannel,
  removeMediaOnlyChannel,
} from "../../db/helpers/mediaOnly.js";
import {
  getDisabledCommands,
  disableCommand,
  enableCommand,
} from "../../db/helpers/channelCommandRestrict.js";
import {
  getStickyMessage,
  setStickyMessage,
  removeStickyMessage,
} from "../../db/helpers/sticky.js";
import {
  getGuildAutoresponders,
  upsertAutoresponder,
  deleteAutoresponder,
  addResponderReaction,
} from "../../db/helpers/autoresponder.js";
import {
  getGuildAcl,
  addRoleRestriction,
  removeRoleRestriction,
  addChannelRestriction,
  removeChannelRestriction,
} from "../../db/helpers/acl.js";

export const apiRouter = new Hono();

// Helper to get real-time bot guild IDs
async function getLiveBotGuildIds(client) {
  if (!client?.guilds) return [];
  let ids = Array.from(client.guilds.cache.keys()).map(String);
  if (ids.length === 0 && typeof client.guilds.fetch === "function") {
    try {
      const fetched = await client.guilds.fetch();
      ids = Array.from(fetched.keys()).map(String);
    } catch (e) {
      console.error("[LIVE BOT GUILDS ERROR]:", e);
    }
  }
  return ids;
}

// Current User & Session Info
apiRouter.get("/me", async (c) => {
  const sessionCookie = getCookie(c, "dv_session");
  const session = verifySessionToken(sessionCookie);
  if (!session || !session.user) {
    return c.json({ user: null, guilds: [] });
  }

  const client = c.get("discordClient");
  const botGuildIds = await getLiveBotGuildIds(client);

  const guilds = (session.guilds || []).map((g) => {
    const isBotInGuild =
      botGuildIds.includes(String(g.id)) ||
      Boolean(client?.guilds?.cache?.has(String(g.id)));

    const perms = BigInt(g.permissions || "0");
    const canManage = Boolean(
      g.owner ||
      (perms & 8n) === 8n ||
      (perms & 32n) === 32n
    );

    return {
      ...g,
      botPresent: isBotInGuild,
      canManage,
    };
  });

  return c.json({
    user: session.user,
    guilds,
  });
});

// Sync / Refresh User Guilds from Discord API
apiRouter.post("/me/sync", async (c) => {
  const sessionCookie = getCookie(c, "dv_session");
  const session = verifySessionToken(sessionCookie);
  if (!session || !session.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const client = c.get("discordClient");
  const botGuildIds = await getLiveBotGuildIds(client);

  let updatedGuilds = session.guilds || [];
  if (session.accessToken) {
    try {
      const rawGuilds = await fetchDiscordGuilds(session.accessToken);
      updatedGuilds = rawGuilds.map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
        permissions: g.permissions,
        owner: g.owner,
      }));

      // Update session cookie with fresh Discord data
      const newSessionToken = createSessionToken({
        ...session,
        guilds: updatedGuilds,
      });

      setCookie(c, "dv_session", newSessionToken, {
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
        maxAge: 60 * 60 * 24 * 7,
      });
    } catch (err) {
      console.error("[SYNC SERVERS ERROR]:", err);
    }
  }

  const mappedGuilds = updatedGuilds.map((g) => {
    const isBotInGuild =
      botGuildIds.includes(String(g.id)) ||
      Boolean(client?.guilds?.cache?.has(String(g.id)));

    const perms = BigInt(g.permissions || "0");
    const canManage = Boolean(
      g.owner ||
      (perms & 8n) === 8n ||
      (perms & 32n) === 32n
    );

    return {
      ...g,
      botPresent: isBotInGuild,
      canManage,
    };
  });

  return c.json({
    user: session.user,
    guilds: mappedGuilds,
  });
});

// Bot Profile Metadata (Avatar PFP, Banner, Username, ID)
apiRouter.get("/bot", async (c) => {
  const client = c.get("discordClient");
  const botUser = client?.user;

  const botAvatar =
    botUser?.displayAvatarURL?.({ extension: "png", size: 256 }) ||
    (botUser?.avatar
      ? `https://cdn.discordapp.com/avatars/${botUser.id}/${botUser.avatar}.png`
      : "https://cdn.discordapp.com/embed/avatars/0.png");

  let botBanner = null;
  try {
    if (botUser?.banner) {
      botBanner = `https://cdn.discordapp.com/banners/${botUser.id}/${botUser.banner}.png?size=1024`;
    } else if (typeof botUser?.bannerURL === "function") {
      botBanner = botUser.bannerURL({ size: 1024 });
    }
  } catch {}

  const guildIds = await getLiveBotGuildIds(client);

  return c.json({
    id: botUser?.id || null,
    username: botUser?.username || "Digital Vigital",
    avatar: botAvatar,
    banner: botBanner,
    guildIds,
  });
});

apiRouter.use("/guilds/:guildId/*", requireAuth, requireGuildAdmin);

// 1. Guild Metadata (Channels & Roles)
apiRouter.get("/guilds/:guildId/meta", async (c) => {
  const botGuild = c.get("botGuild");
  if (!botGuild) {
    return c.json({ error: "Bot is not present in this server." }, 404);
  }

  const channels = botGuild.channels.cache
    .filter((ch) => ch.type === ChannelType.GuildText)
    .map((ch) => ({ id: ch.id, name: ch.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const botMember = botGuild?.members?.me;
  const roles = botGuild.roles.cache
    .filter((r) => r.id !== botGuild.id)
    .map((r) => ({
      id: r.id,
      name: r.name,
      color: r.hexColor,
      position: r.position,
      managed: r.managed,
      isAboveBot: botMember?.roles?.highest ? r.position >= botMember.roles.highest.position : false,
    }))
    .sort((a, b) => b.position - a.position);

  return c.json({ channels, roles });
});

// 2. Verification Setup
apiRouter.get("/guilds/:guildId/verification", async (c) => {
  const guildId = c.req.param("guildId");
  const config = await VerificationConfig.findByPk(guildId);
  const raw = config ? config.toJSON() : {};
  return c.json({
    ...raw,
    enabled: Boolean(raw.enabled),
    channelId: raw.verify_channel_id ? String(raw.verify_channel_id) : "",
    verifiedRoleId: raw.verified_role_id ? String(raw.verified_role_id) : "",
    unverifiedRoleId: raw.unverified_role_id ? String(raw.unverified_role_id) : "",
    logChannelId: raw.log_channel_id ? String(raw.log_channel_id) : "",
    mode: raw.mode || "button",
    minAccountAgeHours: Number(raw.min_account_age_hours || 0),
    embedTitle: raw.embed_title || "",
    embedDescription: raw.embed_description || "",
    buttonLabel: raw.button_label || "Verify Access",
    buttonEmoji: raw.button_emoji || "✅",
  });
});

apiRouter.post("/guilds/:guildId/verification", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json();
  const botGuild = c.get("botGuild");

  await ensureGuild(guildId);

  const [config] = await VerificationConfig.findOrCreate({
    where: { guild_id: guildId },
    defaults: { guild_id: guildId },
  });

  if (body.enabled !== undefined) config.enabled = Boolean(body.enabled);
  if (body.mode !== undefined) config.mode = String(body.mode);
  if (body.min_account_age_hours !== undefined || body.minAccountAgeHours !== undefined) {
    config.min_account_age_hours = Number(body.min_account_age_hours ?? body.minAccountAgeHours ?? 0);
  }
  if (body.embed_title !== undefined || body.embedTitle !== undefined) {
    config.embed_title = body.embed_title ?? body.embedTitle ?? null;
  }
  if (body.embed_description !== undefined || body.embedDescription !== undefined) {
    config.embed_description = body.embed_description ?? body.embedDescription ?? null;
  }
  if (body.button_label !== undefined || body.buttonLabel !== undefined) {
    config.button_label = body.button_label ?? body.buttonLabel ?? "Verify Access";
  }
  if (body.button_emoji !== undefined || body.buttonEmoji !== undefined) {
    config.button_emoji = body.button_emoji ?? body.buttonEmoji ?? "✅";
  }

  const channelId = body.channelId ?? body.verify_channel_id;
  if (channelId !== undefined) config.verify_channel_id = channelId || null;

  const verifiedRoleId = body.verifiedRoleId ?? body.verified_role_id;
  if (verifiedRoleId !== undefined) config.verified_role_id = verifiedRoleId || null;

  const unverifiedRoleId = body.unverifiedRoleId ?? body.unverified_role_id;
  if (unverifiedRoleId !== undefined) config.unverified_role_id = unverifiedRoleId || null;

  const logChannelId = body.logChannelId ?? body.log_channel_id;
  if (logChannelId !== undefined) config.log_channel_id = logChannelId || null;

  await config.save();

  // Deploy verification button panel if requested directly
  if (body.deployPanel && botGuild && config.verify_channel_id) {
    const channel = botGuild.channels.cache.get(String(config.verify_channel_id));
    if (channel && channel.send) {
      const embed = makeEmbed({
        title: config.embed_title || "Server Verification",
        description:
          config.embed_description ||
          `${EMOJIS.get("welcome") || "🛡️"} Welcome to **${botGuild.name}**!\n\n` +
          `To gain access to the rest of the server channels, please click the verification button below.`,
        level: "PRIMARY",
      });

      const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("verify_member_btn")
          .setLabel(config.button_label || "Verify Access")
          .setStyle(ButtonStyle.Success)
          .setEmoji(config.button_emoji || EMOJIS.get("success") || "✅")
      );

      await channel.send({ embeds: [embed], components: [button] }).catch(() => {});
    }
  }

  return c.json({ success: true, config });
});

apiRouter.post("/guilds/:guildId/verification/post_button", async (c) => {
  const guildId = c.req.param("guildId");
  const botGuild = c.get("botGuild");
  const config = await VerificationConfig.findByPk(guildId);

  if (!config || !config.verify_channel_id) {
    return c.json({ error: "Verification channel is not configured." }, 400);
  }

  const channel = botGuild?.channels.cache.get(String(config.verify_channel_id));
  if (!channel || !channel.send) {
    return c.json({ error: "Verification channel was not found or bot lacks send access." }, 404);
  }

  const title = config.embed_title || "Server Verification";
  const description =
    config.embed_description ||
    `${EMOJIS.get("welcome") || "🛡️"} Welcome to **${botGuild.name}**!\n\n` +
    `To gain access to the rest of the server channels, please click the verification button below.`;

  const embed = makeEmbed({
    title,
    description,
    level: "PRIMARY",
  });

  const button = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("verify_member_btn")
      .setLabel(config.button_label || "Verify Access")
      .setStyle(ButtonStyle.Success)
      .setEmoji(config.button_emoji || EMOJIS.get("success") || "✅")
  );

  await channel.send({ embeds: [embed], components: [button] });
  return c.json({ success: true, message: "Verification prompt posted to channel." });
});

// 3. Media-Only Channels Setup
apiRouter.get("/guilds/:guildId/media_only", async (c) => {
  const guildId = c.req.param("guildId");
  const channels = await getMediaOnlyChannels(guildId);
  return c.json(channels);
});

apiRouter.post("/guilds/:guildId/media_only", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json();
  const { channel_id, image_only, auto_mute, nsfw_bypass } = body;

  if (!channel_id) return c.json({ error: "channel_id is required" }, 400);

  const record = await setMediaOnlyChannel(guildId, channel_id, {
    image_only: !!image_only,
    auto_mute: !!auto_mute,
    nsfw_bypass: nsfw_bypass ?? true,
  });

  return c.json({ success: true, record });
});

apiRouter.delete("/guilds/:guildId/media_only/:channelId", async (c) => {
  const guildId = c.req.param("guildId");
  const channelId = c.req.param("channelId");
  const deleted = await removeMediaOnlyChannel(guildId, channelId);
  return c.json({ success: deleted });
});

// 4. Command Restrictions Setup
apiRouter.get("/guilds/:guildId/commands", async (c) => {
  const guildId = c.req.param("guildId");
  const channelId = c.req.query("channel_id");
  const client = c.get("discordClient");

  const allCommands = client
    ? Array.from(client.commands.values()).map((cmd) => ({
        name: cmd.name,
        description: cmd.description,
        category: cmd.category,
        isProtected: PROTECTED_COMMANDS.has(cmd.name.toLowerCase()),
      }))
    : [];

  let disabled = [];
  if (channelId) {
    disabled = await getDisabledCommands(guildId, channelId);
  }

  return c.json({ commands: allCommands, disabled });
});

apiRouter.post("/guilds/:guildId/commands/toggle", async (c) => {
  const guildId = c.req.param("guildId");
  const { channel_id, command_name, enable } = await c.req.json();

  if (!channel_id || !command_name) {
    return c.json({ error: "channel_id and command_name are required" }, 400);
  }

  if (PROTECTED_COMMANDS.has(command_name.toLowerCase())) {
    return c.json({ error: "Protected commands cannot be disabled." }, 400);
  }

  if (enable) {
    await enableCommand(guildId, channel_id, command_name);
  } else {
    await disableCommand(guildId, channel_id, command_name);
  }

  return c.json({ success: true, enabled: !!enable });
});

// 5. Sticky Messages
apiRouter.get("/guilds/:guildId/sticky/:channelId", async (c) => {
  const guildId = c.req.param("guildId");
  const channelId = c.req.param("channelId");
  const record = await getStickyMessage(guildId, channelId);
  return c.json(record || {});
});

apiRouter.post("/guilds/:guildId/sticky", async (c) => {
  const guildId = c.req.param("guildId");
  const { channel_id, content } = await c.req.json();

  if (!channel_id || !content) {
    return c.json({ error: "channel_id and content are required" }, 400);
  }

  const record = await setStickyMessage(guildId, channel_id, content);
  return c.json({ success: true, record });
});

apiRouter.delete("/guilds/:guildId/sticky/:channelId", async (c) => {
  const guildId = c.req.param("guildId");
  const channelId = c.req.param("channelId");
  const deleted = await removeStickyMessage(guildId, channelId);
  return c.json({ success: deleted });
});

// 6. Autoresponders
apiRouter.get("/guilds/:guildId/autoresponder", async (c) => {
  const guildId = c.req.param("guildId");
  const responders = await getGuildAutoresponders(guildId);
  return c.json(responders);
});

apiRouter.post("/guilds/:guildId/autoresponder", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json();
  const { trigger_phrase, match_type, reply_content, is_embed, embed_title, emoji_reactions, cooldown, delete_trigger } = body;

  if (!trigger_phrase || !reply_content) {
    return c.json({ error: "trigger_phrase and reply_content are required" }, 400);
  }

  const responder = await upsertAutoresponder(guildId, {
    trigger_phrase,
    match_type: match_type || "contains",
    reply_content,
    is_embed: !!is_embed,
    embed_title: embed_title || null,
    cooldown: Number(cooldown) || 0,
    delete_trigger: !!delete_trigger,
  });

  if (Array.isArray(emoji_reactions)) {
    for (const em of emoji_reactions) {
      if (em.trim()) await addResponderReaction(responder.responder_id, em.trim());
    }
  }

  return c.json({ success: true, responder });
});

apiRouter.delete("/guilds/:guildId/autoresponder/:id", async (c) => {
  const guildId = c.req.param("guildId");
  const id = c.req.param("id");
  const deleted = await deleteAutoresponder(guildId, id);
  return c.json({ success: deleted > 0 });
});

// 7. Modlog & VC Role Config
apiRouter.get("/guilds/:guildId/config", async (c) => {
  const guildId = c.req.param("guildId");
  const [modlog, vcrole] = await Promise.all([
    ModerationLogConfig.findByPk(guildId),
    VCRoleConfig.findByPk(guildId),
  ]);
  return c.json({ modlog, vcrole });
});

apiRouter.post("/guilds/:guildId/config", async (c) => {
  const guildId = c.req.param("guildId");
  const { log_channel_id, vc_role_id } = await c.req.json();

  if (log_channel_id !== undefined) {
    if (log_channel_id) {
      await ModerationLogConfig.upsert({ guild_id: guildId, channel_id: log_channel_id, enabled: true });
    } else {
      await ModerationLogConfig.destroy({ where: { guild_id: guildId } });
    }
  }

  if (vc_role_id !== undefined) {
    if (vc_role_id) {
      await VCRoleConfig.upsert({ guild_id: guildId, role_id: vc_role_id });
    } else {
      await VCRoleConfig.destroy({ where: { guild_id: guildId } });
    }
  }

  return c.json({ success: true });
});

// 8. Admin Roles Management
apiRouter.get("/guilds/:guildId/admin_roles", async (c) => {
  const guildId = c.req.param("guildId");
  const botGuild = c.get("botGuild");
  const roleIds = await getAdminRoles(guildId);

  const roles = roleIds.map((rId) => {
    const r = botGuild?.roles.cache.get(rId);
    return {
      id: rId,
      name: r?.name || `Role ${rId}`,
      color: r?.hexColor || "#99aab5",
    };
  });

  return c.json({ adminRoles: roles });
});

apiRouter.post("/guilds/:guildId/admin_roles", async (c) => {
  const guildId = c.req.param("guildId");
  const { role_id } = await c.req.json();

  if (!role_id) {
    return c.json({ error: "role_id is required" }, 400);
  }

  const created = await addAdminRole(guildId, role_id);
  return c.json({ success: true, created });
});

apiRouter.delete("/guilds/:guildId/admin_roles/:roleId", async (c) => {
  const guildId = c.req.param("guildId");
  const roleId = c.req.param("roleId");

  const removed = await removeAdminRole(guildId, roleId);
  return c.json({ success: removed });
});

// 9. Analytics Telemetry & Leaderboards
apiRouter.get("/guilds/:guildId/analytics", async (c) => {
  const guildId = c.req.param("guildId");
  const botGuild = c.get("botGuild");

  // Get last 7 days of dates (YYYY-MM-DD)
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }

  // Fetch daily snapshots
  const snapshots = await DailyActivitySnapshot.findAll({
    where: {
      guild_id: String(guildId),
      date: { [Op.in]: days },
    },
    order: [["date", "ASC"]],
  });

  const snapshotMap = new Map(snapshots.map((s) => [s.date, s]));
  const timeline = days.map((date) => {
    const s = snapshotMap.get(date);
    return {
      date,
      messages: Number(s?.total_messages || 0),
      vc_minutes: Math.round(Number(s?.total_vc_seconds || 0) / 60),
      voiceMinutes: Math.round(Number(s?.total_vc_seconds || 0) / 60),
      joins: Number(s?.joins_count || 0),
      leaves: Number(s?.leaves_count || 0),
    };
  });

  // Top Chatters & Top Voice Members
  const [topChattersRaw, topVoiceRaw] = await Promise.all([
    getLeaderboard(guildId, "messages", "total", 5),
    getLeaderboard(guildId, "vc", "total", 5),
  ]);

  const topChatters = topChattersRaw.map((m) => {
    const member = botGuild?.members.cache.get(String(m.user_id));
    return {
      userId: String(m.user_id),
      username: member?.user?.username || `User ${m.user_id}`,
      avatar: member?.user?.displayAvatarURL?.() || null,
      messages: Number(m.total_messages || 0),
      count: Number(m.total_messages || 0),
    };
  });

  const topVoice = topVoiceRaw.map((m) => {
    const member = botGuild?.members.cache.get(String(m.user_id));
    return {
      userId: String(m.user_id),
      username: member?.user?.username || `User ${m.user_id}`,
      avatar: member?.user?.displayAvatarURL?.() || null,
      vcMinutes: Math.round(Number(m.total_vc_seconds || 0) / 60),
      minutes: Math.round(Number(m.total_vc_seconds || 0) / 60),
    };
  });

  return c.json({ timeline, topChatters, topVoice });
});

// 10. Access Control List (ACL)
apiRouter.get("/guilds/:guildId/acl", async (c) => {
  const guildId = c.req.param("guildId");
  const acl = await getGuildAcl(guildId);
  return c.json(acl);
});

apiRouter.post("/guilds/:guildId/acl/roles", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json();
  const { roleId, feature = "all", restrictionType = "deny" } = body;
  if (!roleId) return c.json({ error: "roleId is required" }, 400);

  const result = await addRoleRestriction(guildId, roleId, feature, restrictionType);
  return c.json({ success: true, ...result });
});

apiRouter.delete("/guilds/:guildId/acl/roles/:id", async (c) => {
  const guildId = c.req.param("guildId");
  const id = c.req.param("id");
  const deleted = await removeRoleRestriction(guildId, id);
  return c.json({ success: deleted });
});

apiRouter.post("/guilds/:guildId/acl/channels", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json();
  const { channelId, feature = "all", restrictionType = "deny" } = body;
  if (!channelId) return c.json({ error: "channelId is required" }, 400);

  const result = await addChannelRestriction(guildId, channelId, feature, restrictionType);
  return c.json({ success: true, ...result });
});

apiRouter.delete("/guilds/:guildId/acl/channels/:id", async (c) => {
  const guildId = c.req.param("guildId");
  const id = c.req.param("id");
  const deleted = await removeChannelRestriction(guildId, id);
  return c.json({ success: deleted });
});
