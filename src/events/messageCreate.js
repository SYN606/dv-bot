import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
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

export default {
  name: "messageCreate",
  async execute(client, message) {
    if (!message.guild) return;

    // 1. Analytics Tracking
    if (!message.author.bot) {
      ANALYTICS_BATCHER.addMessage(message.guild.id, message.author.id, message.channel.id).catch(() => {});
    }

    // 2. Media-Only Channel Enforcement
    const wasMediaDeleted = await handleMediaOnly(message);
    if (wasMediaDeleted) return;

    // 3. AFK Notifications & Return
    await handleAfk(message);

    // 4. Autoresponder Matching
    await handleAutoresponder(message);

    // 5. Sticky Message Repin
    await handleSticky(message).catch((err) => console.error("[STICKY ERROR]:", err));

    // 6. Mention & Prefix Command Execution
    if (message.author.bot) return;

    const prefix = (CONFIG.PREFIX || "ts").toLowerCase();
    const rawContent = message.content.trim();

    // A. Check for direct Bot Mention (@Bot / @Ofira)
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
    } else if (rawContent.startsWith("!")) {
      // Graceful fallback for traditional '!'
      commandString = rawContent.slice(1).trim();
    }

    if (commandString === null) return;

    const rawArgs = commandString.split(/\s+/);
    const commandName = rawArgs.shift()?.toLowerCase();
    if (!commandName) return;

    const resolvedName = client.aliases.get(commandName) || commandName;
    const command = client.commands.get(resolvedName);
    if (!command || command.slashOnly) return;

    // A. Global Cooldown Check
    if (!(await GLOBAL_COOLDOWN.checkMessage(message))) {
      const retry = GLOBAL_COOLDOWN.retryAfter(message.author.id, message.guild.id);
      const reply = await message.reply({
        embeds: [
          makeEmbed({
            title: "Rate Limited",
            description: `${EMOJIS.get("warning") || "⚠️"} You are on cooldown. Please wait **${retry.toFixed(1)}s**.`,
            level: "WARNING",
          }),
        ],
      }).catch(() => {});
      if (reply) setTimeout(() => reply.delete().catch(() => {}), 5000);
      return;
    }

    // B. ACL Policy & Channel Restriction Check (Admins bypass)
    const aclCheck = await isExecutionAllowed(
      message.guild.id,
      message.channel.id,
      message.member,
      resolvedName
    );
    if (!aclCheck.allowed) {
      const reply = await message.reply({
        embeds: [
          makeEmbed({
            title: "Access Restricted",
            description: `${EMOJIS.get("warning") || "⚠️"} ${aclCheck.reason}`,
            level: "WARNING",
          }),
        ],
      }).catch(() => {});
      if (reply) setTimeout(() => reply.delete().catch(() => {}), 6000);
      return;
    }

    const isAdmin = message.member?.permissions?.has(PermissionFlagsBits.Administrator);
    if (!isAdmin) {
      // B1. Guild-wide command disable check (dashboard toggle)
      const globallyDisabled = await isCommandGloballyDisabled(message.guild.id, resolvedName);
      if (globallyDisabled) {
        const reply = await message.reply({
          embeds: [
            makeEmbed({
              title: "Command Disabled",
              description: `${EMOJIS.get("fail") || "❌"} This command has been **disabled** in this server by an administrator.`,
              level: "ERROR",
            }),
          ],
        }).catch(() => {});
        if (reply) setTimeout(() => reply.delete().catch(() => {}), 6000);
        return;
      }

      // B2. Channel-specific restriction check
      const restricted = await isCommandRestricted(
        message.guild.id,
        message.channel.id,
        resolvedName
      );
      if (restricted) {
        const reply = await message.reply({
          embeds: [
            makeEmbed({
              title: "Command Restricted",
              description: `${EMOJIS.get("fail") || "❌"} This command cannot be used in this channel.\n\n${EMOJIS.get("arrow_point") || "👉"} Please try using it in another channel.`,
              level: "ERROR",
            }),
          ],
        }).catch(() => {});
        if (reply) setTimeout(() => reply.delete().catch(() => {}), 6000);
        return;
      }
    }

    // C. Permission Checks
    if (command.adminOnly && !(await isBotAdmin(message))) {
      const reply = await message.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `${EMOJIS.get("fail") || "❌"} You require **Administrator** or **Bot Admin** authority to use this command.`,
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
            description: `${EMOJIS.get("fail") || "❌"} You require **Manage Server** or **Config** authority to use this command.`,
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
            description: `${EMOJIS.get("fail") || "❌"} You lack the required moderation permissions to run this command.`,
            level: "ERROR",
          }),
        ],
      }).catch(() => {});
      if (reply) setTimeout(() => reply.delete().catch(() => {}), 6000);
      return;
    }

    // D. Options mapping from arguments
    const options = { _args: rawArgs };
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
            description: `${EMOJIS.get("fail") || "❌"} An unexpected error occurred while processing this command.`,
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
  const botName = CONFIG.BOT_NAME || client.user?.username || "Digital Vigil";
  const avatar = client.user?.displayAvatarURL({ dynamic: true, size: 256 }) || null;
  const wsPing = Math.round(client.ws?.ping || 0);

  const embed = makeEmbed({
    author: {
      name: `${botName} • Moderation & Server Security`,
      iconURL: avatar,
    },
    title: `Hey, ${message.author.username}! 👋`,
    description:
      `I'm **${botName}**, your server's moderation, verification, and security assistant.\n\n` +
      `• **Default Prefix:** \`${prefix}\`\n` +
      `• **Commands Directory:** Type **\`${prefix}help\`** or **\`/help\`**\n` +
      `• **Away-From-Keyboard:** Type **\`${prefix}afk [reason]\`**\n` +
      `• **Web Configuration:** Manage modlogs & roles on the **[Web Dashboard](${CONFIG.DASHBOARD_URL})**`,
    level: "PRIMARY",
    color: COLORS.DARK,
    thumbnail: avatar,
    fields: [
      { name: "🛡️ Protection", value: "`Active`", inline: true },
      { name: "📡 Latency", value: `\`${wsPing}ms\``, inline: true },
      { name: "⚡ Prefix", value: `\`${prefix}\``, inline: true },
    ],
    footer: {
      text: `${botName} • Moderation, Verification & Analytics`,
      iconURL: avatar,
    },
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Dashboard")
      .setStyle(ButtonStyle.Link)
      .setURL(CONFIG.DASHBOARD_URL),
    new ButtonBuilder()
      .setLabel("Invite Bot")
      .setStyle(ButtonStyle.Link)
      .setURL(
        `https://discord.com/oauth2/authorize?client_id=${client.user?.id}&permissions=8&scope=bot%20applications.commands`
      )
  );

  return await message.reply({ embeds: [embed], components: [row] }).catch(() => {});
}
