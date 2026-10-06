import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { unlockChannel } from "../../services/channelLockService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("unlock")
  .setDescription("Unlock a previously locked channel or thread")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .setDMPermission(false)
  .addChannelOption((opt) =>
    opt
      .setName("channel")
      .setDescription("Target channel to unlock (defaults to current)")
      .setRequired(false)
  )
  .addStringOption((opt) =>
    opt
      .setName("reason")
      .setDescription("Reason for unlocking")
      .setRequired(false)
  );

export default createCommand({
  name: "unlock",
  description: "Unlock a previously locked channel or thread.",
  category: "Channels",
  usage: "[channel] [reason]",
  examples: [
    "/unlock",
    "/unlock channel:#general",
    "/unlock reason:Raid concluded",
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
      const channelId = typeof ctx.options.channel === "string" ? ctx.options.channel : ctx.options.channel.id;
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

    const reason = ctx.interaction?.options?.getString?.("reason") || ctx.options?.reason;

    const res = await unlockChannel({
      channel: targetChannel,
      guild,
      moderator: user,
      reason,
    });

    if (res.error) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Unlock Failed",
            description: `${EMOJIS.get("fail") || "❌"} ${res.error}`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    if (res.notLocked) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Channel Not Locked",
            description: `${EMOJIS.get("info") || "ℹ️"} ${targetChannel} is not currently locked.`,
            level: "INFO",
            color: COLORS.DARK,
            headerDivider: false,
          }),
        ],
        ephemeral: true,
      });
    }

    if (res.isThread) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            author: { name: "Thread Management", iconURL: guild.iconURL?.() || undefined },
            title: "🔓 Thread Unlocked",
            description: `${targetChannel} has been **unlocked** — members can chat in this thread again.`,
            level: "SUCCESS",
            color: COLORS.DARK,
            headerDivider: false,
          }),
        ],
      });
    }

    const roleLabel = res.usingVerifiedRole
      ? `\`@${res.verifiedRoleName}\` (verified members)`
      : "`@everyone`";
    const scopeNote = res.usingVerifiedRole
      ? `-# 🔐 Verification mode active — targeting **@${res.verifiedRoleName}** instead of @everyone.`
      : `-# 🌐 No verification role configured — targeting **@everyone**.`;

    return await ctx.reply({
      embeds: [
        makeEmbed({
          author: { name: "Channel Lockdown", iconURL: guild.iconURL?.() || undefined },
          title: "🔓 Channel Unlocked",
          description:
            `${targetChannel} has been **unlocked** — ${roleLabel} can send messages again.\n\n${scopeNote}`,
          level: "SUCCESS",
          color: COLORS.DARK,
          headerDivider: false,
        }),
      ],
    });
  },
});
