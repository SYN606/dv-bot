import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { CONFIG } from "../config.js";
import { CommandContext } from "../core/command.js";
import { GLOBAL_COOLDOWN } from "../core/cooldown.js";
import { makeEmbed, COLORS } from "../core/embeds.js";
import { EMOJIS } from "../core/emojis.js";
import {
  hasConfigAccess,
  hasModerationAccess,
  isBotAdmin,
} from "../core/permissions.js";
import { isExecutionAllowed } from "../db/helpers/acl.js";
import { isCommandRestricted } from "../db/helpers/channelCommandRestrict.js";
import { isCommandGloballyDisabled } from "../db/helpers/guildCommandDisable.js";
import { handleAfk } from "../handlers/afkHandler.js";
import { ANALYTICS_BATCHER } from "../handlers/analyticsBatcher.js";
import { handleAutoresponder } from "../handlers/autoresponderHandler.js";
import { handleMediaOnly } from "../handlers/mediaOnlyHandler.js";
import { handleSticky } from "../handlers/stickyHandler.js";
import { checkMemberSupporter } from "../handlers/supporterHandler.js";

export default {
  name: "messageCreate",
  async execute(client, message) {
    if (!message.guild) return;

    // Supporter Rewards Auto-Check (Passive realtime evaluation)
    if (message.member && !message.author.bot) {
      checkMemberSupporter(message.member).catch(() => {});
    }

    // 1. Analytics Tracking (with channel/role ACL exclusion check)
    if (!message.author.bot) {
      isExecutionAllowed(message.guild.id, message.member, message.channel.id, "analytics")
        .then((allowed) => {
          if (allowed) {
            ANALYTICS_BATCHER.addMessage(message.guild.id, message.author.id, message.channel.id).catch(() => {});
          }
        })
        .catch(() => {
          ANALYTICS_BATCHER.addMessage(message.guild.id, message.author.id, message.channel.id).catch(() => {});
        });
    }

    // 2. Media-Only Channel Enforcement
    const wasMediaDeleted = await handleMediaOnly(message);
    if (wasMediaDeleted) return;

    const prefix = (CONFIG.PREFIX || "ts").toLowerCase();
    const rawContent = (message.content || "").trim();
    const botMentionAfkRegex = new RegExp(`^<@!?${client.user?.id}>(?:\\s+)?afk(?:\\s+|$)`, "i");
    const isAfkCommand =
      rawContent.toLowerCase().startsWith(`${prefix}afk`) ||
      rawContent.toLowerCase().startsWith("dvafk") ||
      rawContent.toLowerCase().startsWith("dv afk") ||
      rawContent.toLowerCase() === `${prefix} afk` ||
      rawContent.toLowerCase().startsWith(`${prefix} afk `) ||
      botMentionAfkRegex.test(rawContent);

    // 3. AFK Notifications & Return
    await handleAfk(message, { skipAuthorReturn: isAfkCommand });

    // 4. Autoresponder Matching
    await handleAutoresponder(message);

    // 5. Sticky Message Repin
    await handleSticky(message).catch((err) => console.error("[STICKY ERROR]:", err));

    // 6. Mention & Prefix Command Execution
    if (message.author.bot) return;

    // A. Check for direct Bot Mention (@Bot)
    const mentionRegex = new RegExp(`^<@!?${client.user.id}>(?:\\s+)?`);
    let commandString = null;

    if (mentionRegex.test(rawContent)) {
      const afterMention = rawContent.replace(mentionRegex, "").trim();
      if (!afterMention) {
        // Pure mention -> send quickstart mention reply
        return await sendMentionReply(client, message, prefix);
      }
      commandString = afterMention;
    } else if (rawContent.toLowerCase().startsWith(prefix)) {
      commandString = rawContent.slice(prefix.length).trim();



    }

    if (commandString === null) return;

    const rawArgs = commandString.split(/\s+/);
    const commandName = rawArgs.shift()?.toLowerCase();
    if (!commandName) return;

    const resolvedName = client.aliases.get(commandName) || commandName;
    const command = client.commands.get(resolvedName);
    if (!command || command.slashOnly) return;

    // A. ACL Policy & Channel Restriction Check (Admins bypass)
    const categoryName = command.category ? command.category.toLowerCase() : null;
    const aclCheck = await isExecutionAllowed(
      message.guild.id,
      message.channel.id,
      message.member,
      resolvedName,
      categoryName
    );
    if (!aclCheck.allowed) {
      const reply = await message.reply({
        embeds: [
          makeEmbed({
            title: "Access Restricted",
            description: `${EMOJIS.get("warning") || "âš ï¸"} ${aclCheck.reason}`,
            level: "WARNING",
          }),
        ],
      }).catch(() => {});
      if (reply) setTimeout(() => reply.delete().catch(() => {}), 6000);
      return;
    }

    // B1. Guild-wide command disable check (dashboard toggle & category toggle)
    const globallyDisabled =
      (await isCommandGloballyDisabled(message.guild.id, resolvedName)) ||
      (categoryName ? await isCommandGloballyDisabled(message.guild.id, `category:${categoryName}`) : false);
    if (globallyDisabled && !(await isBotAdmin(message))) {
      const reply = await message.reply({
        embeds: [
          makeEmbed({
            title: "Command Disabled",
            description: `${EMOJIS.get("fail") || "âŒ"} This command has been **disabled** in this server by an administrator.`,
            level: "ERROR",
          }),
        ],
      }).catch(() => {});
      if (reply) setTimeout(() => reply.delete().catch(() => {}), 6000);
      return;
    }

    // B2. Channel-specific restriction check
    const restricted =
      (await isCommandRestricted(message.guild.id, message.channel.id, resolvedName)) ||
      (categoryName ? await isCommandRestricted(message.guild.id, message.channel.id, `category:${categoryName}`) : false);
    if (restricted && !(await isBotAdmin(message))) {
      const reply = await message.reply({
        embeds: [
          makeEmbed({
            title: "Command Restricted",
            description: `${EMOJIS.get("fail") || "âŒ"} This command cannot be used in this channel.\n\n${EMOJIS.get("arrow_point") || "ðŸ‘‰"} Please try using it in another channel.`,
            level: "ERROR",
          }),
        ],
      }).catch(() => {});
      if (reply) setTimeout(() => reply.delete().catch(() => {}), 6000);
      return;
    }

    // C. Permission Checks
    if (command.adminOnly && !(await isBotAdmin(message))) {
      const reply = await message.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `${EMOJIS.get("fail") || "âŒ"} You require **Administrator** or **Bot Admin** authority to use this command.`,
            level: "ERROR",
          }),
        ],
      }).catch(() => {});
      if (reply) setTimeout(() => reply.delete().catch(() => {}), 6000);
      return;
    }

    if (command.configOnly && !(await hasConfigAccess(message))) {
      const reply = await message.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `${EMOJIS.get("fail") || "âŒ"} You require **Manage Server** or **Config** authority to use this command.`,
            level: "ERROR",
          }),
        ],
      }).catch(() => {});
      if (reply) setTimeout(() => reply.delete().catch(() => {}), 6000);
      return;
    }

    if (command.modOnly && !(await hasModerationAccess(message, command.requiredPermission))) {
      const reply = await message.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `${EMOJIS.get("fail") || "âŒ"} You lack the required moderation permissions to run this command.`,
            level: "ERROR",
          }),
        ],
      }).catch(() => {});
      if (reply) setTimeout(() => reply.delete().catch(() => {}), 6000);
      return;
    }

    // C. Global Cooldown Check
    if (!(await GLOBAL_COOLDOWN.checkMessage(message))) {
      const retry = GLOBAL_COOLDOWN.retryAfter(message.author.id, message.guild.id);
      const reply = await message.reply({
        embeds: [
          makeEmbed({
            title: "Rate Limited",
            description: `${EMOJIS.get("warning") || "âš ï¸"} You are on cooldown. Please wait **${retry.toFixed(1)}s**.`,
            level: "WARNING",
          }),
        ],
      }).catch(() => {});
      if (reply) setTimeout(() => reply.delete().catch(() => {}), 5000);
      return;
    }

    // D. Options mapping from arguments
    const options: Record<string, any> = { _args: rawArgs };
    if (rawArgs.length > 0) {
      options.primary = rawArgs[0];
      options.rest = rawArgs.slice(1).join(" ");
      options.raw = rawArgs.join(" ");
    }

    const ctx = new CommandContext({
      client,
      message,
      command,
      options,
      subcommand: rawArgs[0] || null,
    });

    try {
      await command.execute(ctx);
    } catch (err) {
      console.error(`[EXECUTION ERROR] In prefix '!${resolvedName}':`, err);
      const reply = await message.reply({
        embeds: [
          makeEmbed({
            title: "Command Error",
            description: `${EMOJIS.get("fail") || "âŒ"} An unexpected error occurred while processing this command.`,
            level: "ERROR",
          }),
        ],
      }).catch(() => {});
      if (reply) setTimeout(() => reply.delete().catch(() => {}), 6000);
    }
  },
};

/**
 * Sends an interactive quickstart card when the bot is mentioned
 */
async function sendMentionReply(client, message, prefix) {
  const botName = CONFIG.BOT_NAME || client.user?.username || "Digital Vigital";
  const avatar = client.user?.displayAvatarURL({ dynamic: true, size: 256 }) || null;
  const wsPing = Math.round(client.ws?.ping || 0);

  const embed = makeEmbed({
    author: {
      name: `${botName} â€¢ Moderation & Server Security`,
      iconURL: avatar,
    },
    title: `Hey, ${message.author.username}! ðŸ‘‹`,
    description:
      `I'm **${botName}**, your server's moderation, verification, and security assistant.\n\n` +
      `â€¢ **Default Prefix:** \`${prefix}\`\n` +
      `â€¢ **Commands Directory:** Type **\`${prefix}help\`** or **\`/help\`**\n` +
      `â€¢ **Away-From-Keyboard:** Type **\`${prefix}afk [reason]\`**\n` +
      `â€¢ **Web Configuration:** Manage modlogs & roles on the **[Web Dashboard](${CONFIG.DASHBOARD_URL})**`,
    level: "PRIMARY",
    color: COLORS.DARK,
    thumbnail: avatar,
    fields: [
      { name: "ðŸ›¡ï¸ Protection", value: "`Active`", inline: true },
      { name: "ðŸ“¡ Latency", value: `\`${wsPing}ms\``, inline: true },
      { name: "âš¡ Prefix", value: `\`${prefix}\``, inline: true },
    ],
    footer: {
      text: `${botName} â€¢ Moderation, Verification & Analytics`,
      iconURL: avatar,
    },
  });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("Dashboard")
      .setStyle(ButtonStyle.Link)
      .setURL(CONFIG.DASHBOARD_URL),
    new ButtonBuilder()
      .setCustomId("btn_private_bot_invite")
      .setLabel("Invite Bot")
      .setStyle(ButtonStyle.Secondary)
  );

  return await message.reply({ embeds: [embed], components: [row] }).catch(() => {});
}
