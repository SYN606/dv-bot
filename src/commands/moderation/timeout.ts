import { PermissionFlagsBits, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { ModerationService } from "../../services/index.js";
import { parseDuration, formatDuration } from "../../utils/duration.js";
import { isBotAdmin } from "../../core/permissions.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("timeout")
  .setDescription("Mute/timeout a member for a specified duration")
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .setDMPermission(false)
  .addUserOption((opt) => opt.setName("user").setDescription("The target member to timeout").setRequired(true))
  .addStringOption((opt) => opt.setName("duration").setDescription("Duration (e.g. 10m, 1h, 1d - max 28d)").setRequired(false))
  .addStringOption((opt) => opt.setName("reason").setDescription("Reason for timeout").setRequired(false));

export default createCommand({
  name: "timeout",
  description: "Mute/timeout a member for a specified duration",
  category: "Moderation",
  aliases: ["mute", "to"],
  usage: "<user> [duration] [reason]",
  examples: [
    "/timeout user:@User duration:10m reason:Spamming",
    "/timeout user:@User duration:1h reason:Heated argument",
    "dv timeout @User 30m Disrespect",
    "dvtimeout @User 30m Disrespect",
    "dv mute @User 10m Spamming chat",
    "dvmute @User 1h",
  ],
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ModerateMembers,
  slashBuilder,

  async execute(ctx) {
    const { guild, user } = ctx;
    if (!guild) return;

    const modPerms =
      ctx.member?.permissions instanceof PermissionsBitField
        ? ctx.member.permissions
        : new PermissionsBitField(BigInt(ctx.member?.permissions || 0));

    const canTimeout =
      guild.ownerId === user.id ||
      modPerms.has(PermissionFlagsBits.Administrator) ||
      modPerms.has(PermissionFlagsBits.ModerateMembers) ||
      (await isBotAdmin(ctx));

    if (!canTimeout) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `${EMOJIS.get("fail") || "❌"} You require the **Moderate Members** (Timeout) or **Administrator** permission to use this command.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const rawTarget = ctx.options.user || ctx.options._args?.[0];
    const targetUserId = rawTarget ? String(rawTarget).match(/\d{17,20}/)?.[0] : null;

    if (!targetUserId) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Invalid Target",
            description: `${EMOJIS.get("fail") || "❌"} Please specify a valid member mention or 17-20 digit user ID to timeout.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    if (targetUserId === user.id) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Timeout Failed",
            description: `${EMOJIS.get("fail") || "❌"} You cannot timeout yourself.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    if (targetUserId === ctx.client.user.id) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Timeout Failed",
            description: `${EMOJIS.get("fail") || "❌"} You cannot timeout me.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    if (targetUserId === guild.ownerId) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Timeout Failed",
            description: `${EMOJIS.get("fail") || "❌"} You cannot timeout the server owner.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // Check bot permissions
    const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
    if (!botMember?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Missing Bot Permissions",
            description: `${EMOJIS.get("fail") || "❌"} I lack the required **Timeout Members** (Moderate Members) permission in this server.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // Smart duration & reason parsing (parsed upfront before Discord REST calls)
    let durationSec = 600; // default 10m
    let reason = "No reason provided";

    if (ctx.isInteraction) {
      const parsed = parseDuration(ctx.options.duration);
      if (parsed !== null && parsed > 0) durationSec = parsed;
      if (ctx.options.reason) reason = ctx.options.reason;
    } else {
      const args = ctx.options._args || [];
      const secondArg = args[1];
      const parsedSecond = parseDuration(secondArg);
      if (parsedSecond !== null && parsedSecond > 0) {
        durationSec = parsedSecond;
        if (args.length > 2) reason = args.slice(2).join(" ");
      } else {
        // Second argument was not a duration, treat it as the start of the reason
        if (args.length > 1) reason = args.slice(1).join(" ");
      }
    }

    if (durationSec <= 0) durationSec = 60;
    if (durationSec > 2419200) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Invalid Duration",
            description: `${EMOJIS.get("warning") || "⚠️"} Timeout duration cannot exceed **28 days** (Discord API limit).`,
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    // Fast-path: check cache first to avoid unnecessary Discord REST API latency
    const targetMember = guild.members.cache.get(targetUserId) || (await guild.members.fetch(targetUserId).catch(() => null));
    if (!targetMember) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Member Not Found",
            description: `${EMOJIS.get("fail") || "❌"} Member <@${targetUserId}> was not found in this server.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // Hierarchy checks run before deferral for instant, truly ephemeral rejection
    if (!targetMember.moderatable) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Timeout Failed",
            description: `${EMOJIS.get("fail") || "❌"} I cannot timeout this member. Their role is equal to or higher than my highest role.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const modMember = ctx.member?.roles?.highest ? ctx.member : (guild.members.cache.get(user.id) || (await guild.members.fetch(user.id).catch(() => null)));
    const modHighest = modMember?.roles?.highest?.position ?? 0;

    if (guild.ownerId !== user.id && targetMember.roles.highest.position >= modHighest) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Timeout Failed",
            description: `${EMOJIS.get("fail") || "❌"} You cannot timeout a member with an equal or higher role than yourself.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const durationMs = durationSec * 1000;

    // Safety timeout: only defer if Discord API takes longer than 2s to respond, preventing interaction expiration
    const deferTimer = setTimeout(() => {
      ctx.defer({ ephemeral: false }).catch(() => {});
    }, 2000);

    try {
      await ModerationService.executeTimeout({
        guild,
        moderator: user,
        targetMember,
        durationMs,
        reason,
      });
    } catch (err: any) {
      clearTimeout(deferTimer);
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Timeout Failed",
            description: `${EMOJIS.get("fail") || "❌"} Failed to timeout <@${targetUserId}>: ${err?.message || "Discord API error"}.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    } finally {
      clearTimeout(deferTimer);
    }

    const readableDuration = formatDuration(durationSec);

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "Member Timed Out",
          description: `${EMOJIS.get("timeout") || "🔇"} Successfully timed out <@${targetUserId}> for **${readableDuration}**.\n\n• **Reason:** ${reason}`,
          level: "SUCCESS",
        }),
      ],
    });
  },
});
