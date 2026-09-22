import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { hideChannel, unhideChannel } from "../../services/channelLockService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("hide")
  .setDescription("Hide or unhide a channel — verification-aware (targets verified role if configured)")
  .addStringOption((opt) =>
    opt
      .setName("action")
      .setDescription("Hide or Unhide")
      .setRequired(true)
      .addChoices(
        { name: "Hide", value: "hide" },
        { name: "Unhide", value: "unhide" }
      )
  )
  .addChannelOption((opt) =>
    opt.setName("channel").setDescription("Target channel (defaults to current)").setRequired(false)
  );

export default createCommand({
  name: "hide",
  description: "Hide or unhide a channel — verification-aware",
  category: "Channels",
  aliases: ["unhide"],
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ManageChannels,
  slashBuilder,

  async execute(ctx) {
    const { guild, channel, user } = ctx;
    if (!guild) return;

    let action = ctx.options.action || "hide";
    const invokedName = ctx.message?.content?.trim().split(/\s+/)[0]?.toLowerCase().replace(/^[^\w]*/, "");
    if (
      ctx.command?.name === "unhide" ||
      invokedName === "unhide" ||
      ctx.options._args?.[0]?.toLowerCase() === "unhide"
    ) {
      action = "unhide";
    }

    const targetChannel =
      ctx.options.channel ? guild.channels.cache.get(ctx.options.channel) || channel : channel;

    if (action === "hide") {
      const res = await hideChannel({
        channel: targetChannel,
        guild,
        moderator: user,
      });

      const roleLabel = res.usingVerifiedRole
        ? `\`@${res.verifiedRoleName}\` (verified members)`
        : "`@everyone`";
      const scopeNote = res.usingVerifiedRole
        ? `-# 🔐 Verification mode active — targeting **@${res.verifiedRoleName}** instead of @everyone.`
        : `-# 🌐 No verification role configured — targeting **@everyone**.`;

      if (res.alreadyHidden) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Already Hidden",
              description:
                `${EMOJIS.get("warning") || "⚠️"} ${targetChannel} is already hidden from ${roleLabel}.\n\n` +
                `${scopeNote}\n-# Use \`/hide action:unhide\` to make it visible again.`,
              level: "WARNING",
              color: COLORS.DARK,
              headerDivider: false,
            }),
          ],
        });
      }

      return await ctx.reply({
        embeds: [
          makeEmbed({
            author: { name: "Channel Visibility", iconURL: guild.iconURL?.({ dynamic: true }) || undefined },
            title: "🙈 Channel Hidden",
            description:
              `${targetChannel} is now **hidden** from ${roleLabel}.\n\n` +
              `${scopeNote}\n-# Use \`/hide action:unhide\` or \`!unhide\` to restore original visibility.`,
            level: "WARNING",
            color: COLORS.DARK,
            headerDivider: false,
          }),
        ],
      });
    }

    if (action === "unhide") {
      const res = await unhideChannel({
        channel: targetChannel,
        guild,
        moderator: user,
      });

      const roleLabel = res.usingVerifiedRole
        ? `\`@${res.verifiedRoleName}\` (verified members)`
        : "`@everyone`";
      const scopeNote = res.usingVerifiedRole
        ? `-# 🔐 Verification mode active — targeting **@${res.verifiedRoleName}** instead of @everyone.`
        : `-# 🌐 No verification role configured — targeting **@everyone**.`;

      if (res.notHidden) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Channel Not Hidden",
              description:
                `${EMOJIS.get("info") || "ℹ️"} ${targetChannel} is not currently hidden from ${roleLabel}.\n\n` +
                `${scopeNote}\n-# No snapshot found. The channel already has normal visibility.`,
              level: "INFO",
              color: COLORS.DARK,
              headerDivider: false,
            }),
          ],
        });
      }

      return await ctx.reply({
        embeds: [
          makeEmbed({
            author: { name: "Channel Visibility", iconURL: guild.iconURL?.({ dynamic: true }) || undefined },
            title: "👁️ Channel Unhidden",
            description:
              `${targetChannel} is now **visible** again to ${roleLabel}.\n\n` +
              `${scopeNote}\n-# Original permission state has been fully restored.`,
            level: "SUCCESS",
            color: COLORS.DARK,
            headerDivider: false,
          }),
        ],
      });
    }
  },
});
