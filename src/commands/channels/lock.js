import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { sendModLog } from "../../utils/modLog.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("lock")
  .setDescription("Lock or unlock a channel for regular members")
  .addStringOption((opt) =>
    opt
      .setName("action")
      .setDescription("Lock or Unlock")
      .setRequired(true)
      .addChoices(
        { name: "Lock", value: "lock" },
        { name: "Unlock", value: "unlock" }
      )
  )
  .addChannelOption((opt) => opt.setName("channel").setDescription("Target channel").setRequired(false));

export default createCommand({
  name: "lock",
  description: "Lock or unlock a channel for regular members",
  category: "Channels",
  aliases: ["unlock"],
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ManageChannels,
  slashBuilder,

  async execute(ctx) {
    const { guild, channel, user } = ctx;
    if (!guild) return;

    let action = ctx.options.action || "lock";
    if (ctx.command.name === "unlock" || ctx.options._args?.[0]?.toLowerCase() === "unlock") {
      action = "unlock";
    }

    const targetChannel = ctx.options.channel ? guild.channels.cache.get(ctx.options.channel) || channel : channel;
    const everyoneRole = guild.roles.everyone;

    if (action === "lock") {
      await targetChannel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: false,
        AddReactions: false,
      });

      await sendModLog({
        guild,
        category: "MODERATION",
        title: "Channel Locked",
        description: `Channel ${targetChannel} was locked by <@${user.id}>.`,
        level: "WARNING",
        actor: user,
      });

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Channel Locked",
            description: `${EMOJIS.get("warning") || "🔒"} ${targetChannel} has been **locked**. Non-staff members cannot send messages.`,
            level: "WARNING",
          }),
        ],
      });
    }

    if (action === "unlock") {
      await targetChannel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: null,
        AddReactions: null,
      });

      await sendModLog({
        guild,
        category: "MODERATION",
        title: "Channel Unlocked",
        description: `Channel ${targetChannel} was unlocked by <@${user.id}>.`,
        level: "INFO",
        actor: user,
      });

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Channel Unlocked",
            description: `${EMOJIS.get("success") || "🔓"} ${targetChannel} has been **unlocked**. Normal messaging has been restored.`,
            level: "SUCCESS",
          }),
        ],
      });
    }
  },
});
