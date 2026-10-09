import {
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} from "discord.js";
import { recordHistory, updateHistoryStatus, deleteHistoryEntry } from "../db/helpers/messageStudio.js";
import { logger } from "../utils/logger.js";

// Discord Constraints
export const LIMITS = {
  MAX_CONTENT_LENGTH: 2000,
  MAX_EMBEDS_COUNT: 10,
  MAX_TOTAL_EMBED_CHARS: 6000,
  MAX_EMBED_TITLE_LENGTH: 256,
  MAX_EMBED_DESCRIPTION_LENGTH: 4096,
  MAX_EMBED_FIELDS_COUNT: 25,
  MAX_FIELD_NAME_LENGTH: 256,
  MAX_FIELD_VALUE_LENGTH: 1024,
  MAX_FOOTER_TEXT_LENGTH: 2048,
  MAX_AUTHOR_NAME_LENGTH: 256,
  MAX_ATTACHMENTS_COUNT: 10,
};

// In-flight idempotency cache: key -> timestamp (expires in 10s)
const idempotencyCache = new Map();
function checkIdempotency(key) {
  if (!key) return false;
  const now = Date.now();
  if (idempotencyCache.has(key)) {
    const ts = idempotencyCache.get(key);
    if (now - ts < 10000) {
      return true; // Duplicate detected
    }
  }
  idempotencyCache.set(key, now);
  // Housekeep cache if needed
  if (idempotencyCache.size > 2000) {
    const cutoff = now - 10000;
    for (const [k, v] of idempotencyCache.entries()) {
      if (v < cutoff) idempotencyCache.delete(k);
    }
  }
  return false;
}

// URL Safety Validator
const SAFE_URL_REGEX = /^(https?:\/\/|attachment:\/\/)[^\s$.?#].[^\s]*$/i;
export function isSafeUrl(url) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.length > 2048) return false;
  return SAFE_URL_REGEX.test(trimmed);
}

// Hex color to integer (e.g. "#5865F2" -> 0x5865F2)
export function parseColor(colorInput) {
  if (!colorInput) return null;
  if (typeof colorInput === "number") return colorInput;
  let str = String(colorInput).trim().replace(/^#/, "");
  if (!/^[0-9A-Fa-f]{6}$/.test(str)) return null;
  return parseInt(str, 16);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Message Validation
// ─────────────────────────────────────────────────────────────────────────────

export function validateMessage(payload) {
  const errors = [];
  const mode = ["normal", "embed", "hybrid"].includes(payload.mode)
    ? payload.mode
    : "normal";

  const content = String(payload.content || "").trim();
  const rawEmbeds = Array.isArray(payload.embeds) ? payload.embeds : [];
  const rawAttachments = Array.isArray(payload.attachments) ? payload.attachments : [];

  // Content length check
  if (content.length > LIMITS.MAX_CONTENT_LENGTH) {
    errors.push(
      `Message content exceeds the maximum limit of ${LIMITS.MAX_CONTENT_LENGTH} characters (currently ${content.length}).`
    );
  }

  // Embeds count check
  if (rawEmbeds.length > LIMITS.MAX_EMBEDS_COUNT) {
    errors.push(
      `Message has ${rawEmbeds.length} embeds, but Discord allows a maximum of ${LIMITS.MAX_EMBEDS_COUNT}.`
    );
  }

  // Attachments check
  if (rawAttachments.length > LIMITS.MAX_ATTACHMENTS_COUNT) {
    errors.push(
      `Message has ${rawAttachments.length} attachments, but maximum allowed is ${LIMITS.MAX_ATTACHMENTS_COUNT}.`
    );
  }

  for (let i = 0; i < rawAttachments.length; i++) {
    const att = rawAttachments[i];
    const url = typeof att === "string" ? att : att?.url;
    if (url && !isSafeUrl(url)) {
      errors.push(`Attachment #${i + 1} URL must be a valid HTTP/HTTPS web address.`);
    }
  }

  // Embed validation & character sum
  let totalEmbedCharacters = 0;
  const activeEmbeds = rawEmbeds.slice(0, LIMITS.MAX_EMBEDS_COUNT);

  activeEmbeds.forEach((emb, index) => {
    const idx = index + 1;
    let embedChars = 0;

    // Title
    const title = String(emb.title || "").trim();
    if (title.length > LIMITS.MAX_EMBED_TITLE_LENGTH) {
      errors.push(
        `Embed #${idx} title exceeds ${LIMITS.MAX_EMBED_TITLE_LENGTH} characters.`
      );
    }
    embedChars += title.length;

    // Title URL
    if (emb.url && !isSafeUrl(emb.url)) {
      errors.push(`Embed #${idx} title URL is invalid.`);
    }

    // Description
    const desc = String(emb.description || "").trim();
    if (desc.length > LIMITS.MAX_EMBED_DESCRIPTION_LENGTH) {
      errors.push(
        `Embed #${idx} description exceeds ${LIMITS.MAX_EMBED_DESCRIPTION_LENGTH} characters.`
      );
    }
    embedChars += desc.length;

    // Author
    if (emb.author?.name) {
      const aName = String(emb.author.name).trim();
      if (aName.length > LIMITS.MAX_AUTHOR_NAME_LENGTH) {
        errors.push(
          `Embed #${idx} author name exceeds ${LIMITS.MAX_AUTHOR_NAME_LENGTH} characters.`
        );
      }
      embedChars += aName.length;
    }
    if (emb.author?.url && !isSafeUrl(emb.author.url)) {
      errors.push(`Embed #${idx} author URL is invalid.`);
    }
    if (emb.author?.icon_url && !isSafeUrl(emb.author.icon_url)) {
      errors.push(`Embed #${idx} author icon URL is invalid.`);
    }

    // Footer
    if (emb.footer?.text) {
      const fText = String(emb.footer.text).trim();
      if (fText.length > LIMITS.MAX_FOOTER_TEXT_LENGTH) {
        errors.push(
          `Embed #${idx} footer text exceeds ${LIMITS.MAX_FOOTER_TEXT_LENGTH} characters.`
        );
      }
      embedChars += fText.length;
    }
    if (emb.footer?.icon_url && !isSafeUrl(emb.footer.icon_url)) {
      errors.push(`Embed #${idx} footer icon URL is invalid.`);
    }

    // Media
    if (emb.thumbnail?.url && !isSafeUrl(emb.thumbnail.url)) {
      errors.push(`Embed #${idx} thumbnail URL is invalid.`);
    }
    if (emb.image?.url && !isSafeUrl(emb.image.url)) {
      errors.push(`Embed #${idx} image URL is invalid.`);
    }

    // Fields
    const fields = Array.isArray(emb.fields) ? emb.fields : [];
    if (fields.length > LIMITS.MAX_EMBED_FIELDS_COUNT) {
      errors.push(
        `Embed #${idx} has ${fields.length} fields (max allowed is ${LIMITS.MAX_EMBED_FIELDS_COUNT}).`
      );
    }

    fields.forEach((f, fIdx) => {
      const fNum = fIdx + 1;
      const fName = String(f?.name || "").trim();
      const fVal = String(f?.value || "").trim();

      if (!fName && fVal) {
        errors.push(`Embed #${idx} field #${fNum} requires a name.`);
      }
      if (fName && !fVal) {
        errors.push(`Embed #${idx} field #${fNum} requires a value.`);
      }
      if (fName.length > LIMITS.MAX_FIELD_NAME_LENGTH) {
        errors.push(
          `Embed #${idx} field #${fNum} name exceeds ${LIMITS.MAX_FIELD_NAME_LENGTH} characters.`
        );
      }
      if (fVal.length > LIMITS.MAX_FIELD_VALUE_LENGTH) {
        errors.push(
          `Embed #${idx} field #${fNum} value exceeds ${LIMITS.MAX_FIELD_VALUE_LENGTH} characters.`
        );
      }
      embedChars += fName.length + fVal.length;
    });

    totalEmbedCharacters += embedChars;
  });

  if (totalEmbedCharacters > LIMITS.MAX_TOTAL_EMBED_CHARS) {
    errors.push(
      `Total character count across all embeds is ${totalEmbedCharacters}, exceeding Discord's 6,000 character limit.`
    );
  }

  // Mode validation
  if (mode === "normal") {
    if (!content && rawAttachments.length === 0) {
      errors.push("Normal mode requires message content or an attachment.");
    }
  } else if (mode === "embed") {
    if (activeEmbeds.length === 0) {
      errors.push("Embed mode requires at least one configured embed.");
    } else {
      const hasAnyEmbedContent = activeEmbeds.some((e) => {
        return (
          e.title ||
          e.description ||
          (e.fields && e.fields.length > 0) ||
          e.image?.url ||
          e.thumbnail?.url ||
          e.author?.name ||
          e.footer?.text
        );
      });
      if (!hasAnyEmbedContent) {
        errors.push("Embeds cannot be completely empty. Add a title, description, image, or fields.");
      }
    }
  } else if (mode === "hybrid") {
    const hasAnyContent = content.length > 0 || rawAttachments.length > 0;
    const hasAnyEmbed = activeEmbeds.some((e) => {
      return (
        e.title ||
        e.description ||
        (e.fields && e.fields.length > 0) ||
        e.image?.url ||
        e.thumbnail?.url ||
        e.author?.name ||
        e.footer?.text
      );
    });
    if (!hasAnyContent && !hasAnyEmbed) {
      errors.push("Hybrid mode requires text content or at least one non-empty embed.");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Mention Placeholder Transformation & Reply URL Parsing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Transforms user-friendly mention syntax into raw Discord mentions:
 * - User Mentions: {USER_ID}, {user:USER_ID}, {@USER_ID} -> <@USER_ID>
 * - Channel Mentions: {#CHANNEL_ID}, {channel:CHANNEL_ID} -> <#CHANNEL_ID>
 * - Role Mentions: {@&ROLE_ID}, {role:ROLE_ID} -> <@&ROLE_ID>
 */
export function transformMentionPlaceholders(text) {
  if (!text || typeof text !== "string") return text;
  return text
    // Replace {channel:123456789012345678} or {#123456789012345678} with <#123456789012345678>
    .replace(/\{(?:channel:|#)(\d{16,22})\}/gi, "<#$1>")
    // Replace {role:123456789012345678} or {@&123456789012345678} with <@&123456789012345678>
    .replace(/\{(?:role:|@&)(\d{16,22})\}/gi, "<@&$1>")
    // Replace {123456789012345678}, {user:123456789012345678}, or {@123456789012345678} with <@123456789012345678>
    .replace(/\{(?:user:|@)?(\d{16,22})\}/gi, "<@$1>");
}

export function parseReplyUrl(url) {
  if (!url || typeof url !== "string") return null;
  // Clean whitespace, markdown < > enclosure, and query parameters / fragments
  const clean = url.trim().replace(/^<|>$/g, "").split(/[?#]/)[0].trim();
  if (!clean) return null;

  // 1. Full Discord URL: https://(canary.|ptb.)discord(app).com/channels/guild/channel/message
  const fullUrlMatch = clean.match(
    /^https?:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/channels\/(\d+)\/(\d+)\/(\d+)\/?$/i
  );
  if (fullUrlMatch) {
    return {
      guildId: fullUrlMatch[1],
      channelId: fullUrlMatch[2],
      messageId: fullUrlMatch[3],
    };
  }

  // If it begins with http:// or https:// and was not a valid Discord link, reject it
  if (/^https?:\/\//i.test(clean)) {
    return null;
  }

  // 2. Bare path: channels/guild/channel/message or guild/channel/message
  const bareMatch = clean.match(/^(?:channels\/)?(\d{15,22})\/(\d{15,22})\/(\d{15,22})\/?$/i);
  if (bareMatch) {
    return {
      guildId: bareMatch[1],
      channelId: bareMatch[2],
      messageId: bareMatch[3],
    };
  }

  // 3. Partial bare path: channel/message
  const partialMatch = clean.match(/^(?:channels\/@me\/)?(\d{15,22})\/(\d{15,22})\/?$/i);
  if (partialMatch) {
    return {
      guildId: null,
      channelId: partialMatch[1],
      messageId: partialMatch[2],
    };
  }

  return null;
}

export async function verifyAndFetchReply(client, currentGuildId, replyInput) {
  let parsed = null;
  if (typeof replyInput === "string") {
    parsed = parseReplyUrl(replyInput);
    if (!parsed) {
      try {
        const obj = JSON.parse(replyInput);
        if (typeof obj === "object" && obj !== null) {
          replyInput = obj;
        }
      } catch {}
    }
  }

  if (replyInput && typeof replyInput === "object") {
    // If replyInput contains a message_url / messageUrl string, parse that
    if (replyInput.message_url || replyInput.messageUrl) {
      parsed = parseReplyUrl(replyInput.message_url || replyInput.messageUrl);
    }
    // Support snake_case or camelCase properties directly from stored reply_config
    if (!parsed) {
      const gId = replyInput.guildId || replyInput.guild_id || currentGuildId;
      const cId = replyInput.channelId || replyInput.channel_id;
      const mId = replyInput.messageId || replyInput.message_id;
      if (cId && mId) {
        parsed = {
          guildId: gId ? String(gId) : null,
          channelId: String(cId),
          messageId: String(mId),
        };
      }
    }
  }

  // Default missing guildId to currentGuildId if available
  if (parsed && !parsed.guildId && currentGuildId) {
    parsed.guildId = String(currentGuildId);
  }

  if (!parsed || !parsed.guildId || !parsed.channelId || !parsed.messageId) {
    return {
      valid: false,
      error: "Invalid Discord message link format. Expected: https://discord.com/channels/GUILD_ID/CHANNEL_ID/MESSAGE_ID",
    };
  }

  if (String(parsed.guildId) !== String(currentGuildId)) {
    return {
      valid: false,
      error: "The referenced message is from another server. Messages can only reply within the current server.",
    };
  }

  const guild = client.guilds.cache.get(String(currentGuildId)) ||
    (await client.guilds.fetch(String(currentGuildId)).catch(() => null));

  if (!guild) {
    return { valid: false, error: "Bot cannot access the server." };
  }

  const channel = guild.channels.cache.get(String(parsed.channelId)) ||
    (await guild.channels.fetch(String(parsed.channelId)).catch(() => null));

  if (!channel || !channel.isTextBased?.()) {
    return { valid: false, error: "The referenced channel was not found or is not accessible." };
  }

  const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
  if (botMember && channel.permissionsFor) {
    const perms = channel.permissionsFor(botMember);
    if (!perms.has(PermissionFlagsBits.ViewChannel) || !perms.has(PermissionFlagsBits.ReadMessageHistory)) {
      return {
        valid: false,
        error: "Bot lacks View Channel or Read Message History permissions in the referenced channel.",
      };
    }
  }

  try {
    const message = await channel.messages.fetch(String(parsed.messageId)).catch(() => null);
    if (!message) {
      return {
        valid: false,
        error: "Referenced message not found (it may have been deleted).",
      };
    }

    const snippet = message.content
      ? (message.content.length > 150 ? message.content.slice(0, 150) + "..." : message.content)
      : (message.embeds?.length > 0 ? "[Embed Message]" : (message.attachments?.size > 0 ? "[Attachment]" : "[No Content]"));

    return {
      valid: true,
      messageId: message.id,
      channelId: channel.id,
      channelName: channel.name,
      guildId: guild.id,
      author: {
        id: message.author.id,
        username: message.author.username,
        tag: message.author.tag || message.author.username,
        avatar: message.author.displayAvatarURL ? message.author.displayAvatarURL() : null,
        bot: message.author.bot,
      },
      contentSnippet: snippet,
      createdAt: message.createdAt.toISOString(),
      url: message.url,
    };
  } catch (err) {
    return {
      valid: false,
      error: `Failed to fetch referenced message: ${err.message}`,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Serialization to Discord Payload
// ─────────────────────────────────────────────────────────────────────────────

export function serializeToDiscordPayload(payload) {
  const mode = payload.mode || "normal";
  const discordOptions = {};

  // 1. Content
  if (mode === "normal" || mode === "hybrid") {
    if (payload.content && String(payload.content).trim()) {
      discordOptions.content = transformMentionPlaceholders(String(payload.content).trim());
    }
  }

  // 2. Embeds
  if (mode === "embed" || mode === "hybrid") {
    const rawEmbeds = Array.isArray(payload.embeds) ? payload.embeds : [];
    if (rawEmbeds.length > 0) {
      discordOptions.embeds = rawEmbeds
        .slice(0, LIMITS.MAX_EMBEDS_COUNT)
        .map((e) => {
          const eb = new EmbedBuilder();

          if (e.title && String(e.title).trim()) {
            eb.setTitle(
              transformMentionPlaceholders(String(e.title).trim().slice(0, LIMITS.MAX_EMBED_TITLE_LENGTH))
            );
          }
          if (e.url && isSafeUrl(e.url)) {
            eb.setURL(e.url.trim());
          }
          if (e.description && String(e.description).trim()) {
            eb.setDescription(
              transformMentionPlaceholders(String(e.description).trim().slice(0, LIMITS.MAX_EMBED_DESCRIPTION_LENGTH))
            );
          }

          const parsedCol = parseColor(e.color);
          if (parsedCol !== null) {
            eb.setColor(parsedCol);
          }

          if (e.author?.name && String(e.author.name).trim()) {
            const authorOpts = {
              name: transformMentionPlaceholders(
                String(e.author.name).trim().slice(0, LIMITS.MAX_AUTHOR_NAME_LENGTH)
              ),
            };
            if (e.author.icon_url && isSafeUrl(e.author.icon_url)) {
              authorOpts.iconURL = e.author.icon_url.trim();
            }
            if (e.author.url && isSafeUrl(e.author.url)) {
              authorOpts.url = e.author.url.trim();
            }
            eb.setAuthor(authorOpts);
          }

          if (e.footer?.text && String(e.footer.text).trim()) {
            const footerOpts = {
              text: transformMentionPlaceholders(
                String(e.footer.text).trim().slice(0, LIMITS.MAX_FOOTER_TEXT_LENGTH)
              ),
            };
            if (e.footer.icon_url && isSafeUrl(e.footer.icon_url)) {
              footerOpts.iconURL = e.footer.icon_url.trim();
            }
            eb.setFooter(footerOpts);
          }

          if (e.thumbnail?.url && isSafeUrl(e.thumbnail.url)) {
            eb.setThumbnail(e.thumbnail.url.trim());
          }
          if (e.image?.url && isSafeUrl(e.image.url)) {
            eb.setImage(e.image.url.trim());
          }

          if (e.timestamp) {
            if (e.timestamp === true || e.timestamp === "now") {
              eb.setTimestamp(new Date());
            } else {
              const d = new Date(e.timestamp);
              if (!isNaN(d.getTime())) {
                eb.setTimestamp(d);
              }
            }
          }

          if (Array.isArray(e.fields) && e.fields.length > 0) {
            const validFields = e.fields
              .slice(0, LIMITS.MAX_EMBED_FIELDS_COUNT)
              .filter((f) => f && f.name && f.value)
              .map((f) => ({
                name: transformMentionPlaceholders(
                  String(f.name).trim().slice(0, LIMITS.MAX_FIELD_NAME_LENGTH)
                ),
                value: transformMentionPlaceholders(
                  String(f.value).trim().slice(0, LIMITS.MAX_FIELD_VALUE_LENGTH)
                ),
                inline: Boolean(f.inline),
              }));
            if (validFields.length > 0) {
              eb.addFields(validFields);
            }
          }

          return eb;
        })
        .filter((eb) => {
          const data = eb.toJSON();
          return Object.keys(data).length > 0;
        });
    }
  }

  // 3. Attachments
  const rawAttachments = Array.isArray(payload.attachments) ? payload.attachments : [];
  const safeFiles = rawAttachments
    .map((att) => (typeof att === "string" ? att : att?.url))
    .filter((url) => isSafeUrl(url));

  if (safeFiles.length > 0) {
    discordOptions.files = safeFiles;
  }

  // 4. Allowed Mentions
  const mentionConfig = payload.mention_config || payload.mentionConfig || {};
  const allowed = { parse: [] };

  // By default allow users unless explicitly set to false, so user pings trigger notification
  const allowUsers = mentionConfig.allowUsers !== undefined ? Boolean(mentionConfig.allowUsers) : true;
  if (allowUsers || mentionConfig.parseUsers) allowed.parse.push("users");
  if (mentionConfig.allowRoles || mentionConfig.parseRoles) allowed.parse.push("roles");
  if (mentionConfig.allowEveryone || mentionConfig.parseEveryone) allowed.parse.push("everyone");

  if (Array.isArray(mentionConfig.users) && mentionConfig.users.length > 0) {
    allowed.users = mentionConfig.users;
  }
  if (Array.isArray(mentionConfig.roles) && mentionConfig.roles.length > 0) {
    allowed.roles = mentionConfig.roles;
  }

  // Reply mention setting
  const replyConfig = payload.reply_config || payload.replyConfig || {};
  allowed.repliedUser = Boolean(replyConfig.mention_user ?? replyConfig.mentionUser);
  discordOptions.allowedMentions = allowed;

  // 5. Reply Reference
  const replyMsgId = replyConfig.message_id || replyConfig.messageId;
  if (replyConfig.enabled && replyMsgId) {
    discordOptions.reply = {
      messageReference: String(replyMsgId),
      failIfNotExists: false,
    };
  }

  return discordOptions;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Channel Permission Checks
// ─────────────────────────────────────────────────────────────────────────────

export function checkChannelPermissions(channel, botMember, { hasEmbeds = false, hasAttachments = false, hasReply = false } = {}) {
  const missing = [];
  if (!channel || !botMember || !channel.permissionsFor) {
    return { ok: false, missing: ["Permissions could not be computed"] };
  }

  const perms = channel.permissionsFor(botMember);

  if (!perms.has(PermissionFlagsBits.ViewChannel)) missing.push("View Channel");
  if (!perms.has(PermissionFlagsBits.SendMessages)) missing.push("Send Messages");
  if (hasEmbeds && !perms.has(PermissionFlagsBits.EmbedLinks)) missing.push("Embed Links");
  if (hasAttachments && !perms.has(PermissionFlagsBits.AttachFiles)) missing.push("Attach Files");
  if (hasReply && !perms.has(PermissionFlagsBits.ReadMessageHistory)) missing.push("Read Message History");

  return {
    ok: missing.length === 0,
    missing,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Message Publishing
// ─────────────────────────────────────────────────────────────────────────────

export async function publishMessage({
  client,
  guildId,
  channelId,
  userId,
  payload,
  sourceType = "direct",
  sourceId = null,
  idempotencyKey = null,
}) {
  // Idempotency check
  if (idempotencyKey && checkIdempotency(idempotencyKey)) {
    return {
      success: false,
      error: "Duplicate submission ignored. The message is already being published.",
    };
  }

  // 1. Validate payload
  const validation = validateMessage(payload);
  if (!validation.isValid) {
    return {
      success: false,
      error: `Validation error(s): ${validation.errors.join(" ")}`,
      errors: validation.errors,
    };
  }

  // 2. Fetch Guild and Channel
  const gId = String(guildId);
  const cId = String(channelId);

  const guild = client.guilds.cache.get(gId) || (await client.guilds.fetch(gId).catch(() => null));
  if (!guild) {
    return { success: false, error: "Server not found or bot is disconnected." };
  }

  const channel = guild.channels.cache.get(cId) || (await guild.channels.fetch(cId).catch(() => null));
  if (!channel || !channel.isTextBased?.()) {
    return { success: false, error: "Target channel not found or cannot receive messages." };
  }

  const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
  const hasEmbeds = (payload.mode === "embed" || payload.mode === "hybrid") && Array.isArray(payload.embeds) && payload.embeds.length > 0;
  const hasAttachments = Array.isArray(payload.attachments) && payload.attachments.length > 0;
  const hasReply = Boolean(payload.reply_config?.enabled && payload.reply_config?.message_id);

  const permCheck = checkChannelPermissions(channel, botMember, { hasEmbeds, hasAttachments, hasReply });
  if (!permCheck.ok) {
    return {
      success: false,
      error: `Bot is missing required Discord permissions in #${channel.name}: ${permCheck.missing.join(", ")}`,
    };
  }

  // 3. Validate Reply Reference if present
  if (hasReply) {
    const replyValidation = await verifyAndFetchReply(client, gId, payload.reply_config);
    if (!replyValidation.valid) {
      return {
        success: false,
        error: `Reply target failed: ${replyValidation.error}`,
      };
    }
  }

  // 4. Serialize Discord Payload
  const discordPayload = serializeToDiscordPayload(payload);

  // 5. Dispatch message to Discord
  let sentMessage = null;
  try {
    sentMessage = await channel.send(discordPayload);
  } catch (err) {
    logger.error(`[MessageStudio] Failed to send message in guild ${gId} channel ${cId}:`, err);
    await recordHistory(gId, {
      guild_id: gId,
      channel_id: cId,
      user_id: userId,
      source_type: sourceType,
      source_id: sourceId,
      payload,
      status: "failed",
      error_message: err.message,
    }).catch(() => {});

    return {
      success: false,
      error: `Discord API error: ${err.message}`,
    };
  }

  // 6. Record Delivery in History
  const historyRecord = await recordHistory(gId, {
    guild_id: gId,
    message_id: sentMessage.id,
    channel_id: cId,
    user_id: userId,
    source_type: sourceType,
    source_id: sourceId,
    payload,
    status: "delivered",
  });

  return {
    success: true,
    messageId: sentMessage.id,
    channelId: channel.id,
    channelName: channel.name,
    historyId: historyRecord?.id,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Edit Published Message
// ─────────────────────────────────────────────────────────────────────────────

export async function editPublishedMessage({
  client,
  guildId,
  channelId,
  messageId,
  payload,
}) {
  const validation = validateMessage(payload);
  if (!validation.isValid) {
    return {
      success: false,
      error: `Validation error(s): ${validation.errors.join(" ")}`,
    };
  }

  const gId = String(guildId);
  const cId = String(channelId);
  const mId = String(messageId);

  const guild = client.guilds.cache.get(gId) || (await client.guilds.fetch(gId).catch(() => null));
  if (!guild) return { success: false, error: "Server not found." };

  const channel = guild.channels.cache.get(cId) || (await guild.channels.fetch(cId).catch(() => null));
  if (!channel || !channel.isTextBased?.()) {
    return { success: false, error: "Channel not found." };
  }

  let message = null;
  try {
    message = await channel.messages.fetch(mId);
  } catch (err) {
    return { success: false, error: `Message not found or deleted: ${err.message}` };
  }

  if (message.author.id !== client.user.id) {
    return {
      success: false,
      error: "You can only edit messages sent by this bot.",
    };
  }

  const discordPayload = serializeToDiscordPayload(payload);
  // Do not reply when editing
  delete discordPayload.reply;

  try {
    await message.edit(discordPayload);
    await updateHistoryStatus(gId, mId, "edited").catch(() => {});
    return {
      success: true,
      messageId: message.id,
    };
  } catch (err) {
    return {
      success: false,
      error: `Failed to edit message: ${err.message}`,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Delete Published Message
// ─────────────────────────────────────────────────────────────────────────────

export async function deletePublishedMessage({
  client,
  guildId,
  channelId,
  messageId,
  removeFromHistory = false,
}) {
  const gId = String(guildId);
  const cId = String(channelId);
  const mId = String(messageId);

  const guild = client.guilds.cache.get(gId) || (await client.guilds.fetch(gId).catch(() => null));
  if (!guild) return { success: false, error: "Server not found." };

  const channel = guild.channels.cache.get(cId) || (await guild.channels.fetch(cId).catch(() => null));
  if (!channel || !channel.isTextBased?.()) {
    return { success: false, error: "Channel not found." };
  }

  let message = null;
  try {
    message = await channel.messages.fetch(mId);
  } catch (err) {
    // If already deleted in Discord, mark as deleted or delete history record
    if (removeFromHistory) {
      await deleteHistoryEntry(gId, mId).catch(() => {});
    } else {
      await updateHistoryStatus(gId, mId, "deleted").catch(() => {});
    }
    return { success: true, alreadyDeleted: true };
  }

  const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
  const isOwnMessage = message.author?.id === client.user?.id;
  const hasManageMessages = channel.permissionsFor(botMember)?.has(PermissionFlagsBits.ManageMessages);

  if (!isOwnMessage && !hasManageMessages) {
    return {
      success: false,
      error: "Bot lacks permissions (Manage Messages) to delete this message in Discord.",
    };
  }

  try {
    await message.delete();
    if (removeFromHistory) {
      await deleteHistoryEntry(gId, mId).catch(() => {});
    } else {
      await updateHistoryStatus(gId, mId, "deleted").catch(() => {});
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: `Failed to delete message: ${err.message}`,
    };
  }
}
