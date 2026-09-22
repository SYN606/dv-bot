import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { ChannelPermissionSnapshot } from "../../db/models/index.js";
import { sendModLog } from "../../utils/modLog.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("hide")
  .setDescription("Hide or unhide a channel from regular members")
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
  .addChannelOption((opt) => opt.setName("channel").setDescription("Target channel").setRequired(false));

export default createCommand({
  name: "hide",
  description: "Hide or unhide a channel from regular members",
  category: "Channels",
  aliases: ["unhide"],
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ManageChannels,
  slashBuilder,

  async execute(ctx) {
    const { guild, channel, user } = ctx;
    if (!guild) return;

    let action = ctx.options.action || "hide";
    if (ctx.command.name === "unhide" || ctx.options._args?.[0]?.toLowerCase() === "unhide") {
      action = "unhide";
    }

    const targetChannel = ctx.options.channel ? guild.channels.cache.get(ctx.options.channel) || channel : channel;
    const everyoneRole = guild.roles.everyone;

    if (action === "hide") {
      const existingSnapshot = await ChannelPermissionSnapshot.findOne({
        where: {
          guild_id: guild.id,
          channel_id: targetChannel.id,
          target_id: everyoneRole.id,
          permission_name: "ViewChannel",
        },
      });

      if (existingSnapshot) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Already Hidden",
              description: `${EMOJIS.get("warning") || "⚠️"} ${targetChannel} is already hidden.`,
              level: "WARNING",
            }),
          ],
        });
      }

      // Snapshot existing ViewChannel permission
      const currentOverwrite = targetChannel.permissionOverwrites.cache.get(everyoneRole.id);
      const prevValue = currentOverwrite ? currentOverwrite.allow.has(PermissionFlagsBits.ViewChannel) ? true : currentOverwrite.deny.has(PermissionFlagsBits.ViewChannel) ? false : null : null;

      await ChannelPermissionSnapshot.create({
        guild_id: guild.id,
        channel_id: targetChannel.id,
        target_id: everyoneRole.id,
        permission_name: "ViewChannel",
        permission_value: prevValue,
      });

      // Apply hide
      await targetChannel.permissionOverwrites.edit(everyoneRole, {
        ViewChannel: false,
      });

      await sendModLog({
        guild,
        category: "MODERATION",
        title: "Channel Hidden",
        description: `Channel ${targetChannel} was hidden from public view by <@${user.id}>.`,
        level: "WARNING",
        actor: user,
      });

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Channel Hidden",
            description: `${EMOJIS.get("success") || "👁️"} ${targetChannel} is now **hidden** from regular members.`,
            level: "SUCCESS",
          }),
        ],
      });
    }

    if (action === "unhide") {
      const snapshot = await ChannelPermissionSnapshot.findOne({
        where: {
          guild_id: guild.id,
          channel_id: targetChannel.id,
          target_id: everyoneRole.id,
          permission_name: "ViewChannel",
        },
      });

      const restoreVal = snapshot ? snapshot.permission_value : null;

      await targetChannel.permissionOverwrites.edit(everyoneRole, {
        ViewChannel: restoreVal,
      });

      if (snapshot) {
        await snapshot.destroy();
      }

      await sendModLog({
        guild,
        category: "MODERATION",
        title: "Channel Unhidden",
        description: `Channel ${targetChannel} was made visible by <@${user.id}>.`,
        level: "INFO",
        actor: user,
      });

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Channel Unhidden",
            description: `${EMOJIS.get("success") || "👁️"} ${targetChannel} is now **visible** again.`,
            level: "SUCCESS",
          }),
        ],
      });
    }
  },
});
