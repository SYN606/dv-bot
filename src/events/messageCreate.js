import { PermissionFlagsBits } from "discord.js";
import { CONFIG } from "../config.js";
import { CommandContext } from "../core/command.js";
import { GLOBAL_COOLDOWN } from "../core/cooldown.js";
import { makeEmbed } from "../core/embeds.js";
import { EMOJIS } from "../core/emojis.js";
import {
  hasConfigAccess,
  hasModerationAccess,
  isBotAdmin,
} from "../core/permissions.js";
import { isExecutionAllowed } from "../db/helpers/acl.js";
import { isCommandRestricted } from "../db/helpers/channelCommandRestrict.js";
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
      ANALYTICS_BATCHER.addMessage(message.guild.id, message.author.id).catch(() => {});
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

    // 6. Prefix Command Execution
    if (message.author.bot) return;

    const prefix = CONFIG.PREFIX;
    if (!message.content.startsWith(prefix)) return;

    const rawArgs = message.content.slice(prefix.length).trim().split(/\s+/);
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
