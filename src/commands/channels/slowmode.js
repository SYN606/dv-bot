import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { sendModLog } from "../../utils/modLog.js";

const MAX_SLOWMODE = 21600; // 6 hours in seconds (Discord maximum)

function formatSeconds(secs) {
  if (secs <= 0) return "Disabled";
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;
  const parts = [];
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  if (seconds > 0) parts.push(`${seconds} second${seconds === 1 ? "" : "s"}`);
  return parts.join(" ");
}

const slashBuilder = new SlashCommandBuilder()
  .setName("slowmode")
  .setDescription("Set the slowmode rate limit for a channel or thread")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .setDMPermission(false)
  .addIntegerOption((opt) =>
    opt
      .setName("seconds")
      .setDescription("Slowmode interval in seconds (0 to disable, max 21600 = 6h)")
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(MAX_SLOWMODE)
  )
  .addChannelOption((opt) =>
    opt
      .setName("channel")
      .setDescription("Target channel to set slowmode for (defaults to current)")
      .setRequired(false)
  )
  .addStringOption((opt) =>
    opt
      .setName("reason")
      .setDescription("Reason for updating slowmode")
      .setRequired(false)
  );

export default createCommand({
  name: "slowmode",
  description: "Set the slowmode rate limit for a channel or thread.",
  category: "Channels",
  usage: "<seconds> [channel] [reason]",
  examples: [
    "/slowmode seconds:5",
    "/slowmode seconds:0 (disable)",
    "/slowmode seconds:60 channel:#general reason:Chat moving too fast",
  ],
  slashOnly: true,
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ManageChannels,
  slashBuilder,

  async execute(ctx) {
    if (!ctx.isInteraction) return;

    const { guild, channel, user } = ctx;
    if (!guild) return;

    let targetChannel = ctx.interaction?.options?.getChannel?.("channel");
    if (!targetChannel && ctx.options?.channel) {
      const channelId =
        typeof ctx.options.channel === "string" ? ctx.options.channel : ctx.options.channel.id;
      targetChannel =
        guild.channels.cache.get(channelId) ||
        (await guild.channels.fetch(channelId).catch(() => null));

      if (!targetChannel) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Channel Not Found",
              description: "The specified channel could not be found in this server.",
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }
    }
    if (!targetChannel) targetChannel = channel;

    if (!targetChannel || typeof targetChannel.setRateLimitPerUser !== "function") {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Unsupported Channel",
            description: "Slowmode cannot be configured on this channel type.",
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // Verify bot permissions
    const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
    const botPerms = targetChannel.permissionsFor?.(botMember);
    const requiredBit = targetChannel.isThread?.()
      ? PermissionFlagsBits.ManageThreads
      : PermissionFlagsBits.ManageChannels;
    const requiredName = targetChannel.isThread?.() ? "Manage Threads" : "Manage Channels";

    if (!botPerms?.has(requiredBit)) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Missing Permissions",
            description: `I need the **${requiredName}** permission in ${targetChannel} to adjust slowmode.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const rawSeconds = ctx.interaction?.options?.getInteger?.("seconds") ?? ctx.options?.seconds;
    const seconds = Math.max(0, Math.min(MAX_SLOWMODE, parseInt(rawSeconds, 10) || 0));
    const reason = ctx.interaction?.options?.getString?.("reason") || ctx.options?.reason;

    const auditReason = `Slowmode set to ${seconds}s by ${user.tag || user.username} (${user.id})${reason ? `: ${reason}` : ""}`;

    try {
      await targetChannel.setRateLimitPerUser(seconds, auditReason);
    } catch (err) {
      console.error("[SLOWMODE ERROR]:", err);
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Slowmode Failed",
            description: `Failed to update slowmode: ${err?.message || "Discord API error"}.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // Mod log
    try {
      await sendModLog({
        guild,
        category: "CHANNELS",
        title: "Slowmode Updated",
        description:
          seconds > 0
            ? `Slowmode for ${targetChannel} set to **${formatSeconds(seconds)}** (\`${seconds}s\`) by ${user}.`
            : `Slowmode for ${targetChannel} **disabled** by ${user}.`,
        level: seconds > 0 ? "WARNING" : "SUCCESS",
        actor: user,
        extraFields: {
          Channel: `${targetChannel.name} (\`${targetChannel.id}\`)`,
          Interval: seconds > 0 ? `${formatSeconds(seconds)} (${seconds}s)` : "Disabled (0s)",
          Reason: reason || "None",
        },
      });
    } catch (e) {
      // Mod log failure is non-fatal
    }

    const isEnabled = seconds > 0;
    const humanDuration = formatSeconds(seconds);
    const authorIcon = guild.iconURL?.() || undefined;

    const embed = makeEmbed({
      author: { name: "Channel Slowmode", iconURL: authorIcon },
      title: isEnabled ? "⏱️ Slowmode Enabled" : "✅ Slowmode Disabled",
      description: isEnabled
        ? `${EMOJIS.get("success") || "⏱️"} Slowmode set to **${humanDuration}** (\`${seconds}s\`) for ${targetChannel}.`
        : `${EMOJIS.get("success") || "✅"} Slowmode has been **disabled** for ${targetChannel}.`,
      level: isEnabled ? "WARNING" : "SUCCESS",
      color: COLORS.DARK,
      headerDivider: false,
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
