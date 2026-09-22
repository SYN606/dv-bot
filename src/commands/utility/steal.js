import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";

const EMOJI_REGEX = /<(a?):([a-zA-Z0-9_]{2,32}):(\d+)>/g;
const CDN_EMOJI_REGEX = /https?:\/\/cdn\.discordapp\.com\/emojis\/(\d+)\.(png|gif|webp|jpg)/i;
const MAX_ITEMS = 5;

function getEmojiLimit(tier) {
  switch (tier) {
    case 3: return 250;
    case 2: return 150;
    case 1: return 100;
    default: return 50;
  }
}

function getStickerLimit(tier) {
  switch (tier) {
    case 3: return 60;
    case 2: return 30;
    case 1: return 15;
    default: return 5;
  }
}

function sanitizeEmojiName(name) {
  const clean = name.replace(/[^a-zA-Z0-9_]/g, "");
  return (clean.length >= 2 ? clean : `stolen_${clean}`).slice(0, 32);
}

const slashBuilder = new SlashCommandBuilder()
  .setName("steal")
  .setDescription("Steal custom emojis and stickers from messages or URLs")
  .addStringOption((opt) => opt.setName("source").setDescription("Custom emoji, Discord CDN link, or message ID").setRequired(true))
  .addStringOption((opt) => opt.setName("name").setDescription("Custom name for the stolen emoji").setRequired(false));

export default createCommand({
  name: "steal",
  description: "Steal custom emojis and stickers from messages or URLs",
  category: "Utility",
  requiredPermission: PermissionFlagsBits.ManageGuildExpressions || PermissionFlagsBits.ManageEmojisAndStickers,
  modOnly: true,
  slashBuilder,

  async execute(ctx) {
    const { guild, user } = ctx;
    if (!guild) return;

    const botMember = guild.members.me;
    const canManageExpressions = botMember?.permissions?.has(
      PermissionFlagsBits.ManageGuildExpressions || PermissionFlagsBits.ManageEmojisAndStickers
    );

    if (!canManageExpressions) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Missing Permissions",
            description: `${EMOJIS.get("fail") || "❌"} I need the **Manage Emojis and Stickers** permission to add custom assets.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    let source = ctx.options.source || ctx.options._args?.join(" ");
    let customName = ctx.options.name;

    const emojisToSteal = [];
    const stickersToSteal = [];

    // 1. Check for replied message
    if (ctx.message?.reference?.messageId) {
      const refMsg = await ctx.channel.messages.fetch(ctx.message.reference.messageId).catch(() => null);
      if (refMsg) {
        if (refMsg.stickers?.size > 0) {
          for (const sticker of refMsg.stickers.values()) {
            stickersToSteal.push(sticker);
          }
        }
        if (refMsg.content) {
          let match;
          while ((match = EMOJI_REGEX.exec(refMsg.content)) !== null) {
            emojisToSteal.push({
              animated: match[1] === "a",
              name: match[2],
              id: match[3],
              url: `https://cdn.discordapp.com/emojis/${match[3]}.${match[1] === "a" ? "gif" : "png"}`,
            });
          }
        }
      }
    }

    // 2. Parse direct inputs from source string
    if (source) {
      let match;
      while ((match = EMOJI_REGEX.exec(source)) !== null) {
        emojisToSteal.push({
          animated: match[1] === "a",
          name: customName || match[2],
          id: match[3],
          url: `https://cdn.discordapp.com/emojis/${match[3]}.${match[1] === "a" ? "gif" : "png"}`,
        });
      }

      const cdnMatch = source.match(CDN_EMOJI_REGEX);
      if (cdnMatch) {
        const id = cdnMatch[1];
        const ext = cdnMatch[2].toLowerCase();
        emojisToSteal.push({
          animated: ext === "gif",
          name: customName || `stolen_${id.slice(-6)}`,
          id,
          url: `https://cdn.discordapp.com/emojis/${id}.${ext === "gif" ? "gif" : "png"}`,
        });
      }
    }

    if (emojisToSteal.length === 0 && stickersToSteal.length === 0) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "No Assets Found",
            description: `${EMOJIS.get("warning") || "⚠️"} Provide custom emojis, CDN URLs, or reply to a message containing emojis/stickers.\n\nUsage:\n• \`/steal source: <emoji> [name: <name>]\`\n• \`!steal <:name:id>\`\n• Reply to a message with \`!steal\``,
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    await ctx.defer({ ephemeral: false }).catch(() => {});

    // Cache fetch
    await guild.emojis.fetch().catch(() => {});
    await guild.stickers.fetch().catch(() => {});

    const tier = guild.premiumTier || 0;
    const maxEmojiPerType = getEmojiLimit(tier);
    const maxStickers = getStickerLimit(tier);

    let currentStaticCount = guild.emojis.cache.filter((e) => !e.animated).size;
    let currentAnimatedCount = guild.emojis.cache.filter((e) => e.animated).size;
    let currentStickerCount = guild.stickers.cache.size;

    const addedItems = [];
    const failedItems = [];
    const seenNames = new Set();

    // Process Emojis (Capped at MAX_ITEMS)
    for (const item of emojisToSteal.slice(0, MAX_ITEMS)) {
      const sanitizedName = sanitizeEmojiName(item.name);
      if (seenNames.has(sanitizedName)) continue;
      seenNames.add(sanitizedName);

      if (item.animated && currentAnimatedCount >= maxEmojiPerType) {
        failedItems.push(`\`${sanitizedName}\` (Animated emoji slots full)`);
        continue;
      }
      if (!item.animated && currentStaticCount >= maxEmojiPerType) {
        failedItems.push(`\`${sanitizedName}\` (Static emoji slots full)`);
        continue;
      }

      if (guild.emojis.cache.some((e) => e.name === sanitizedName)) {
        failedItems.push(`\`${sanitizedName}\` (Name already exists)`);
        continue;
      }

      try {
        const resp = await fetch(item.url, { signal: AbortSignal.timeout(10000) });
        if (!resp.ok) {
          failedItems.push(`\`${sanitizedName}\` (HTTP ${resp.status})`);
          continue;
        }

        const arrayBuffer = await resp.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const newEmoji = await guild.emojis.create({
          attachment: buffer,
          name: sanitizedName,
          reason: `Stolen by ${user.tag || user.username} (${user.id})`,
        });

        if (item.animated) currentAnimatedCount++;
        else currentStaticCount++;

        addedItems.push(String(newEmoji));
      } catch (err) {
        failedItems.push(`\`${sanitizedName}\` (${err?.message?.slice(0, 30) || "Error"})`);
      }
    }

    // Process Stickers (Capped at MAX_ITEMS)
    for (const sticker of stickersToSteal.slice(0, MAX_ITEMS)) {
      if (addedItems.length >= MAX_ITEMS) break;

      const sanitizedName = sanitizeEmojiName(sticker.name);
      if (currentStickerCount >= maxStickers) {
        failedItems.push(`Sticker \`${sanitizedName}\` (Sticker capacity full)`);
        continue;
      }

      try {
        const stickerUrl = sticker.url;
        const resp = await fetch(stickerUrl, { signal: AbortSignal.timeout(10000) });
        if (!resp.ok) {
          failedItems.push(`Sticker \`${sanitizedName}\` (HTTP ${resp.status})`);
          continue;
        }

        const arrayBuffer = await resp.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const newSticker = await guild.stickers.create({
          file: buffer,
          name: sanitizedName,
          tags: "⚡",
          reason: `Stolen by ${user.tag || user.username} (${user.id})`,
        });

        currentStickerCount++;
        addedItems.push(`Sticker: \`${newSticker.name}\``);
      } catch (err) {
        failedItems.push(`Sticker \`${sanitizedName}\` (${err?.message?.slice(0, 30) || "Error"})`);
      }
    }

    const fields = [];
    if (addedItems.length > 0) {
      fields.push({
        name: "Imported Assets",
        value: addedItems.join(" "),
        inline: false,
      });
    }

    if (failedItems.length > 0) {
      fields.push({
        name: "Failed / Skipped",
        value: failedItems.join("\n"),
        inline: false,
      });
    }

    const success = addedItems.length > 0;
    const summaryEmbed = makeEmbed({
      title: success ? `${EMOJIS.get("success") || "✅"} Transfer Complete` : `${EMOJIS.get("warning") || "⚠️"} Transfer Result`,
      description: `${EMOJIS.get("success") || "✅"} **Successfully Added:** \`${addedItems.length}\`\n${EMOJIS.get("fail") || "❌"} **Failed / Skipped:** \`${failedItems.length}\``,
      level: success ? "SUCCESS" : "WARNING",
      fields,
      footer: `Action by: ${user.tag || user.username}`,
      footerIcon: user.displayAvatarURL ? user.displayAvatarURL() : null,
    });

    return await ctx.reply({ embeds: [summaryEmbed] });
  },
});
